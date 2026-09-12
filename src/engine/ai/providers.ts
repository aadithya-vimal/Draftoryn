export type AiProviderType = "openai" | "anthropic" | "groq" | "gemini";

export interface ProviderInfo {
  id: AiProviderType;
  name: string;
  defaultModel: string;
  models: string[];
  description: string;
  keyPlaceholder: string;
  docsUrl: string;
}

export const AI_PROVIDERS: Record<AiProviderType, ProviderInfo> = {
  openai: {
    id: "openai",
    name: "OpenAI",
    defaultModel: "gpt-4o-mini",
    models: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "o3-mini"],
    description: "Industry-standard models with robust JSON output schema support.",
    keyPlaceholder: "sk-...",
    docsUrl: "https://platform.openai.com/api-keys",
  },
  anthropic: {
    id: "anthropic",
    name: "Anthropic Claude",
    defaultModel: "claude-3-5-sonnet-20241022",
    models: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-opus-20240229"],
    description: "Deep reasoning and high-fidelity technical specification drafting.",
    keyPlaceholder: "sk-ant-api03-...",
    docsUrl: "https://console.anthropic.com/settings/keys",
  },
  groq: {
    id: "groq",
    name: "Groq LPU",
    defaultModel: "llama-3.3-70b-versatile",
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "mixtral-8x7b-32768"],
    description: "Ultra high-speed open-weights inference engine.",
    keyPlaceholder: "gsk_...",
    docsUrl: "https://console.groq.com/keys",
  },
  gemini: {
    id: "gemini",
    name: "Google Gemini",
    defaultModel: "gemini-1.5-flash",
    models: ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash"],
    description: "High-context multimodal and fast structured JSON generation.",
    keyPlaceholder: "AIzaSy...",
    docsUrl: "https://aistudio.google.com/app/apikey",
  },
};

export interface AiCallOptions {
  provider: AiProviderType;
  model?: string;
  apiKey: string;
  systemPrompt: string;
  userPrompt: string;
  schema?: string;
  temperature?: number;
  /** Per-call output cap. Defaults per provider below. */
  maxTokens?: number;
  /** Abort timeout in ms. Defaults to AI_REQUEST_TIMEOUT_MS. */
  timeoutMs?: number;
}

// Fixed provider endpoints. There is intentionally NO custom-baseUrl option:
// arbitrary server-side fetch targets would be an SSRF vector.
const OPENAI_BASE_URL = "https://api.openai.com/v1";
const ANTHROPIC_BASE_URL = "https://api.anthropic.com/v1";
const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

export const AI_REQUEST_TIMEOUT_MS = 90_000;
export const AI_DEFAULT_MAX_TOKENS = 8192;
export const AI_ANTHROPIC_DEFAULT_MAX_TOKENS = 4096;
/** Upper bound on accepted model output (chars) before aborting. */
export const AI_MAX_RESPONSE_CHARS = 300_000;

function requestSignal(timeoutMs: number): AbortSignal | undefined {
  const normalized = Number.isFinite(timeoutMs) ? Math.min(Math.max(timeoutMs, 1000), 300_000) : AI_REQUEST_TIMEOUT_MS;
  try {
    if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
      return AbortSignal.timeout(normalized);
    }
  } catch {
    // fall through to no signal
  }
  return undefined;
}

function isAbortError(e: unknown): boolean {
  return e instanceof Error && (e.name === "AbortError" || e.name === "TimeoutError");
}

function guardResponseLength(content: string, provider: string): string {
  if (content.length > AI_MAX_RESPONSE_CHARS) {
    throw new Error(`${provider} returned an oversized response; aborting.`);
  }
  return content;
}

/**
 * Strips markdown formatting (e.g. ```json ... ```) and extracts valid JSON substring.
 */
export function cleanJsonText(raw: string): string {
  let cleaned = raw.trim();

  // If response is wrapped in code fences like ```json ... ```
  if (cleaned.startsWith("```")) {
    const firstNewline = cleaned.indexOf("\n");
    if (firstNewline !== -1) {
      cleaned = cleaned.slice(firstNewline + 1);
    }
    const lastFence = cleaned.lastIndexOf("```");
    if (lastFence !== -1) {
      cleaned = cleaned.slice(0, lastFence);
    }
  }

  cleaned = cleaned.trim();

  // If there is leading/trailing text outside the first { or [
  const firstBrace = cleaned.indexOf("{");
  const firstBracket = cleaned.indexOf("[");
  let startIdx = -1;
  if (firstBrace !== -1 && firstBracket !== -1) {
    startIdx = Math.min(firstBrace, firstBracket);
  } else if (firstBrace !== -1) {
    startIdx = firstBrace;
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
  }

  if (startIdx > 0) {
    const lastBrace = cleaned.lastIndexOf("}");
    const lastBracket = cleaned.lastIndexOf("]");
    const endIdx = Math.max(lastBrace, lastBracket);
    if (endIdx > startIdx) {
      cleaned = cleaned.slice(startIdx, endIdx + 1);
    }
  }

  return cleaned;
}

export function cleanAndParseJson<T = unknown>(raw: string): T {
  const cleaned = cleanJsonText(raw);
  try {
    return JSON.parse(cleaned) as T;
  } catch (err) {
    throw new Error(
      `Failed to parse JSON from model response: ${err instanceof Error ? err.message : String(err)}\nRaw preview: ${raw.slice(0, 300)}`,
    );
  }
}

/**
 * Executes an AI completion across OpenAI, Anthropic, Groq, or Google Gemini.
 */
export async function executeAiCall(opts: AiCallOptions): Promise<string> {
  const provider = opts.provider;
  const apiKey = opts.apiKey.trim();
  if (!apiKey) {
    throw new Error(`API key is required for provider "${provider}".`);
  }

  const model = opts.model?.trim() || AI_PROVIDERS[provider].defaultModel;
  if (!/^[A-Za-z0-9._:-]{1,100}$/.test(model)) {
    throw new Error(`Invalid model identifier for provider "${provider}".`);
  }
  if (apiKey.length > 2000) {
    throw new Error(`API key is invalid for provider "${provider}".`);
  }
  const temp = opts.temperature ?? 0.15;
  const signal = requestSignal(opts.timeoutMs ?? AI_REQUEST_TIMEOUT_MS);

  try {
    switch (provider) {
      case "openai": {
        const maxTokens = opts.maxTokens ?? AI_DEFAULT_MAX_TOKENS;
        const res = await fetch(`${OPENAI_BASE_URL}/chat/completions`, {
          method: "POST",
          signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            temperature: temp,
            max_tokens: maxTokens,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content: opts.schema
                  ? `${opts.systemPrompt}\n\nRespond strictly with valid JSON conforming to:\n${opts.schema}`
                  : opts.systemPrompt,
              },
              { role: "user", content: opts.userPrompt },
            ],
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`OpenAI request failed (${res.status}): ${errText.slice(0, 300)}`);
        }

        const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const content = json.choices?.[0]?.message?.content;
        if (!content) throw new Error("OpenAI returned an empty response.");
        return guardResponseLength(content, "OpenAI");
      }

      case "anthropic": {
        const maxTokens = opts.maxTokens ?? AI_ANTHROPIC_DEFAULT_MAX_TOKENS;
        const systemInstruction = opts.schema
          ? `${opts.systemPrompt}\n\nCRITICAL: Respond ONLY with valid, RFC-8259 compliant JSON matching this schema:\n${opts.schema}\nDo NOT wrap with markdown, do not write explanations.`
          : opts.systemPrompt;

        const res = await fetch(`${ANTHROPIC_BASE_URL}/messages`, {
          method: "POST",
          signal,
          headers: {
            "Content-Type": "application/json",
            "x-api-key": apiKey,
            "anthropic-version": "2023-06-01",
          },
          body: JSON.stringify({
            model,
            max_tokens: maxTokens,
            temperature: temp,
            system: systemInstruction,
            messages: [{ role: "user", content: opts.userPrompt }],
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Anthropic request failed (${res.status}): ${errText.slice(0, 300)}`);
        }

        const json = (await res.json()) as { content?: Array<{ type?: string; text?: string }> };
        const content = json.content
          ?.filter((c) => c.type === "text" && c.text)
          .map((c) => c.text)
          .join("");

        if (!content) throw new Error("Anthropic returned an empty response.");
        return guardResponseLength(content, "Anthropic");
      }

      case "groq": {
        const maxTokens = opts.maxTokens ?? AI_DEFAULT_MAX_TOKENS;
        const res = await fetch(`${GROQ_BASE_URL}/chat/completions`, {
          method: "POST",
          signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            temperature: temp,
            max_tokens: maxTokens,
            response_format: { type: "json_object" },
            messages: [
              {
                role: "system",
                content: opts.schema
                  ? `${opts.systemPrompt}\n\nRespond strictly with valid JSON conforming to:\n${opts.schema}`
                  : opts.systemPrompt,
              },
              { role: "user", content: opts.userPrompt },
            ],
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Groq request failed (${res.status}): ${errText.slice(0, 300)}`);
        }

        const json = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
        const content = json.choices?.[0]?.message?.content;
        if (!content) throw new Error("Groq returned an empty response.");
        return guardResponseLength(content, "Groq");
      }

      case "gemini": {
        const maxTokens = opts.maxTokens ?? AI_DEFAULT_MAX_TOKENS;
        const url = `${GEMINI_BASE_URL}/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

        const sysText = opts.schema
          ? `${opts.systemPrompt}\n\nRespond with strictly valid JSON matching schema:\n${opts.schema}`
          : opts.systemPrompt;

        const res = await fetch(url, {
          method: "POST",
          signal,
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            systemInstruction: {
              parts: [{ text: sysText }],
            },
            contents: [
              {
                role: "user",
                parts: [{ text: opts.userPrompt }],
              },
            ],
            generationConfig: {
              temperature: temp,
              maxOutputTokens: maxTokens,
              responseMimeType: "application/json",
            },
          }),
        });

        if (!res.ok) {
          const errText = await res.text();
          throw new Error(`Google Gemini request failed (${res.status}): ${errText.slice(0, 300)}`);
        }

        const json = (await res.json()) as {
          candidates?: Array<{
            content?: {
              parts?: Array<{ text?: string }>;
            };
          }>;
        };

        const candidate = json.candidates?.[0];
        const part = candidate?.content?.parts?.[0];
        const content = part?.text;

        if (!content) throw new Error("Google Gemini returned an empty response.");
        return guardResponseLength(content, "Google Gemini");
      }

      default: {
        const exhaustiveCheck: never = provider;
        throw new Error(`Unsupported AI provider: ${String(exhaustiveCheck)}`);
      }
    }
  } catch (e) {
    if (isAbortError(e)) {
      throw new Error(`AI request to "${provider}" timed out. Please try again.`);
    }
    throw e;
  }
}

export async function callAiProviderAndParseJson<T = unknown>(opts: AiCallOptions): Promise<T> {
  const raw = await executeAiCall(opts);
  return cleanAndParseJson<T>(raw);
}
