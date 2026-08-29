import type { DocumentDefinition, GeneratedDocument, Section } from "../engine/types";
import { getDefinition } from "../engine/definitions/catalog";
import { generateDocument, regenerateSection } from "../engine/generate";
import { buildDocumentPrompt, buildSectionPrompt } from "../engine/ai/prompt";
import { validateGeneratedDocument } from "../engine/validation";

interface AIModelOutput {
  sections?: Array<{
    id: string;
    title: string;
    kind: string;
    blocks: Section["blocks"];
  }>;
}

function mapSections(def: DocumentDefinition, output: AIModelOutput): Section[] | null {
  if (!output.sections || !Array.isArray(output.sections)) return null;
  const byId = new Map(def.sections.map((s) => [s.id, s]));
  const result: Section[] = [];
  for (const raw of output.sections) {
    const def2 = byId.get(raw.id);
    if (!def2) continue;
    result.push({
      id: def2.id,
      title: def2.title,
      kind: def2.kind,
      blocks: raw.blocks ?? [],
      status: "ai",
      generatedAt: new Date().toISOString(),
    });
  }
  return result.length ? result : null;
}

async function callModel(def: DocumentDefinition, sectionId?: string): Promise<Section[] | null> {
  const apiKey = process.env.DRAFTORYN_AI_API_KEY;
  if (!apiKey) return null;
  try {
    const req = sectionId
      ? buildSectionPrompt(def, def.sections.find((s) => s.id === sectionId)!, {} as never)
      : buildDocumentPrompt(def);
    const base = process.env.DRAFTORYN_AI_BASE_URL ?? "https://api.openai.com/v1";
    const model = process.env.DRAFTORYN_AI_MODEL ?? "gpt-4o";
    const res = await fetch(`${base}/chat/completions`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        temperature: 0.2,
        messages: [
          { role: "system", content: req.system },
          { role: "user", content: `${req.user}\n\nReturn ONLY JSON: ${req.schema}` },
        ],
      }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = json.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content) as AIModelOutput;
    return mapSections(def, parsed);
  } catch {
    return null;
  }
}

export async function runGeneration(
  definitionId: string,
  source: Record<string, unknown>,
  sectionId?: string,
): Promise<GeneratedDocument> {
  const def = getDefinition(definitionId);
  if (!def) throw new Error(`Unknown document definition: ${definitionId}`);

  // Section regeneration: only that section (deterministic or AI).
  if (sectionId) {
    const ai = await callModel(def, sectionId);
    if (ai) {
      const full = generateDocument(def, source);
      const updated = ai.find((s) => s.id === sectionId);
      if (updated) {
        const idx = full.sections.findIndex((s) => s.id === sectionId);
        if (idx >= 0) full.sections[idx] = updated;
        return full;
      }
    }
    const sec = regenerateSection(def, sectionId, source);
    const full = generateDocument(def, source);
    if (sec) {
      const idx = full.sections.findIndex((s) => s.id === sectionId);
      if (idx >= 0) full.sections[idx] = sec;
    }
    return full;
  }

  const ai = await callModel(def);
  if (ai) {
    const gen = generateDocument(def, source);
    gen.sections = ai;
    const validated = validateGeneratedDocument(gen);
    if (validated.success && validated.doc) return validated.doc;
  }
  return generateDocument(def, source);
}
