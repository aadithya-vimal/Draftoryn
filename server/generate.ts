import { getDefinition } from "../src/engine/definitions/catalog";
import { generateDocument, regenerateSection } from "../src/engine/generate";
import { buildDocumentPrompt, buildSectionPrompt } from "../src/engine/ai/prompt";
import { validateGeneratedDocument } from "../src/engine/validation";
import type { GeneratedDocument, Section } from "../src/engine/types";

function getAiConfig() {
  const apiKey = process.env.DRAFTORYN_AI_API_KEY || process.env.GROQ_API_KEY;
  const baseUrl = process.env.DRAFTORYN_AI_BASE_URL || process.env.GROQ_BASE_URL || (process.env.GROQ_API_KEY ? "https://api.groq.com/openai/v1" : "https://api.openai.com/v1");
  const model = process.env.DRAFTORYN_AI_MODEL || process.env.GROQ_MODEL || (process.env.GROQ_API_KEY ? "llama-3.3-70b-versatile" : "gpt-4o");
  return { apiKey, baseUrl, model };
}

// Server-side generation entrypoint. AI keys live only on the server.
export async function runGeneration(
  definitionId: string,
  source: Record<string, unknown>,
  sectionId?: string,
): Promise<GeneratedDocument | Section> {
  const def = getDefinition(definitionId);
  if (!def) throw new Error(`Unknown document definition: ${definitionId}`);

  const { apiKey, baseUrl, model } = getAiConfig();

  if (sectionId) {
    if (apiKey) {
      const secDef = def.sections.find((s) => s.id === sectionId);
      if (!secDef) throw new Error(`Unknown section: ${sectionId}`);
      const baseDoc = generateDocument(def, source);
      const aiSection = await generateAiSection(def, secDef, baseDoc.model, source, apiKey, baseUrl, model);
      if (aiSection) return aiSection;
    }
    const section = regenerateSection(def, sectionId, source);
    if (!section) throw new Error(`Unknown section: ${sectionId}`);
    return section;
  }

  if (apiKey) {
    const aiDoc = await generateAiDocument(def, source, apiKey, baseUrl, model);
    if (aiDoc) return aiDoc;
  }

  // If no AI key was configured on the server, generate the deterministic baseline document
  return generateDocument(def, source);
}

async function generateAiDocument(
  def: NonNullable<ReturnType<typeof getDefinition>>,
  source: Record<string, unknown>,
  apiKey: string,
  baseUrl: string,
  model: string,
): Promise<GeneratedDocument | null> {
  const req = buildDocumentPrompt(def);

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.15,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `${req.system}\n\nRespond strictly with valid JSON conforming to:\n${req.schema}` },
        { role: "user", content: `${req.user}\n\nUser context:\n${JSON.stringify(source, null, 2)}` },
      ],
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`AI inference failed (${res.status}): ${errBody.slice(0, 200)}`);
  }

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = json.choices?.[0]?.message?.content;
  if (!text) throw new Error("AI engine returned an empty response.");

  try {
    const parsed = JSON.parse(text) as { sections?: Section[] };
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
  model: GeneratedDocument["model"],
  source: Record<string, unknown>,
  apiKey: string,
  baseUrl: string,
  aiModel: string,
): Promise<Section | null> {
  const req = buildSectionPrompt(def, secDef, model);

  const res = await fetch(`${baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: aiModel,
      temperature: 0.15,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `${req.system}\n\nRespond strictly with valid JSON conforming to:\n${req.schema}` },
        { role: "user", content: `${req.user}\n\nSource input:\n${JSON.stringify(source, null, 2)}` },
      ],
    }),
  });

  if (!res.ok) {
    const errBody = await res.text();
    throw new Error(`AI section inference failed (${res.status}): ${errBody.slice(0, 200)}`);
  }

  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = json.choices?.[0]?.message?.content;
  if (!text) return null;

  try {
    const parsed = JSON.parse(text) as { sections?: Section[] };
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


