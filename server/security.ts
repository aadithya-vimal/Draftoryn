import { z } from "zod";
import type { Context, Next } from "hono";
import { AI_PROVIDERS, type AiProviderType } from "../src/engine/ai/providers";

// ===========================================================================
// Draftoryn server security controls.
//
// Tenant isolation is enforced EXCLUSIVELY by explicit owner-scoped queries
// (WHERE owner_id = authenticatedUserId) in server/neon.ts. There are no
// database RLS policies, so no code here pretends otherwise.
// ===========================================================================

export function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

/** Dev-mode identity bypass is ONLY available with an explicit opt-in flag outside production. */
export function allowDevAuth(): boolean {
  return !isProduction() && process.env.ALLOW_DEV_AUTH === "true";
}

// ---------------------------------------------------------------------------
// Safe HTTP errors — the ONLY error shape returned to clients.
// ---------------------------------------------------------------------------

export class HttpError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export const badRequest = (message: string) => new HttpError(400, message);
export const unauthorized = (message = "Unauthorized") => new HttpError(401, message);
export const forbidden = (message = "Forbidden") => new HttpError(403, message);
/** Used for unauthorized resource access to avoid existence oracles. */
export const notFound = (message = "Not found") => new HttpError(404, message);
export const conflict = (message: string) => new HttpError(409, message);
export const tooLarge = (message: string) => new HttpError(413, message);
export const rateLimited = (retryAfterSec: number) =>
  new HttpError(429, `Too many requests. Please retry in ${retryAfterSec} seconds.`);

/** Maps unknown failures to safe client responses. Logs full detail server-side only. */
export function toSafeError(e: unknown, route: string): { status: number; message: string } {
  if (e instanceof HttpError) return { status: e.status, message: e.message };
  const message = e instanceof Error ? e.message : String(e);
  // Unique-constraint collisions carry no sensitive detail; surface as conflict.
  if (/duplicate key|unique constraint|already exists|23505/i.test(message)) {
    logSecurityEvent("db_conflict", { route });
    return { status: 409, message: "A conflicting record already exists." };
  }
  logSecurityEvent("server_error", { route, detail: message });
  return { status: 500, message: "Request failed. Please try again." };
}

// ---------------------------------------------------------------------------
// Size-limited JSON body parsing.
// ---------------------------------------------------------------------------

export const MAX_JSON_BYTES = 256 * 1024;
export const MAX_GENERATE_JSON_BYTES = 512 * 1024;

export async function readJsonBody(c: Context, maxBytes = MAX_JSON_BYTES): Promise<unknown> {
  const declared = c.req.header("content-length");
  if (declared && Number(declared) > maxBytes) {
    throw tooLarge(`Request body exceeds the ${Math.round(maxBytes / 1024)}KB limit.`);
  }
  const text = await c.req.text();
  if (text.length > maxBytes) {
    throw tooLarge(`Request body exceeds the ${Math.round(maxBytes / 1024)}KB limit.`);
  }
  if (!text.trim()) throw badRequest("Request body is required.");
  try {
    return JSON.parse(text);
  } catch {
    throw badRequest("Malformed JSON body.");
  }
}

// ---------------------------------------------------------------------------
// Request validation schemas (Zod). Runtime enforcement — never trust types.
// ---------------------------------------------------------------------------

const boundedString = (max: number) => z.string().max(max);
const jsonScalar = z.union([z.string().max(20000), z.number(), z.boolean(), z.null()]);
const jsonValue: z.ZodTypeAny = z.lazy(() =>
  z.union([jsonScalar, z.array(jsonValue).max(200), cappedRecord(jsonValue, 200)]),
);

/** Key-count-capped record (works across Zod versions lacking record().max()). */
function cappedRecord(value: z.ZodTypeAny, maxKeys: number): z.ZodTypeAny {
  return z
    .record(value)
    .refine((o) => Object.keys(o as Record<string, unknown>).length <= maxKeys, {
      message: `Too many entries (max ${maxKeys})`,
    });
}

const DOCUMENT_ID = z.string().min(1).max(120).regex(/^[A-Za-z0-9_-]+$/);
const DEFINITION_ID = z.string().min(1).max(80).regex(/^[a-z0-9_]+$/);
const SECTION_ID = z.string().min(1).max(80).regex(/^[a-z0-9_]+$/);
const PROVIDER = z.enum(["openai", "anthropic", "groq", "gemini"]);
const MODEL = z.string().min(1).max(100).regex(/^[A-Za-z0-9._:-]+$/);
const EXPORT_FORMAT = z.enum(["pdf", "docx", "markdown", "html", "json", "xml", "yaml"]);

export const generateBodySchema = z
  .object({
    definitionId: DEFINITION_ID,
    source: cappedRecord(jsonValue, 300).optional(),
    sectionId: SECTION_ID.optional(),
    useAi: z.boolean().optional(),
    provider: PROVIDER.optional(),
    model: MODEL.optional(),
    apiKey: z.string().max(2000).optional(),
  })
  .strict();

const contentBlockSchema = z.object({
  type: z.enum(["heading", "paragraph", "list", "table", "callout", "divider"]),
  text: z.string().max(20000).optional(),
  level: z.number().int().min(1).max(6).optional(),
  items: z.array(z.string().max(5000)).max(200).optional(),
  table: z
    .object({
      headers: z.array(z.string().max(2000)).max(50),
      rows: z.array(z.array(z.string().max(5000)).max(50)).max(500),
    })
    .optional(),
  tone: z.enum(["info", "warning", "missing", "assumption", "neutral"]).optional(),
});

const versionSchema = z.object({
  id: z.string().max(160),
  versionNumber: z.number().int().min(1).max(10000),
  title: z.string().max(300),
  source: cappedRecord(jsonValue, 500).optional(),
  model: z.unknown().optional(),
  sections: z.array(z.unknown()).max(300).optional(),
  note: z.string().max(500).optional(),
  createdAt: z.string().max(40).optional(),
});

export const documentRecordSchema = z
  .object({
    id: DOCUMENT_ID,
    definitionId: DEFINITION_ID,
    title: boundedString(300),
    status: z.enum(["draft", "generating", "ready", "editing", "exporting", "error"]).optional(),
    workspaceId: z.string().max(120).optional(),
    source: cappedRecord(jsonValue, 500).optional(),
    versions: z.array(versionSchema).max(50).optional(),
    sections: z.array(contentBlockSchema).max(300).optional(),
    model: z.unknown().optional(),
  })
  .catchall(z.unknown());

export const workspaceCreateSchema = z
  .object({
    name: z.string().trim().min(1).max(80),
    slug: z.string().trim().min(1).max(80).regex(/^[a-z0-9-]+$/).optional(),
    settings: cappedRecord(jsonValue, 50).optional(),
  })
  .strict();

export const workspaceUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(80).optional(),
    slug: z.string().trim().min(1).max(80).regex(/^[a-z0-9-]+$/).optional(),
    settings: cappedRecord(jsonValue, 50).optional(),
  })
  .strict();

export const settingsSchema = z
  .object({
    defaultExportFormat: EXPORT_FORMAT.optional(),
    compactLists: z.boolean().optional(),
    themeMode: z.enum(["dark", "light"]).optional(),
    sessionTimeoutMinutes: z.number().int().min(1).max(480).optional(),
    testerProfile: cappedRecord(jsonValue, 100).optional(),
    clientProfile: cappedRecord(jsonValue, 100).optional(),
    aiSettings: cappedRecord(jsonValue, 100).optional(),
  })
  .strict();

export const onboardingSchema = z
  .object({
    completed: z.boolean().optional(),
    step: z.number().int().min(1).max(50).optional(),
    role: boundedString(80).optional(),
    persona: boundedString(80).optional(),
    onboardingData: cappedRecord(jsonValue, 100).optional(),
    workspaceName: z.string().trim().min(1).max(80).optional(),
    organizationName: z.string().trim().min(1).max(160).optional(),
    representativeName: z.string().trim().min(1).max(160).optional(),
    defaultExportFormat: EXPORT_FORMAT.optional(),
    contactEmail: z.string().trim().max(254).optional(),
    department: z.string().trim().max(160).optional(),
    phone: z.string().trim().max(40).optional(),
    testerProfile: cappedRecord(jsonValue, 100).optional(),
    clientProfile: cappedRecord(jsonValue, 100).optional(),
  })
  .strict();

export const exportLogSchema = z.object({ format: EXPORT_FORMAT }).strict();

export const aiTestSchema = z
  .object({
    provider: PROVIDER.optional(),
    apiKey: z.string().max(2000).optional(),
    model: MODEL.optional(),
  })
  .strict();

export function parseBody<T>(schema: z.ZodType<T>, data: unknown, what = "request"): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    const fields = parsed.error.issues.map((i) => i.path.join(".") || "(root)").slice(0, 5);
    throw badRequest(`Invalid ${what}: ${fields.join(", ")}`);
  }
  return parsed.data;
}

export function parseIdParam(value: string, what = "id"): string {
  const parsed = DOCUMENT_ID.safeParse(value);
  if (!parsed.success) throw badRequest(`Invalid ${what}.`);
  return parsed.data;
}

export function parseListQuery(query: (name: string) => string | undefined): { workspaceId?: string; limit: number } {
  const rawWorkspace = query("workspaceId");
  const workspaceId =
    rawWorkspace && rawWorkspace !== "default" && rawWorkspace !== "primary" ? rawWorkspace : rawWorkspace;
  if (workspaceId !== undefined) {
    const checked = z.string().max(120).regex(/^[A-Za-z0-9_-]+$/).safeParse(workspaceId);
    if (!checked.success) throw badRequest("Invalid workspaceId.");
  }
  const rawLimit = query("limit");
  let limit = 200;
  if (rawLimit !== undefined) {
    const n = Number(rawLimit);
    if (!Number.isInteger(n) || n < 1 || n > 200) throw badRequest("Invalid limit (1-200).");
    limit = n;
  }
  return { workspaceId, limit };
}

// ---------------------------------------------------------------------------
// AI input guards.
// ---------------------------------------------------------------------------

export const MAX_SOURCE_JSON_BYTES = 100 * 1024;
export const MAX_SOURCE_KEYS = 300;
export const MAX_SOURCE_DEPTH = 6;
export const MAX_SOURCE_STRING = 20000;

function sourceDepth(value: unknown, depth = 0): number {
  if (value !== null && typeof value === "object") {
    if (depth >= MAX_SOURCE_DEPTH) return depth + 1;
    const values = Array.isArray(value) ? value : Object.values(value as Record<string, unknown>);
    let max = depth;
    for (const v of values) max = Math.max(max, sourceDepth(v, depth + 1));
    return max;
  }
  return depth;
}

function countSourceKeys(value: unknown): number {
  if (value !== null && typeof value === "object") {
    let n = Array.isArray(value) ? 0 : Object.keys(value as Record<string, unknown>).length;
    for (const v of Object.values(value as Record<string, unknown>)) n += countSourceKeys(v);
    return n;
  }
  return 0;
}

/** Rejects oversized/deep generation sources before they reach the model. */
export function assertSafeSource(source: Record<string, unknown>): void {
  const bytes = JSON.stringify(source).length;
  if (bytes > MAX_SOURCE_JSON_BYTES) {
    throw badRequest(`Generation input exceeds the ${MAX_SOURCE_JSON_BYTES / 1024}KB limit.`);
  }
  if (countSourceKeys(source) > MAX_SOURCE_KEYS) {
    throw badRequest("Generation input has too many fields.");
  }
  if (sourceDepth(source) > MAX_SOURCE_DEPTH) {
    throw badRequest("Generation input is nested too deeply.");
  }
  const stack: unknown[] = [source];
  while (stack.length > 0) {
    const current = stack.pop();
    if (typeof current === "string") {
      if (current.length > MAX_SOURCE_STRING) throw badRequest("A generation field exceeds the length limit.");
    } else if (current !== null && typeof current === "object") {
      for (const v of Object.values(current as Record<string, unknown>)) stack.push(v);
    }
  }
}

// ---------------------------------------------------------------------------
// Origin allowlist (strict CORS).
// ---------------------------------------------------------------------------

const PRODUCTION_SUFFIXES = [".draftoryn.com", ".pages.dev"];

export function allowedOrigins(): string[] {
  const extra = (process.env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return extra;
}

export function isOriginAllowed(origin: string | null | undefined): boolean {
  if (!origin) return true; // non-browser clients (curl, native) carry no Origin
  for (const allowed of allowedOrigins()) {
    if (origin === allowed) return true;
  }
  try {
    const url = new URL(origin);
    if (!isProduction() && (url.hostname === "localhost" || url.hostname === "127.0.0.1")) return true;
    if (url.protocol !== "https:" && isProduction()) return false;
    if (PRODUCTION_SUFFIXES.some((suffix) => url.hostname.endsWith(suffix))) return true;
  } catch {
    return false;
  }
  return false;
}

// ---------------------------------------------------------------------------
// Rate limiting (in-memory token bucket; per isolate/worker).
// ---------------------------------------------------------------------------

export interface RateLimitOptions {
  windowMs: number;
  max: number;
}

export class RateLimiter {
  private readonly hits = new Map<string, number[]>();
  constructor(private readonly windowMs: number, private readonly max: number) {}

  take(key: string, now = Date.now()): { allowed: boolean; retryAfterSec: number } {
    const cutoff = now - this.windowMs;
    const existing = this.hits.get(key);
    const recent = existing ? existing.filter((t) => t > cutoff) : [];
    if (recent.length >= this.max) {
      const oldest = recent[0] ?? now;
      return { allowed: false, retryAfterSec: Math.max(1, Math.ceil((oldest + this.windowMs - now) / 1000)) };
    }
    recent.push(now);
    this.hits.set(key, recent);
    if (this.hits.size > 10000) {
      const first = this.hits.keys().next();
      if (!first.done) this.hits.delete(first.value);
    }
    return { allowed: true, retryAfterSec: 0 };
  }
}

export function clientKey(c: Context, scope: string): string {
  const ip =
    c.req.header("cf-connecting-ip") ??
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown";
  return `${scope}:${ip}`;
}

export function rateLimit(limiter: RateLimiter, scope: string, keyFn?: (c: Context) => string) {
  return async (c: Context, next: Next) => {
    const key = keyFn ? keyFn(c) : clientKey(c, scope);
    const result = limiter.take(key);
    if (!result.allowed) {
      logSecurityEvent("rate_limited", { route: c.req.path, scope });
      c.header("Retry-After", String(result.retryAfterSec));
      return c.json({ error: `Too many requests. Please retry in ${result.retryAfterSec} seconds.` }, 429);
    }
    await next();
  };
}

// ---------------------------------------------------------------------------
// Security headers for JSON API responses.
// ---------------------------------------------------------------------------

export async function securityHeaders(c: Context, next: Next): Promise<void> {
  await next();
  c.header("X-Content-Type-Options", "nosniff");
  c.header("Referrer-Policy", "no-referrer");
  c.header("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");
  c.header("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'");
  c.header("Cache-Control", "no-store");
  c.header("Vary", "Origin");
  try {
    if (new URL(c.req.url).protocol === "https:") {
      c.header("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
    }
  } catch {
    // ignore URL parse failures for header purposes
  }
}

// ---------------------------------------------------------------------------
// Redacted structured logging (server-side only; never returned to clients).
// ---------------------------------------------------------------------------

const SENSITIVE_KEYS = [
  "password",
  "apikey",
  "api_key",
  "authorization",
  "token",
  "secret",
  "credential",
  "privatekey",
  "clientsecret",
];

function redactValue(key: string, value: unknown, depth: number): unknown {
  if (depth > 4) return "[truncated]";
  const normalized = key.toLowerCase().replace(/[_-]/g, "");
  if (SENSITIVE_KEYS.some((s) => normalized.includes(s))) return "[redacted]";
  if (typeof value === "string") {
    const singleLine = value.replace(/[\r\n]+/g, " ");
    return singleLine.length > 500 ? `${singleLine.slice(0, 500)}…[truncated]` : singleLine;
  }
  if (Array.isArray(value)) return value.slice(0, 20).map((v) => redactValue(key, v, depth + 1));
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>).slice(0, 50)) {
      out[k] = redactValue(k, v, depth + 1);
    }
    return out;
  }
  return value;
}

export function logSecurityEvent(
  type: string,
  fields: Record<string, unknown> = {},
): void {
  try {
    const entry = {
      level: type === "server_error" ? "error" : "warn",
      event: "security",
      type,
      at: new Date().toISOString(),
      ... (redactValue("", fields, 0) as Record<string, unknown>),
    };
    if (entry.level === "error") {
      console.error(JSON.stringify(entry));
    } else {
      console.warn(JSON.stringify(entry));
    }
  } catch {
    // logging must never break request handling
  }
}

/** Validates provider/model/apiKey triple for AI calls. */
export function assertValidAiOptions(opts: {
  provider?: unknown;
  model?: unknown;
  apiKey?: unknown;
}): { provider: AiProviderType; model?: string; apiKey?: string } {
  const provider = opts.provider === undefined ? "openai" : opts.provider;
  if (typeof provider !== "string" || !(provider in AI_PROVIDERS)) {
    throw badRequest("Invalid AI provider.");
  }
  let model: string | undefined;
  if (opts.model !== undefined) {
    const parsed = MODEL.safeParse(opts.model);
    if (!parsed.success) throw badRequest("Invalid AI model.");
    model = parsed.data;
  }
  let apiKey: string | undefined;
  if (opts.apiKey !== undefined) {
    if (typeof opts.apiKey !== "string" || opts.apiKey.length > 2000) {
      throw badRequest("Invalid API key.");
    }
    apiKey = opts.apiKey;
  }
  return { provider: provider as AiProviderType, model, apiKey };
}
