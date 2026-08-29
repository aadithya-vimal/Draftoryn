import { apiUrl } from "./config";
import { getDefinition } from "../engine/definitions/catalog";
import { generateDocument, regenerateSection } from "../engine/generate";
import type { GeneratedDocument, Section } from "../engine/types";

export interface GenerateOpts {
  sectionId?: string;
  getToken?: () => Promise<string | null>;
  onStageChange?: (stage: string) => void;
  allowLocalFallback?: boolean;
}

export async function serverGenerate(
  definitionId: string,
  source: Record<string, unknown>,
  opts: GenerateOpts = {},
): Promise<GeneratedDocument> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (opts.getToken) {
    const token = await opts.getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  opts.onStageChange?.("Preparing request");
  const res = await fetch(apiUrl("/api/generate"), {
    method: "POST",
    headers,
    body: JSON.stringify({ definitionId, source, sectionId: opts.sectionId }),
  });

  const text = await res.text();
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    // Non-JSON response
  }

  if (!res.ok) {
    const errorMsg =
      json && typeof json === "object" && "error" in json && typeof (json as { error: unknown }).error === "string"
        ? (json as { error: string }).error
        : `Generation failed (HTTP ${res.status})`;
    throw new Error(errorMsg);
  }

  return json as GeneratedDocument;
}

export async function generateDocumentClient(
  definitionId: string,
  source: Record<string, unknown>,
  opts: GenerateOpts = {},
): Promise<GeneratedDocument> {
  const def = getDefinition(definitionId);
  if (!def) throw new Error(`Unknown document definition: ${definitionId}`);

  opts.onStageChange?.("Contacting AI engine");

  // 1. Primary: Server-side AI Generation via Groq / LLaMA 3.3
  try {
    const result = await serverGenerate(definitionId, source, opts);
    return result;
  } catch (serverErr) {
    // If the error was an explicit AI error or authorization failure from server, rethrow so user sees real error
    const msg = serverErr instanceof Error ? serverErr.message : String(serverErr);
    
    // If offline / local dev fallback is explicitly permitted (e.g. server down or offline development)
    if (opts.allowLocalFallback || msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("fetch failed")) {
      opts.onStageChange?.("Generating local structural baseline");
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

    throw new Error(msg);
  }
}

