import { getDefinition } from "../src/engine/definitions/catalog";
import { generateDocument, regenerateSection } from "../src/engine/generate";
import { buildDocumentPrompt, buildSectionPrompt } from "../src/engine/ai/prompt";
import { validateGeneratedDocument } from "../src/engine/validation";
import type { GeneratedDocument, Section } from "../src/engine/types";
import {
  type AiProviderType,
  AI_PROVIDERS,
  executeAiCall,
  cleanAndParseJson,
} from "../src/engine/ai/providers";

export interface GenerationOptions {
  sectionId?: string;
  useAi?: boolean;
  provider?: AiProviderType;
  model?: string;
  apiKey?: string;
}

export function resolveProviderKey(
  provider: AiProviderType,
  userKey?: string,
): { apiKey?: string; envVar: string } {
  if (userKey && userKey.trim()) {
    return { apiKey: userKey.trim(), envVar: "CLIENT_PROVIDED" };
  }
  switch (provider) {
    case "openai":
      return {
        apiKey: process.env.OPENAI_API_KEY || process.env.DRAFTORYN_AI_API_KEY || process.env.AI_API_KEY,
        envVar: "OPENAI_API_KEY",
      };
    case "anthropic":
      return {
        apiKey: process.env.ANTHROPIC_API_KEY,
        envVar: "ANTHROPIC_API_KEY",
      };
    case "groq":
      return {
        apiKey: process.env.GROQ_API_KEY,
        envVar: "GROQ_API_KEY",
      };
    case "gemini":
      return {
        apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
        envVar: "GEMINI_API_KEY",
      };
  }
}

// Server-side generation entrypoint. Supports OpenAI, Anthropic, Groq, and Google Gemini.
export async function runGeneration(
  definitionId: string,
  source: Record<string, unknown>,
  opts: GenerationOptions = {},
): Promise<GeneratedDocument | Section> {
  const def = getDefinition(definitionId);
  if (!def) throw new Error(`Unknown document definition: ${definitionId}`);

  // Default: Manual structural baseline generation
  if (!opts.useAi) {
    if (opts.sectionId) {
      const section = regenerateSection(def, opts.sectionId, source);
      if (!section) throw new Error(`Unknown section: ${opts.sectionId}`);
      return section;
    }
    return generateDocument(def, source);
  }

  // Explicit AI requested: Require user context first
  const filledEntries = Object.entries(source).filter(
    ([_, v]) => v !== undefined && v !== null && String(v).trim() !== "" && (Array.isArray(v) ? v.length > 0 : true),
  );

  if (filledEntries.length === 0) {
    throw new Error(
      "AI synthesis requires context. Please enter organization, scope, or engagement details before generating with AI.",
    );
  }

  const provider: AiProviderType = opts.provider || (process.env.DRAFTORYN_AI_PROVIDER as AiProviderType) || "openai";
  const { apiKey, envVar } = resolveProviderKey(provider, opts.apiKey);
  if (!apiKey) {
    const providerName = AI_PROVIDERS[provider]?.name ?? provider;
    throw new Error(
      `AI service for "${providerName}" is not configured. Please enter your API key in Settings or set ${envVar} on the server.`,
    );
  }

  const model = opts.model?.trim() || AI_PROVIDERS[provider]?.defaultModel || "gpt-4o-mini";

  if (opts.sectionId) {
    const secDef = def.sections.find((s) => s.id === opts.sectionId);
    if (!secDef) throw new Error(`Unknown section: ${opts.sectionId}`);
    const baseDoc = generateDocument(def, source);
    const aiSection = await generateAiSection(def, secDef, baseDoc.model, source, provider, apiKey, model);
    if (aiSection) return aiSection;
    const fallback = regenerateSection(def, opts.sectionId, source);
    if (!fallback) throw new Error(`Unknown section: ${opts.sectionId}`);
    return fallback;
  }

  const aiDoc = await generateAiDocument(def, source, provider, apiKey, model);
  if (aiDoc) return aiDoc;

  // Fallback to structural baseline if AI synthesis could not complete
  return generateDocument(def, source);
}

async function generateAiDocument(
  def: NonNullable<ReturnType<typeof getDefinition>>,
  source: Record<string, unknown>,
  provider: AiProviderType,
  apiKey: string,
  model: string,
): Promise<GeneratedDocument | null> {
  const req = buildDocumentPrompt(def);
  const userPrompt = `${req.user}\n\nUser context:\n${JSON.stringify(source, null, 2)}`;

  const raw = await executeAiCall({
    provider,
    apiKey,
    model,
    systemPrompt: req.system,
    userPrompt,
    schema: req.schema,
    temperature: 0.15,
  });

  try {
    const parsed = cleanAndParseJson<{ sections?: Section[] }>(raw);
    if (Array.isArray(parsed.sections) && parsed.sections.length > 0) {
      const base = generateDocument(def, source);
      const combinedSections = base.sections.map((sec) => {
        const aiMatch = parsed.sections?.find((s) => s.id === sec.id);
        if (aiMatch && Array.isArray(aiMatch.blocks) && aiMatch.blocks.length > 0) {
          // Remove duplicate leading heading matching the section title
          const cleanBlocks = aiMatch.blocks.filter((b) => {
            if (b.type === "heading" && typeof b.text === "string") {
              const cleanText = b.text.trim().toLowerCase();
              const cleanTitle = sec.title.trim().toLowerCase();
              return cleanText !== cleanTitle && !cleanTitle.startsWith(cleanText);
            }
            return true;
          });
          return {
            ...sec,
            blocks: cleanBlocks.length > 0 ? cleanBlocks : sec.blocks,
            status: "generated" as const,
          };
        }
        return sec;
      });

      const validation = validateGeneratedDocument({
        ...base,
        sections: combinedSections,
      });

      if (validation.success && validation.doc) {
        return validation.doc;
      }
    }
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("AI inference failed")) throw err;
    throw new Error(`Could not parse structured AI output: ${err instanceof Error ? err.message : String(err)}`);
  }

  return null;
}

async function generateAiSection(
  def: NonNullable<ReturnType<typeof getDefinition>>,
  secDef: NonNullable<ReturnType<typeof getDefinition>>["sections"][number],
  modelData: GeneratedDocument["model"],
  source: Record<string, unknown>,
  provider: AiProviderType,
  apiKey: string,
  aiModel: string,
): Promise<Section | null> {
  const req = buildSectionPrompt(def, secDef, modelData);
  const userPrompt = `${req.user}\n\nSource input:\n${JSON.stringify(source, null, 2)}`;

  const raw = await executeAiCall({
    provider,
    apiKey,
    model: aiModel,
    systemPrompt: req.system,
    userPrompt,
    schema: req.schema,
    temperature: 0.15,
  });

  try {
    const parsed = cleanAndParseJson<{ sections?: Section[] }>(raw);
    const found = parsed.sections?.find((s) => s.id === secDef.id) || parsed.sections?.[0];
    if (found && Array.isArray(found.blocks) && found.blocks.length > 0) {
      const cleanBlocks = found.blocks.filter((b) => {
        if (b.type === "heading" && typeof b.text === "string") {
          const cleanText = b.text.trim().toLowerCase();
          const cleanTitle = secDef.title.trim().toLowerCase();
          return cleanText !== cleanTitle && !cleanTitle.startsWith(cleanText);
        }
        return true;
      });

      return {
        id: secDef.id,
        title: secDef.title,
        kind: secDef.kind,
        blocks: cleanBlocks.length > 0 ? cleanBlocks : found.blocks,
        status: "generated",
      };
    }
  } catch (err) {
    throw new Error(`Could not parse regenerated section output: ${err instanceof Error ? err.message : String(err)}`);
  }

  return null;
}


