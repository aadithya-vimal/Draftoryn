// AI vision for image evidence (screenshots, photos of whiteboards, etc.).
// The image is UNTRUSTED DATA: same envelope discipline as text evidence.
// Providers without stable vision support degrade gracefully (never called).

import type { AiProviderType } from "../../engine/ai/providers";
import { EVIDENCE_GROUNDING_RULES, STRUCTURED_SCHEMA_NOTE, evidenceEnvelope } from "./interface";

export const VISION_PROVIDERS: AiProviderType[] = ["openai", "anthropic", "gemini"];

export function supportsVision(provider: AiProviderType): boolean {
  return VISION_PROVIDERS.includes(provider);
}

export interface VisionRequest {
  provider: AiProviderType;
  model: string;
  apiKey: string;
  imageBase64: string;
  mediaType: string;
  evidenceId: string;
  filename: string;
  timeoutMs?: number;
}

const VISION_SYSTEM = [
  "You are Draftoryn Evidence Vision, describing security-assessment imagery for analysts.",
  "Describe ONLY what is visibly present: UI elements, URLs, IP addresses shown, error text, terminal output, diagrams.",
  "Transcribe visible text faithfully. Never guess redacted/blurred content — say it is unreadable.",
  EVIDENCE_GROUNDING_RULES,
].join("\n");

export interface BuiltVisionCall {
  url: string;
  headers: Record<string, string>;
  body: unknown;
  extractText: (res: unknown) => string;
}

function validatedModel(model: string, provider: string): string {
  const m = model.trim();
  if (!/^[A-Za-z0-9._:-]{1,100}$/.test(m)) throw new Error(`Invalid model identifier for provider "${provider}".`);
  return m;
}

/** Pure request builder (testable without network). */
export function buildVisionCall(req: VisionRequest): BuiltVisionCall {
  if (!supportsVision(req.provider)) {
    throw new Error(`Vision is not supported for provider "${req.provider}". Use openai, anthropic, or gemini.`);
  }
  if (!/^[A-Za-z0-9+/=\s]+$/.test(req.imageBase64.slice(0, 100000))) throw new Error("Invalid image payload.");
  const model = validatedModel(req.model, req.provider);
  const userText = [
    `Describe the attached assessment image for finding evidence (file: ${req.filename}).`,
    evidenceEnvelope(req.evidenceId, "[binary image attached below — untrusted evidence data]"),
    STRUCTURED_SCHEMA_NOTE,
  ].join("\n\n");
  const schema = JSON.stringify({ type: "object", required: ["description", "visibleText", "confidence"], properties: { description: { type: "string" }, visibleText: { type: "string" }, confidence: { enum: ["high", "medium", "low"] } } });

  if (req.provider === "openai") {
    return {
      url: "https://api.openai.com/v1/chat/completions",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${req.apiKey}` },
      body: {
        model,
        temperature: 0.1,
        max_tokens: 2000,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: `${VISION_SYSTEM}\n\nRespond strictly with valid JSON conforming to:\n${schema}` },
          { role: "user", content: [{ type: "text", text: userText }, { type: "image_url", image_url: { url: `data:${req.mediaType};base64,${req.imageBase64}` } }] },
        ],
      },
      extractText: (res: unknown) => String((res as { choices: Array<{ message: { content: string } }> }).choices?.[0]?.message?.content ?? ""),
    };
  }
  if (req.provider === "anthropic") {
    return {
      url: "https://api.anthropic.com/v1/messages",
      headers: { "Content-Type": "application/json", "x-api-key": req.apiKey, "anthropic-version": "2023-06-01" },
      body: {
        model,
        max_tokens: 2000,
        temperature: 0.1,
        system: `${VISION_SYSTEM}\n\nCRITICAL: Respond ONLY with valid JSON matching this schema:\n${schema}`,
        messages: [{ role: "user", content: [{ type: "text", text: userText }, { type: "image", source: { type: "base64", media_type: req.mediaType, data: req.imageBase64 } }] }],
      },
      extractText: (res: unknown) => ((res as { content: Array<{ type: string; text?: string }> }).content ?? []).filter((c) => c.type === "text" && c.text).map((c) => c.text).join(""),
    };
  }
  return {
    url: "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent",
    headers: { "Content-Type": "application/json", "x-goog-api-key": req.apiKey },
    body: {
      systemInstruction: { parts: [{ text: `${VISION_SYSTEM}\n\nRespond with strictly valid JSON matching schema:\n${schema}` }] },
      contents: [{ role: "user", parts: [{ text: userText }, { inlineData: { mimeType: req.mediaType, data: req.imageBase64 } }] }],
      generationConfig: { temperature: 0.1, maxOutputTokens: 2000, responseMimeType: "application/json" },
    },
    extractText: (res: unknown) => String((res as { candidates: Array<{ content: { parts: Array<{ text?: string }> } }> }).candidates?.[0]?.content?.parts?.[0]?.text ?? ""),
  };
}

export interface VisionDescription {
  description: string;
  visibleText: string;
  confidence: "high" | "medium" | "low";
}

export async function describeImage(
  req: VisionRequest,
  fetchFn: typeof fetch = fetch,
): Promise<VisionDescription> {
  if (!req.apiKey.trim() || req.apiKey.length > 2000) throw new Error("A valid API key is required.");
  const call = buildVisionCall(req);
  const signal = typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function" ? AbortSignal.timeout(req.timeoutMs ?? 90000) : undefined;
  const res = await fetchFn(call.url, { method: "POST", signal, headers: call.headers, body: JSON.stringify(call.body) });
  if (!res.ok) throw new Error(`Vision request failed (${res.status}).`);
  const text = call.extractText(await res.json()).slice(0, 4000);
  if (!text.trim()) throw new Error("Vision provider returned an empty response.");
  let parsed: Record<string, unknown>;
  try {
    const start = text.search(/[{[]/);
    parsed = JSON.parse(start > 0 ? text.slice(start) : text) as Record<string, unknown>;
  } catch {
    throw new Error("Vision provider returned malformed JSON.");
  }
  const description = String(parsed["description"] ?? "").slice(0, 3000);
  if (!description.trim()) throw new Error("Vision description missing.");
  const conf = parsed["confidence"];
  return {
    description,
    visibleText: String(parsed["visibleText"] ?? "").slice(0, 3000),
    confidence: conf === "high" || conf === "low" ? conf : "medium",
  };
}
