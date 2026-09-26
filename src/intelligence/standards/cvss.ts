// CVSS v4.0 (and 3.x) vector validation + qualitative bands.
// Vectors are validated, never manufactured. Scores are only trusted when
// every metric in the vector is evidenced (fullyDetermined).

export const CVSS_QUALITATIVE_40 = [
  { max: 0, label: "None" },
  { max: 3.9, label: "Low" },
  { max: 6.9, label: "Medium" },
  { max: 8.9, label: "High" },
  { max: 10, label: "Critical" },
] as const;

const V40_REQUIRED = ["AV", "AC", "AT", "PR", "UI", "VC", "VI", "VA", "SC", "SI", "SA"];
const V31_REQUIRED = ["AV", "AC", "PR", "UI", "S", "C", "I", "A"];

export interface CvssValidation {
  valid: boolean;
  version?: "4.0" | "3.1" | "3.0";
  reason?: string;
  qualitative?: string;
}

export function validateCvssVector(vector: string, score?: number): CvssValidation {
  const v = vector.trim();
  const m40 = v.match(/^CVSS:4\.0\/(.+)$/);
  const m31 = v.match(/^CVSS:3\.[01]\/(.+)$/);
  if (!m40 && !m31) return { valid: false, reason: "must start with CVSS:4.0/ or CVSS:3.x/" };
  const version = m40 ? ("4.0" as const) : v.startsWith("CVSS:3.1") ? ("3.1" as const) : ("3.0" as const);
  const body = (m40?.[1] ?? m31?.[1] ?? "");
  const metrics = new Map<string, string>();
  for (const part of body.split("/")) {
    const kv = part.split(":");
    if (kv.length !== 2 || !kv[0] || !kv[1]) return { valid: false, reason: `malformed metric '${part}'` };
    metrics.set(kv[0], kv[1]);
  }
  const required = version === "4.0" ? V40_REQUIRED : V31_REQUIRED;
  const missing = required.filter((k) => !metrics.has(k));
  if (missing.length > 0) {
    return { valid: false, version, reason: `missing metrics: ${missing.join(",")} — mark CVSS not fully determined` };
  }
  let qualitative: string | undefined;
  if (score !== undefined) {
    qualitative = CVSS_QUALITATIVE_40.find((b) => score <= b.max)?.label;
  }
  return { valid: true, version, qualitative };
}

export function qualitativeForScore(score: number): string {
  return CVSS_QUALITATIVE_40.find((b) => score <= b.max)?.label ?? "None";
}

// ---- NVD enrichment provider abstraction (optional, cached, never mandatory).
export interface NvdEnrichment {
  cveId: string;
  cvss?: { version: string; vector: string; score: number };
  description?: string;
  fetchedAt: string;
}

export interface NvdProvider {
  id: string;
  lookup(cveId: string): Promise<NvdEnrichment | null>;
}

/** Offline-safe null provider: enrichment degrades gracefully to nothing. */
export const nullNvdProvider: NvdProvider = {
  id: "null",
  lookup: async () => null,
};

export class CachedNvdProvider implements NvdProvider {
  readonly id = "cached";
  private cache = new Map<string, NvdEnrichment>();
  constructor(private readonly inner: NvdProvider = nullNvdProvider) {}
  async lookup(cveId: string): Promise<NvdEnrichment | null> {
    const hit = this.cache.get(cveId);
    if (hit) return hit;
    const res = await this.inner.lookup(cveId);
    if (res) this.cache.set(cveId, res);
    return res;
  }
}
