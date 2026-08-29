import { getDefinition } from "../src/engine/definitions/catalog";
import { generateDocument, regenerateSection } from "../src/engine/generate";
import { buildDocumentPrompt, buildSectionPrompt } from "../src/engine/ai/prompt";
import { validateGeneratedDocument } from "../src/engine/validation";
import type { GeneratedDocument, Section } from "../src/engine/types";

// Server-side generation entrypoint. AI keys live only on the server, so the
// client can never see them.
export async function runGeneration(
  definitionId: string,
  source: Record<string, unknown>,
  sectionId?: string,
): Promise<GeneratedDocument | Section> {
  const def = getDefinition(definitionId);
  if (!def) throw new Error(`Unknown document definition: ${definitionId}`);

  const apiKey = process.env.DRAFTORYN_AI_API_KEY;

  if (sectionId) {
    if (apiKey) {
      try {
        const secDef = def.sections.find((s) => s.id === sectionId);
        if (secDef) {
          const baseDoc = generateDocument(def, source);
          const aiSection = await generateAiSection(def, secDef, baseDoc.model, apiKey);
          if (aiSection) return aiSection;
        }
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn("AI section regeneration failed; using domain engine.", e);
      }
    }
    const section = regenerateSection(def, sectionId, source);
    if (!section) throw new Error(`Unknown section: ${sectionId}`);
    return section;
  }

  if (apiKey) {
    try {
      const aiDoc = await generateAiDocument(def, source, apiKey);
      if (aiDoc) return aiDoc;
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("AI document generation failed; using deterministic domain engine.", e);
    }
  }

  return generateDocument(def, source);
}

async function generateAiDocument(
  def: ReturnType<typeof getDefinition> extends undefined ? never : NonNullable<ReturnType<typeof getDefinition>>,
  source: Record<string, unknown>,
  apiKey: string,
): Promise<GeneratedDocument | null> {
  const req = buildDocumentPrompt(def);
  const baseUrl = process.env.DRAFTORYN_AI_BASE_URL || "https://api.openai.com/v1";
  const model = process.env.DRAFTORYN_AI_MODEL || "gpt-4o";

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `${req.system}\n\nRespond strictly with valid JSON conforming to:\n${req.schema}` },
        { role: "user", content: `${req.user}\n\nUser context:\n${JSON.stringify(source, null, 2)}` },
      ],
    }),
  });

  if (!res.ok) return null;
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = json.choices?.[0]?.message?.content;
  if (!text) return null;

  try {
    const parsed = JSON.parse(text) as { sections?: Section[] };
    if (Array.isArray(parsed.sections) && parsed.sections.length > 0) {
      const base = generateDocument(def, source);
      const combinedSections = base.sections.map((sec) => {
        const aiMatch = parsed.sections?.find((s) => s.id === sec.id);
        if (aiMatch && Array.isArray(aiMatch.blocks) && aiMatch.blocks.length > 0) {
          return {
            ...sec,
            blocks: aiMatch.blocks,
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
    // eslint-disable-next-line no-console
    console.warn("Could not parse AI response JSON", err);
  }

  return null;
}

async function generateAiSection(
  def: ReturnType<typeof getDefinition> extends undefined ? never : NonNullable<ReturnType<typeof getDefinition>>,
  secDef: NonNullable<ReturnType<typeof getDefinition>>["sections"][number],
  model: GeneratedDocument["model"],
  apiKey: string,
): Promise<Section | null> {
  const req = buildSectionPrompt(def, secDef, model);
  const baseUrl = process.env.DRAFTORYN_AI_BASE_URL || "https://api.openai.com/v1";
  const aiModel = process.env.DRAFTORYN_AI_MODEL || "gpt-4o";

  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: aiModel,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: `${req.system}\n\nRespond strictly with valid JSON conforming to:\n${req.schema}` },
        { role: "user", content: req.user },
      ],
    }),
  });

  if (!res.ok) return null;
  const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
  const text = json.choices?.[0]?.message?.content;
  if (!text) return null;

  try {
    const parsed = JSON.parse(text) as { sections?: Section[] };
    const found = parsed.sections?.find((s) => s.id === secDef.id) || parsed.sections?.[0];
    if (found && Array.isArray(found.blocks) && found.blocks.length > 0) {
      return {
        id: secDef.id,
        title: secDef.title,
        kind: secDef.kind,
        blocks: found.blocks,
        status: "generated",
      };
    }
  } catch {
    // ignore
  }
  return null;
}

