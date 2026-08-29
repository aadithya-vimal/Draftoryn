import { USE_SERVER, GROQ_API_KEY, GROQ_BASE_URL, GROQ_MODEL, HAS_GROQ, apiUrl } from "./config";
import { getDefinition } from "../engine/definitions/catalog";
import { generateDocument, regenerateSection } from "../engine/generate";
import { buildDocumentPrompt, buildSectionPrompt } from "../engine/ai/prompt";
import { validateGeneratedDocument } from "../engine/validation";
import type { GeneratedDocument, Section } from "../engine/types";

interface GenerateOpts {
  sectionId?: string;
  getToken?: () => Promise<string | null>;
}

async function serverGenerate(
  definitionId: string,
  source: Record<string, unknown>,
  opts: GenerateOpts,
): Promise<GeneratedDocument> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  const token = opts.getToken ? await opts.getToken() : null;
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(apiUrl("/api/generate"), {
    method: "POST",
    headers,
    body: JSON.stringify({ definitionId, source, sectionId: opts.sectionId }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error((json && json.error) || "Generation failed.");
  return json as GeneratedDocument;
}

/**
 * Fast, low-cost Groq generation directly from client/edge.
 */
async function groqGenerate(
  def: NonNullable<ReturnType<typeof getDefinition>>,
  source: Record<string, unknown>,
  opts: GenerateOpts,
): Promise<GeneratedDocument | null> {
  if (!HAS_GROQ) return null;

  try {
    const base = generateDocument(def, source);

    if (opts.sectionId) {
      const secDef = def.sections.find((s) => s.id === opts.sectionId);
      if (!secDef) return null;
      const prompt = buildSectionPrompt(def, secDef, base.model);

      const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
          model: GROQ_MODEL,
          temperature: 0.1,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: `${prompt.system}\n\nRespond strictly in valid JSON matching:\n${prompt.schema}` },
            { role: "user", content: prompt.user },
          ],
        }),
      });

      if (!res.ok) return null;
      const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
      const text = data.choices?.[0]?.message?.content;
      if (!text) return null;

      const parsed = JSON.parse(text) as { sections?: Section[] };
      const aiSec = parsed.sections?.find((s) => s.id === opts.sectionId) || parsed.sections?.[0];
      if (aiSec && Array.isArray(aiSec.blocks) && aiSec.blocks.length > 0) {
        const updated = base.sections.map((s) =>
          s.id === opts.sectionId ? { ...s, blocks: aiSec.blocks, status: "generated" as const } : s,
        );
        return { ...base, sections: updated };
      }
      return null;
    }

    // Full document generation via Groq
    const prompt = buildDocumentPrompt(def);
    const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        temperature: 0.1,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: `${prompt.system}\n\nRespond strictly in valid JSON matching:\n${prompt.schema}` },
          { role: "user", content: `${prompt.user}\n\nContext Inputs:\n${JSON.stringify(source, null, 2)}` },
        ],
      }),
    });

    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const text = data.choices?.[0]?.message?.content;
    if (!text) return null;

    const parsed = JSON.parse(text) as { sections?: Section[] };
    if (Array.isArray(parsed.sections) && parsed.sections.length > 0) {
      const combined = base.sections.map((sec) => {
        const match = parsed.sections?.find((s) => s.id === sec.id);
        if (match && Array.isArray(match.blocks) && match.blocks.length > 0) {
          return { ...sec, blocks: match.blocks, status: "generated" as const };
        }
        return sec;
      });

      const validation = validateGeneratedDocument({ ...base, sections: combined });
      if (validation.success && validation.doc) {
        return validation.doc;
      }
    }
  } catch {
    // Groq error -> graceful fallback to deterministic engine
  }
  return null;
}

export async function generateDocumentClient(
  definitionId: string,
  source: Record<string, unknown>,
  opts: GenerateOpts = {},
): Promise<GeneratedDocument> {
  const def = getDefinition(definitionId);
  if (!def) throw new Error(`Unknown document definition: ${definitionId}`);

  // 1. If backend API server is explicitly running
  if (USE_SERVER) {
    try {
      return await serverGenerate(definitionId, source, opts);
    } catch {
      // Fallback
    }
  }

  // 2. Direct Groq fast AI generation (no dedicated backend needed)
  if (HAS_GROQ) {
    const aiResult = await groqGenerate(def, source, opts);
    if (aiResult) return aiResult;
  }

  // 3. Guaranteed Deterministic domain engine fallback
  if (opts.sectionId) {
    const full = generateDocument(def, source);
    const sec = regenerateSection(def, opts.sectionId, source);
    if (sec) {
      const idx = full.sections.findIndex((s) => s.id === opts.sectionId);
      if (idx >= 0) full.sections[idx] = sec;
    }
    return full;
  }
  return generateDocument(def, source);
}
