// Redaction: detect sensitive material, keep the original, expose a
// redacted representation. Redaction is indicated, never silent.

export interface RedactionResult {
  redacted: string;
  hits: number;
  types: string[];
}

const PATTERNS: Array<{ type: string; re: RegExp; replace: string }> = [
  { type: "private_key", re: /-----BEGIN [A-Z ]*PRIVATE KEY-----[\s\S]*?-----END [A-Z ]*PRIVATE KEY-----/g, replace: "[REDACTED:PRIVATE_KEY]" },
  { type: "aws_key", re: /\bAKIA[0-9A-Z]{16}\b/g, replace: "[REDACTED:AWS_KEY]" },
  { type: "bearer_token", re: /bearer\s+[A-Za-z0-9\-._~+/=]{12,}/gi, replace: "Bearer [REDACTED]" },
  { type: "basic_auth", re: /basic\s+[A-Za-z0-9+/=]{12,}/gi, replace: "Basic [REDACTED]" },
  { type: "password_assignment", re: /(password|passwd|pwd|secret)\s*[:=]\s*['"]?[^\s'";,]{3,}/gi, replace: "$1=[REDACTED]" },
  { type: "email", re: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, replace: "[REDACTED:EMAIL]" },
  { type: "jwt", re: /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g, replace: "[REDACTED:JWT]" },
  { type: "cookie", re: /(cookie|sessionid|session_token)\s*[:=]\s*[^\s;,]{6,}/gi, replace: "$1=[REDACTED]" },
];

export function redactText(text: string): RedactionResult {
  let out = text;
  const types = new Set<string>();
  let hits = 0;
  for (const p of PATTERNS) {
    p.re.lastIndex = 0;
    const matches = out.match(p.re);
    if (matches && matches.length > 0) {
      hits += matches.length;
      types.add(p.type);
      out = out.replace(p.re, p.replace);
    }
  }
  return { redacted: out, hits, types: [...types] };
}

/** Never log secrets: one-way presence summary safe for telemetry. */
export function redactionSummary(result: RedactionResult): string {
  return `redactions=${result.hits} types=[${result.types.join(",")}]`;
}
