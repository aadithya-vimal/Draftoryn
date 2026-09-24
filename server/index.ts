// Ensure process.env is safely defined in edge/worker environments
if (typeof globalThis.process === "undefined") {
  (globalThis as any).process = { env: {} };
} else if (!globalThis.process.env) {
  (globalThis.process as any).env = {};
}

import { Hono } from "hono";
import type { Context } from "hono";
import { z } from "zod";

import { verifyToken } from "@clerk/backend";
import { runGeneration, resolveProviderKey } from "./generate";
import { AI_PROVIDERS, type AiProviderType, executeAiCall } from "../src/engine/ai/providers";
import {
  getOrCreateUser,
  updateUserOnboarding,
  getUserSettings,
  putUserSettings,
  getWorkspaces,
  createWorkspace,
  updateWorkspace,
  setDefaultWorkspace,
  deleteWorkspace,
  listDocuments,
  getDocument,
  putDocument,
  deleteDocument,
  listDocumentVersions,
  logDocumentExport,
  listDocumentExports,
} from "./neon";
import {
  createAnalysis,
  createJobRow,
  deleteAnalysis,
  getAnalysis,
  getArtifactRow,
  getCandidateRow,
  getJobRow,
  insertArtifactRow,
  insertEvidenceRow,
  listAnalyses,
  listArtifactRows,
  listCandidateRows,
  listConfirmedRows,
  listConflictRows,
  listEvidenceDetail,
  listEvidenceRows,
  listReports,
  saveAnalysisGraph,
  saveConfirmedFinding,
  saveReport,
  updateCandidate,
  updateJobRow,
} from "./neon-intelligence";
import { analyzeArtifacts, sha256HexBytes } from "../src/intelligence/analysis/index";
import {
  MAX_FILE_BYTES,
  MAX_TEXT_CHARS,
  sniffBytes,
} from "../src/intelligence/ingestion/identify";
import { sanitizeFilename } from "../src/intelligence/utils";
import { defaultStorageProvider, NeonBlobProvider, R2StorageProvider } from "../src/intelligence/storage/index";
import { intelSql } from "./neon-intelligence";
import { buildReport } from "../src/intelligence/reporting/synthesize";
import { describeImage, supportsVision } from "../src/intelligence/ai/vision";
import { assistFinding, draftExecutiveSummary } from "../src/intelligence/ai/assist";
import type { ConfirmedFinding } from "../src/intelligence/schemas/index";
import {
  MAX_GENERATE_JSON_BYTES,
  RateLimiter,
  aiTestSchema,
  allowDevAuth,
  assertSafeSource,
  assertValidAiOptions,
  documentRecordSchema,
  exportLogSchema,
  generateBodySchema,
  isOriginAllowed,
  logSecurityEvent,
  onboardingSchema,
  parseBody,
  parseIdParam,
  parseListQuery,
  rateLimit,
  readJsonBody,
  securityHeaders,
  settingsSchema,
  toSafeError,
  unauthorized,
  workspaceCreateSchema,
  workspaceUpdateSchema,
} from "./security";

const app = new Hono<{ Bindings: Record<string, string> }>();

// Populate process.env with Cloudflare Worker bindings/secrets
app.use("*", async (c, next) => {
  if (c.env && typeof c.env === "object") {
    Object.assign(globalThis.process.env, c.env);
  }
  await next();
});

app.use("*", securityHeaders);

// Strict CORS: only allowlisted origins receive ACAO headers. Requests with
// a disallowed Origin are rejected outright (fail closed). Non-browser
// clients send no Origin and are unaffected. Clerk uses Bearer tokens, not
// cookies, so no Allow-Credentials header is ever emitted (CSRF N/A).
app.use("*", async (c, next) => {
  const origin = c.req.header("Origin") ?? c.req.header("origin");
  if (c.req.method === "OPTIONS") {
    if (origin && !isOriginAllowed(origin)) {
      logSecurityEvent("cors_rejected", { route: c.req.path });
      return c.json({ error: "Origin not allowed." }, 403);
    }
    if (origin) c.header("Access-Control-Allow-Origin", origin);
    c.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    c.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    c.header("Access-Control-Max-Age", "86400");
    return c.body(null, 204);
  }
  if (origin) {
    if (!isOriginAllowed(origin)) {
      logSecurityEvent("cors_rejected", { route: c.req.path });
      return c.json({ error: "Origin not allowed." }, 403);
    }
    c.header("Access-Control-Allow-Origin", origin);
  }
  await next();
});

// Global flood protection (per IP). Expensive endpoints add stricter,
// user-scoped limits inside their handlers.
const globalLimiter = new RateLimiter(60_000, 300);
app.use("*", rateLimit(globalLimiter, "global"));

const writeLimiter = new RateLimiter(60_000, 120);
const generateLimiter = new RateLimiter(60_000, 30);
const aiTestLimiter = new RateLimiter(60_000, 10);

class RateLimitExceeded extends Error {
  readonly retryAfterSec: number;
  constructor(retryAfterSec: number) {
    super(`Too many requests. Please retry in ${retryAfterSec} seconds.`);
    this.retryAfterSec = retryAfterSec;
  }
}

function checkUserRateLimit(limiter: RateLimiter, scope: string, userId: string): void {
  const result = limiter.take(`${scope}:${userId}`);
  if (!result.allowed) {
    logSecurityEvent("rate_limited", { scope });
    throw new RateLimitExceeded(result.retryAfterSec);
  }
}

type ErrorStatus = 400 | 401 | 403 | 404 | 409 | 413 | 429 | 500;

function sendError(c: Context, e: unknown, route: string, generationRoute = false): Response {
  if (e instanceof RateLimitExceeded) {
    c.header("Retry-After", String(e.retryAfterSec));
    return c.json({ error: e.message }, 429);
  }
  const safe = toSafeError(e, route);
  const status = (safe.status >= 400 && safe.status <= 599 ? safe.status : 500) as ErrorStatus;
  // Generation failures must not leak provider internals to clients.
  const message = status === 500 && generationRoute ? "Generation failed. Please try again." : safe.message;
  return c.json({ error: message }, status);
}

// Last-resort guard: never leak internals, even for uncaught throws.
app.onError((e, c) => sendError(c, e, c.req.path));

interface AuthUserClaims {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
}

async function authenticate(c: {
  req: { header: (k: string) => string | undefined };
}): Promise<{ userId: string; claims?: AuthUserClaims } | null> {
  const auth = c.req.header("Authorization");
  if (auth && auth.startsWith("Bearer ")) {
    const token = auth.slice(7, 7 + 4096);
    if (token.length > 0) {
      try {
        if (process.env.CLERK_SECRET_KEY) {
          const claims = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
          if (claims?.sub) {
            return {
              userId: claims.sub,
              claims: {
                sub: claims.sub,
                email: typeof claims.email === "string" ? claims.email : undefined,
                name: typeof claims.name === "string" ? claims.name : undefined,
                picture: typeof claims.picture === "string" ? claims.picture : undefined,
              },
            };
          }
        }
      } catch {
        // Token verification failed — fall through to rejection below.
      }
    }
  }

  // Fail closed: without a Clerk secret there is no verifier. A local
  // identity is ONLY issued with an explicit opt-in outside production.
  if (!process.env.CLERK_SECRET_KEY) {
    if (allowDevAuth()) {
      return {
        userId: "dev_user",
        claims: {
          sub: "dev_user",
          email: "dev@draftoryn.local",
          name: "Security Lead",
        },
      };
    }
    logSecurityEvent("auth_misconfigured", {});
    return null;
  }
  return null;
}

async function requireAuth(c: {
  req: { header: (k: string) => string | undefined };
}): Promise<{ userId: string; claims?: AuthUserClaims }> {
  const auth = await authenticate(c);
  if (!auth) {
    logSecurityEvent("auth_failure", {});
    throw unauthorized();
  }
  return auth;
}

// ---------------------------------------------------------------------------
// Health & Diagnostic Endpoints
// ---------------------------------------------------------------------------
app.get("/", (c) => c.json({ product: "Draftoryn", status: "ok" }));
app.get("/api/health", (c) => c.json({ product: "Draftoryn", status: "ok" }));

// ---------------------------------------------------------------------------
// User & Onboarding Endpoints (Authoritative in Neon)
// ---------------------------------------------------------------------------
app.get("/api/user/me", async (c) => {
  try {
    const auth = await requireAuth(c);
    const data = await getOrCreateUser(auth.userId, {
      email: auth.claims?.email,
      name: auth.claims?.name,
      avatarUrl: auth.claims?.picture,
    });
    return c.json(data);
  } catch (e) {
    return sendError(c, e, "/api/user/me");
  }
});

app.post("/api/user/onboarding", async (c) => {
  try {
    const auth = await requireAuth(c);
    const body = parseBody(onboardingSchema, await readJsonBody(c), "onboarding data");
    const updated = await updateUserOnboarding(auth.userId, body);
    return c.json(updated);
  } catch (e) {
    return sendError(c, e, "/api/user/onboarding");
  }
});

// ---------------------------------------------------------------------------
// Settings Endpoints (Authoritative in Neon)
// ---------------------------------------------------------------------------
app.get("/api/settings", async (c) => {
  try {
    const auth = await requireAuth(c);
    const settings = await getUserSettings(auth.userId);
    return c.json(settings);
  } catch (e) {
    return sendError(c, e, "/api/settings");
  }
});

app.put("/api/settings", async (c) => {
  try {
    const auth = await requireAuth(c);
    const body = parseBody(settingsSchema, await readJsonBody(c), "settings");
    const updated = await putUserSettings(auth.userId, body);
    return c.json(updated);
  } catch (e) {
    return sendError(c, e, "PUT /api/settings");
  }
});

// ---------------------------------------------------------------------------
// Workspaces Endpoints (Authoritative in Neon)
// ---------------------------------------------------------------------------
app.get("/api/workspaces", async (c) => {
  try {
    const auth = await requireAuth(c);
    const workspaces = await getWorkspaces(auth.userId);
    return c.json(workspaces);
  } catch (e) {
    return sendError(c, e, "/api/workspaces");
  }
});

app.post("/api/workspaces", async (c) => {
  try {
    const auth = await requireAuth(c);
    const body = parseBody(workspaceCreateSchema, await readJsonBody(c), "workspace");
    const ws = await createWorkspace(auth.userId, body.name.trim(), body.slug, body.settings);
    return c.json(ws);
  } catch (e) {
    return sendError(c, e, "POST /api/workspaces");
  }
});

app.patch("/api/workspaces/:id", async (c) => {
  try {
    const auth = await requireAuth(c);
    const workspaceId = parseIdParam(c.req.param("id"), "workspace id");
    const body = parseBody(workspaceUpdateSchema, await readJsonBody(c), "workspace update");
    const ws = await updateWorkspace(auth.userId, workspaceId, body);
    return c.json(ws);
  } catch (e) {
    return sendError(c, e, "PATCH /api/workspaces/:id");
  }
});

app.post("/api/workspaces/:id/default", async (c) => {
  try {
    const auth = await requireAuth(c);
    const workspaceId = parseIdParam(c.req.param("id"), "workspace id");
    const ws = await setDefaultWorkspace(auth.userId, workspaceId);
    return c.json(ws);
  } catch (e) {
    return sendError(c, e, "POST /api/workspaces/:id/default");
  }
});

app.delete("/api/workspaces/:id", async (c) => {
  try {
    const auth = await requireAuth(c);
    const workspaceId = parseIdParam(c.req.param("id"), "workspace id");
    const result = await deleteWorkspace(auth.userId, workspaceId);
    return c.json(result);
  } catch (e) {
    return sendError(c, e, "DELETE /api/workspaces/:id");
  }
});

// ---------------------------------------------------------------------------
// Generation Endpoint
// ---------------------------------------------------------------------------
app.post("/api/generate", async (c) => {
  try {
    const auth = await requireAuth(c);
    checkUserRateLimit(generateLimiter, "generate", auth.userId);
    const body = parseBody(generateBodySchema, await readJsonBody(c, MAX_GENERATE_JSON_BYTES), "generation request");

    const { provider, model, apiKey } = assertValidAiOptions({
      provider: body.provider,
      model: body.model,
      apiKey: body.apiKey,
    });
    if (body.source) assertSafeSource(body.source as Record<string, unknown>);

    const doc = await runGeneration(body.definitionId, (body.source ?? {}) as Record<string, unknown>, {
      sectionId: body.sectionId,
      useAi: Boolean(body.useAi),
      provider,
      model,
      apiKey,
    });
    return c.json(doc);
  } catch (e) {
    return sendError(c, e, "/api/generate", true);
  }
});

// ---------------------------------------------------------------------------
// AI Providers & Diagnostics Endpoints
// ---------------------------------------------------------------------------
app.get("/api/ai/providers", async (c) => {
  try {
    await requireAuth(c);
    const providers = (Object.keys(AI_PROVIDERS) as AiProviderType[]).map((id) => {
      const info = AI_PROVIDERS[id];
      const { apiKey } = resolveProviderKey(id);
      return {
        id,
        name: info.name,
        defaultModel: info.defaultModel,
        models: info.models,
        description: info.description,
        docsUrl: info.docsUrl,
        isConfiguredOnServer: Boolean(apiKey),
      };
    });
    return c.json({ providers });
  } catch (e) {
    return sendError(c, e, "/api/ai/providers");
  }
});

app.post("/api/ai/test", async (c) => {
  try {
    const auth = await requireAuth(c);
    checkUserRateLimit(aiTestLimiter, "ai_test", auth.userId);
    const body = parseBody(aiTestSchema, await readJsonBody(c), "AI test request");

    const provider: AiProviderType = body.provider || "openai";
    const { provider: validProvider, model: validModel, apiKey: clientKeyValue } = assertValidAiOptions({
      provider,
      model: body.model,
      apiKey: body.apiKey,
    });
    const { apiKey } = resolveProviderKey(validProvider, clientKeyValue);
    if (!apiKey) {
      return c.json({
        success: false,
        error: `No API key provided or configured on server for "${AI_PROVIDERS[validProvider]?.name ?? validProvider}".`,
      }, 400);
    }

    const model = validModel?.trim() || AI_PROVIDERS[validProvider].defaultModel;
    const start = Date.now();
    try {
      await executeAiCall({
        provider: validProvider,
        model,
        apiKey,
        systemPrompt: "You are an automated connectivity testing service. Output strictly valid JSON.",
        userPrompt: "Respond with {\"status\": \"ok\", \"verified\": true}",
        schema: "{\"type\": \"object\", \"required\": [\"status\", \"verified\"], \"properties\": {\"status\": {\"type\": \"string\"}, \"verified\": {\"type\": \"boolean\"}}}",
        temperature: 0.1,
      });
      const latencyMs = Date.now() - start;
      return c.json({
        success: true,
        provider: validProvider,
        model,
        latencyMs,
        message: `Successfully connected to ${AI_PROVIDERS[validProvider].name} (${model}) in ${latencyMs}ms.`,
      });
    } catch {
      logSecurityEvent("ai_test_failure", { provider: validProvider });
      return c.json({ success: false, provider: validProvider, model, error: "Connection test failed." }, 500);
    }
  } catch (e) {
    return sendError(c, e, "/api/ai/test");
  }
});

// ---------------------------------------------------------------------------
// Documents Endpoints (Authoritative in Neon with Workspace Scoping)
// ---------------------------------------------------------------------------
app.get("/api/documents", async (c) => {
  try {
    const auth = await requireAuth(c);
    const { workspaceId, limit } = parseListQuery((name) => c.req.query(name));
    const docs = await listDocuments(auth.userId, workspaceId, limit);
    return c.json(docs);
  } catch (e) {
    return sendError(c, e, "/api/documents");
  }
});

app.post("/api/documents", async (c) => {
  try {
    const auth = await requireAuth(c);
    checkUserRateLimit(writeLimiter, "docwrite", auth.userId);
    const record = parseBody(documentRecordSchema, await readJsonBody(c), "document");

    // Ownership is derived exclusively from the verified token — any
    // client-supplied ownerId is discarded before persistence. The neon
    // layer additionally refuses ids owned by another tenant (no oracle:
    // cross-tenant ids surface as 404).
    const sanitized = { ...record, ownerId: auth.userId };
    await putDocument(auth.userId, sanitized as never, record.workspaceId as string | undefined);
    return c.json(sanitized);
  } catch (e) {
    return sendError(c, e, "POST /api/documents");
  }
});

app.get("/api/documents/:id", async (c) => {
  try {
    const auth = await requireAuth(c);
    const id = parseIdParam(c.req.param("id"), "document id");
    const doc = await getDocument(auth.userId, id);
    // Uniform 404 for missing and foreign documents (no existence oracle).
    if (!doc) {
      logSecurityEvent("doc_access_denied", { route: "GET /api/documents/:id" });
      return c.json({ error: "Document not found" }, 404);
    }
    return c.json(doc);
  } catch (e) {
    return sendError(c, e, "GET /api/documents/:id");
  }
});

app.put("/api/documents/:id", async (c) => {
  try {
    const auth = await requireAuth(c);
    checkUserRateLimit(writeLimiter, "docwrite", auth.userId);
    const record = parseBody(documentRecordSchema, await readJsonBody(c), "document");
    const id = parseIdParam(c.req.param("id"), "document id");

    const existing = await getDocument(auth.userId, id);
    if (!existing) {
      logSecurityEvent("doc_access_denied", { route: "PUT /api/documents/:id" });
      return c.json({ error: "Document not found or unauthorized" }, 404);
    }

    const sanitized = { ...record, id, ownerId: auth.userId };
    await putDocument(auth.userId, sanitized as never, record.workspaceId as string | undefined);
    return c.json(sanitized);
  } catch (e) {
    return sendError(c, e, "PUT /api/documents/:id");
  }
});

app.delete("/api/documents/:id", async (c) => {
  try {
    const auth = await requireAuth(c);
    const id = parseIdParam(c.req.param("id"), "document id");
    await deleteDocument(auth.userId, id);
    return c.json({ ok: true });
  } catch (e) {
    return sendError(c, e, "DELETE /api/documents/:id");
  }
});

// ---------------------------------------------------------------------------
// Version History & Export Logging Endpoints (Authoritative in Neon)
// ---------------------------------------------------------------------------
app.get("/api/documents/:id/versions", async (c) => {
  try {
    const auth = await requireAuth(c);
    const id = parseIdParam(c.req.param("id"), "document id");
    const versions = await listDocumentVersions(auth.userId, id);
    return c.json(versions);
  } catch (e) {
    return sendError(c, e, "GET /api/documents/:id/versions");
  }
});

app.post("/api/documents/:id/exports", async (c) => {
  try {
    const auth = await requireAuth(c);
    const id = parseIdParam(c.req.param("id"), "document id");
    const body = parseBody(exportLogSchema, await readJsonBody(c), "export log");
    const exp = await logDocumentExport(auth.userId, id, body.format);
    return c.json(exp);
  } catch (e) {
    return sendError(c, e, "POST /api/documents/:id/exports");
  }
});

app.get("/api/documents/:id/exports", async (c) => {
  try {
    const auth = await requireAuth(c);
    const id = parseIdParam(c.req.param("id"), "document id");
    const exportsList = await listDocumentExports(auth.userId, id);
    return c.json(exportsList);
  } catch (e) {
    return sendError(c, e, "GET /api/documents/:id/exports");
  }
});

// ---------------------------------------------------------------------------
// Document Intelligence Endpoints (analyses, artifacts, findings, reports)
// ---------------------------------------------------------------------------
const analysisLimiter = new RateLimiter(60_000, 20);
const uploadLimiter = new RateLimiter(60_000, 30);

let _storage: ReturnType<typeof defaultStorageProvider> | null = null;
function storage(): ReturnType<typeof defaultStorageProvider> {
  if (_storage) return _storage;
  // Durability chain: R2 (configured) → Neon BYTEA (DATABASE_URL) → memory.
  // Memory is per-isolate best-effort; Neon/R2 survive restarts and refresh.
  const r2 = new R2StorageProvider();
  if (r2.configured()) {
    _storage = r2;
    return _storage;
  }
  if (process.env.DATABASE_URL) {
    try {
      const sql = intelSql();
      _storage = new NeonBlobProvider(sql);
      return _storage;
    } catch {
      // Fall through to memory when the database is unreachable.
    }
  }
  _storage = defaultStorageProvider();
  return _storage;
}

const analysisCreateSchema = z
  .object({
    name: z.string().min(1).max(200),
    reportType: z.string().max(80).optional(),
    workspaceId: z.string().max(120).optional(),
    engagement: z.record(z.unknown()).optional(),
  })
  .strict();

const artifactUploadSchema = z
  .object({
    filename: z.string().min(1).max(255),
    mediaType: z.string().min(1).max(127),
    content: z.string().max(10 * 1024 * 1024),
    encoding: z.enum(["text", "base64"]).optional(),
  })
  .strict();

function decodeBase64Bytes(b64: string): Uint8Array {
  if (!/^[A-Za-z0-9+/=\s]*$/.test(b64)) throw new Error("Invalid base64 content.");
  const bin = (globalThis as unknown as { atob: (s: string) => string }).atob(b64.replace(/\s+/g, ""));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

app.post("/api/analyses", async (c) => {
  try {
    const auth = await requireAuth(c);
    checkUserRateLimit(writeLimiter, "analysis", auth.userId);
    const body = parseBody(analysisCreateSchema, await readJsonBody(c), "analysis");
    const row = await createAnalysis(auth.userId, {
      name: body.name.trim(),
      reportType: body.reportType,
      workspaceId: body.workspaceId,
      engagement: body.engagement as Record<string, unknown> | undefined,
    });
    return c.json(row);
  } catch (e) {
    return sendError(c, e, "POST /api/analyses");
  }
});

app.get("/api/analyses", async (c) => {
  try {
    const auth = await requireAuth(c);
    return c.json(await listAnalyses(auth.userId));
  } catch (e) {
    return sendError(c, e, "GET /api/analyses");
  }
});

app.get("/api/analyses/:id", async (c) => {
  try {
    const auth = await requireAuth(c);
    const id = parseIdParam(c.req.param("id"), "analysis id");
    const row = await getAnalysis(auth.userId, id);
    if (!row) return c.json({ error: "Analysis not found" }, 404);
    return c.json(row);
  } catch (e) {
    return sendError(c, e, "GET /api/analyses/:id");
  }
});

app.delete("/api/analyses/:id", async (c) => {
  try {
    const auth = await requireAuth(c);
    const id = parseIdParam(c.req.param("id"), "analysis id");
    const existing = await getAnalysis(auth.userId, id);
    if (!existing) return c.json({ error: "Analysis not found" }, 404);
    // Remove stored blobs (best-effort) before cascading row deletion.
    for (const a of await listArtifactRows(auth.userId, id)) {
      if (a.storage_key) {
        try {
          await storage().remove(a.storage_key, auth.userId);
        } catch {
          // Blob cleanup must not block analysis deletion.
        }
      }
    }
    await deleteAnalysis(auth.userId, id);
    return c.json({ ok: true });
  } catch (e) {
    return sendError(c, e, "DELETE /api/analyses/:id");
  }
});

app.post("/api/analyses/:id/artifacts", async (c) => {
  try {
    const auth = await requireAuth(c);
    checkUserRateLimit(uploadLimiter, "artifact", auth.userId);
    const id = parseIdParam(c.req.param("id"), "analysis id");
    const body = parseBody(artifactUploadSchema, await readJsonBody(c, 4 * 1024 * 1024), "artifact");

    const safeName = sanitizeFilename(body.filename);
    if (body.content.length === 0) return c.json({ error: "Empty artifact." }, 400);
    const encoding = body.encoding ?? "text";
    const bytes = encoding === "base64" ? decodeBase64Bytes(body.content) : new TextEncoder().encode(body.content);
    if (bytes.length > MAX_FILE_BYTES) return c.json({ error: "Artifact exceeds the per-file size limit." }, 413);
    if (encoding === "text" && body.content.length > MAX_TEXT_CHARS) {
      return c.json({ error: "Text artifact exceeds the text size limit." }, 413);
    }
    const checksum = await sha256HexBytes(bytes);
    const sniffed = sniffBytes(bytes.slice(0, 64));
    const isDocx = safeName.toLowerCase().endsWith(".docx");
    if (sniffed?.archive && !isDocx) return c.json({ error: "Archives are not accepted; submit extracted files." }, 415);

    const stored = await storage().put(auth.userId, id, safeName, bytes, body.mediaType, checksum);
    const row = await insertArtifactRow(auth.userId, id, {
      filename: safeName,
      mediaType: sniffed && sniffed.binary && !body.mediaType.startsWith("text/") ? sniffed.mediaType : body.mediaType,
      size: bytes.length,
      checksum,
      storageKey: stored.storageKey,
    });
    return c.json({ ...row, checksum, size: bytes.length });
  } catch (e) {
    return sendError(c, e, "POST /api/analyses/:id/artifacts");
  }
});

app.get("/api/analyses/:id/artifacts", async (c) => {
  try {
    const auth = await requireAuth(c);
    const id = parseIdParam(c.req.param("id"), "analysis id");
    return c.json(await listArtifactRows(auth.userId, id));
  } catch (e) {
    return sendError(c, e, "GET /api/analyses/:id/artifacts");
  }
});

app.post("/api/analyses/:id/run", async (c) => {
  try {
    const auth = await requireAuth(c);
    checkUserRateLimit(analysisLimiter, "run", auth.userId);
    const id = parseIdParam(c.req.param("id"), "analysis id");
    const analysis = await getAnalysis(auth.userId, id);
    if (!analysis) return c.json({ error: "Analysis not found" }, 404);

    const job = await createJobRow(auth.userId, id, "analyze");
    try {
      await updateJobRow(auth.userId, job.id, "parsing");
      const rows = await listArtifactRows(auth.userId, id);
      if (rows.length === 0) throw new Error("No artifacts uploaded for this analysis.");
      const files: Array<{ filename: string; mediaType: string; text: string; size: number; checksum: string; bytes?: Uint8Array }> = [];
      for (const r of rows) {
        if (!r.storage_key) continue;
        const bytes = await storage().get(r.storage_key, auth.userId);
        if (!bytes) continue;
        const sniffed = sniffBytes(bytes.slice(0, 64));
        const binary = !!sniffed?.binary;
        files.push({
          filename: r.filename,
          mediaType: r.media_type,
          text: binary ? "" : new TextDecoder().decode(bytes),
          size: r.size_bytes,
          checksum: r.checksum,
          bytes,
        });
      }
      await updateJobRow(auth.userId, job.id, "analyzing");
      const graph = analyzeArtifacts(id, files, analysis.report_type);
      await updateJobRow(auth.userId, job.id, "validating");
      await saveAnalysisGraph(auth.userId, graph);
      await updateJobRow(auth.userId, job.id, "completed");
      return c.json({ jobId: job.id, summary: graph.summary });
    } catch (runErr) {
      await updateJobRow(auth.userId, job.id, "failed", runErr instanceof Error ? runErr.message : String(runErr));
      throw runErr;
    }
  } catch (e) {
    return sendError(c, e, "POST /api/analyses/:id/run");
  }
});

app.get("/api/analyses/:id/evidence", async (c) => {
  try {
    const auth = await requireAuth(c);
    const id = parseIdParam(c.req.param("id"), "analysis id");
    return c.json(await listEvidenceRows(auth.userId, id));
  } catch (e) {
    return sendError(c, e, "GET /api/analyses/:id/evidence");
  }
});

app.get("/api/analyses/:id/findings", async (c) => {
  try {
    const auth = await requireAuth(c);
    const id = parseIdParam(c.req.param("id"), "analysis id");
    return c.json({
      candidates: await listCandidateRows(auth.userId, id),
      confirmed: await listConfirmedRows(auth.userId, id),
    });
  } catch (e) {
    return sendError(c, e, "GET /api/analyses/:id/findings");
  }
});

app.get("/api/analyses/:id/conflicts", async (c) => {
  try {
    const auth = await requireAuth(c);
    const id = parseIdParam(c.req.param("id"), "analysis id");
    return c.json(await listConflictRows(auth.userId, id));
  } catch (e) {
    return sendError(c, e, "GET /api/analyses/:id/conflicts");
  }
});

const findingActionSchema = z
  .object({
    action: z.enum(["accept", "reject", "unverified", "edit", "merge", "split", "confirm"]),
    title: z.string().max(300).optional(),
    description: z.string().max(10000).optional(),
    severity: z.enum(["critical", "high", "medium", "low", "informational"]).optional(),
    ids: z.array(z.string().max(80)).max(50).optional(),
    primaryId: z.string().max(80).optional(),
    parts: z.array(z.object({ title: z.string().max(300), evidenceIds: z.array(z.string().max(80)).max(500) })).max(20).optional(),
    impact: z.string().max(5000).optional(),
    remediation: z.array(z.string().max(2000)).max(50).optional(),
    reproduction: z.array(z.string().max(2000)).max(50).optional(),
    references: z.array(z.string().max(500)).max(50).optional(),
    verificationState: z.enum(["confirmed", "unverified", "needs-review"]).optional(),
  })
  .strict();

app.patch("/api/analyses/:id/findings/:fid", async (c) => {
  try {
    const auth = await requireAuth(c);
    checkUserRateLimit(writeLimiter, "finding", auth.userId);
    const id = parseIdParam(c.req.param("id"), "analysis id");
    const fid = parseIdParam(c.req.param("fid"), "finding id");
    const body = parseBody(findingActionSchema, await readJsonBody(c), "finding action");

    switch (body.action) {
      case "accept":
        await updateCandidate(auth.userId, id, fid, { status: "accepted" });
        break;
      case "reject":
        await updateCandidate(auth.userId, id, fid, { status: "rejected" });
        break;
      case "unverified":
        await updateCandidate(auth.userId, id, fid, { status: "unverified" });
        break;
      case "edit":
        await updateCandidate(auth.userId, id, fid, {
          ...(body.title !== undefined ? { title: body.title } : {}),
          ...(body.description !== undefined ? { description: body.description } : {}),
          ...(body.severity !== undefined ? { severity: body.severity } : {}),
        });
        break;
      case "merge": {
        if (!body.ids || !body.primaryId) return c.json({ error: "Merge requires ids and primaryId." }, 400);
        const primary = await getCandidateRow(auth.userId, id, body.primaryId);
        if (!primary) return c.json({ error: "Finding not found" }, 404);
        const primaryEvidence = new Set<string>(JSON.parse(String(primary["evidence_ids"] ?? "[]")) as string[]);
        const primaryAssets = new Set<string>(JSON.parse(String(primary["affected_assets"] ?? "[]")) as string[]);
        for (const otherId of body.ids) {
          if (otherId === body.primaryId) continue;
          const other = await getCandidateRow(auth.userId, id, otherId);
          if (!other) continue;
          for (const e of JSON.parse(String(other["evidence_ids"] ?? "[]")) as string[]) primaryEvidence.add(e);
          for (const a of JSON.parse(String(other["affected_assets"] ?? "[]")) as string[]) primaryAssets.add(a);
          await updateCandidate(auth.userId, id, otherId, { status: "merged", duplicateOf: body.primaryId });
        }
        // Source records preserved: union persisted on the primary.
        await updateCandidate(auth.userId, id, body.primaryId, {
          status: "accepted",
          evidenceIds: [...primaryEvidence],
          affectedAssets: [...primaryAssets],
        });
        break;
      }
      case "split": {
        if (!body.parts || body.parts.length < 2) return c.json({ error: "Split requires at least two parts." }, 400);
        await updateCandidate(auth.userId, id, fid, { status: "split" });
        break;
      }
      case "confirm": {
        if (!body.impact?.trim() || !body.remediation || body.remediation.length === 0) {
          return c.json({ error: "Confirmation requires impact and at least one remediation step." }, 400);
        }
        const row = await getCandidateRow(auth.userId, id, fid);
        if (!row) return c.json({ error: "Finding not found" }, 404);
        const affected = JSON.parse(String(row["affected_assets"] ?? "[]")) as string[];
        if (affected.length === 0) return c.json({ error: "Affected asset is required to confirm a finding." }, 400);
        const evidence = JSON.parse(String(row["evidence_ids"] ?? "[]")) as string[];
        const existing = await listConfirmedRows(auth.userId, id);
        const reference = `F-${String(existing.length + 1).padStart(3, "0")}`;
        const confirmed: ConfirmedFinding = {
          id: fid.replace(/^fc_/, "f_"),
          findingCandidateId: fid,
          reference,
          title: String(row["title"] ?? ""),
          severity: (row["severity"] as ConfirmedFinding["severity"]) ?? "medium",
          affectedAssets: affected,
          description: String(row["description"] ?? ""),
          impact: body.impact,
          evidence,
          reproduction: body.reproduction ?? [],
          remediation: body.remediation,
          references: body.references ?? [],
          confidence: (row["confidence"] as ConfirmedFinding["confidence"]) ?? "medium",
          verificationState: body.verificationState ?? "needs-review",
          taxonomyMappings: JSON.parse(String((row["taxonomy_mappings"] as string) ?? "{}")) as ConfirmedFinding["taxonomyMappings"],
        };
        await saveConfirmedFinding(auth.userId, id, {
          ...confirmed,
          taxonomyMappings: confirmed.taxonomyMappings as unknown as Record<string, unknown>,
        } as never);
        await updateCandidate(auth.userId, id, fid, { status: "accepted" });
        break;
      }
    }
    return c.json({ ok: true });
  } catch (e) {
    return sendError(c, e, "PATCH /api/analyses/:id/findings/:fid");
  }
});

const reportCreateSchema = z
  .object({
    view: z.enum(["executive", "technical", "full", "remediation", "retest"]).optional(),
    engagement: z.record(z.unknown()).optional(),
  })
  .strict();

app.post("/api/analyses/:id/reports", async (c) => {
  try {
    const auth = await requireAuth(c);
    checkUserRateLimit(analysisLimiter, "report", auth.userId);
    const id = parseIdParam(c.req.param("id"), "analysis id");
    const analysis = await getAnalysis(auth.userId, id);
    if (!analysis) return c.json({ error: "Analysis not found" }, 404);
    const body = parseBody(reportCreateSchema, await readJsonBody(c), "report request");

    const confirmedRows = (await listConfirmedRows(auth.userId, id)) as Array<Record<string, unknown>>;
    const evidenceRows = (await listEvidenceRows(auth.userId, id, 500)) as Array<Record<string, unknown>>;
    const artifactRows = await listArtifactRows(auth.userId, id);
    const findings: ConfirmedFinding[] = confirmedRows.map((r) => ({
      id: String(r["id"]),
      findingCandidateId: String(r["finding_candidate_id"]),
      reference: String(r["reference"]),
      title: String(r["title"]),
      severity: r["severity"] as ConfirmedFinding["severity"],
      affectedAssets: JSON.parse(String(r["affected_assets"] ?? "[]")) as string[],
      description: String(r["description"] ?? ""),
      impact: String(r["impact"] ?? ""),
      evidence: JSON.parse(String(r["evidence"] ?? "[]")) as string[],
      reproduction: JSON.parse(String(r["reproduction"] ?? "[]")) as string[],
      remediation: JSON.parse(String(r["remediation"] ?? "[]")) as string[],
      references: JSON.parse(String(r["refs"] ?? "[]")) as string[],
      confidence: r["confidence"] as ConfirmedFinding["confidence"],
      verificationState: r["verification_state"] as ConfirmedFinding["verificationState"],
      taxonomyMappings: JSON.parse(String(r["taxonomy_mappings"] ?? "{}")) as ConfirmedFinding["taxonomyMappings"],
    }));
    const graph = {
      analysisId: id,
      createdAt: new Date().toISOString(),
      artifacts: artifactRows.map((a) => ({
        artifactId: a.id,
        filename: a.filename,
        artifactType: a.artifact_type,
        parserId: a.parser,
        parserVersion: "1.0.0",
        classification: { label: a.artifact_type, confidence: 0.5, basis: "stored", reviewRecommended: true },
        warnings: [],
      })),
      evidence: evidenceRows.map((e) => ({
        id: String(e["id"]),
        sourceArtifactId: String(e["source_artifact_id"]),
        sourceLocation: String(e["source_location"] ?? ""),
        evidenceType: e["evidence_type"],
        title: String(e["title"] ?? ""),
        content: "",
        structuredData: {},
        extractedAt: new Date().toISOString(),
        confidence: e["confidence"],
        sensitivity: "internal",
        redactionState: "original",
        evidenceLevel: e["evidence_level"],
      })),
      assets: [],
      observations: [],
      candidates: [],
      conflicts: [],
      completeness: [],
      summary: { filesAnalyzed: 0, filesFailed: 0, duplicateFiles: 0, assetsIdentified: 0, observationsExtracted: 0, candidatesProposed: 0, duplicatesMerged: 0, conflictsOpen: 0, missingItems: 0, standardsMapped: [] },
      fileChecksums: {},
    };
    const engagement = (body.engagement ?? {}) as Record<string, string | string[]>;
    const report = buildReport(
      graph as never,
      findings,
      {
        client: typeof engagement["client"] === "string" ? engagement["client"] : undefined,
        assessmentName: typeof engagement["assessmentName"] === "string" ? engagement["assessmentName"] : undefined,
        scope: Array.isArray(engagement["scope"]) ? (engagement["scope"] as string[]) : undefined,
        methodology: Array.isArray(engagement["methodology"]) ? (engagement["methodology"] as string[]) : undefined,
        executiveNotes: typeof engagement["executiveNotes"] === "string" ? (engagement["executiveNotes"] as string).slice(0, 8000) : undefined,
      },
      body.view ?? "full",
      analysis.report_type,
    );
    const saved = await saveReport(auth.userId, id, {
      id: report.id,
      type: report.type,
      status: report.status,
      view: report.view,
      data: report,
      qualityScore: report.qualityScore,
      qualityFailures: report.qualityFailures,
    });
    return c.json({ ...saved, report });
  } catch (e) {
    return sendError(c, e, "POST /api/analyses/:id/reports");
  }
});

app.get("/api/analyses/:id/reports", async (c) => {
  try {
    const auth = await requireAuth(c);
    const id = parseIdParam(c.req.param("id"), "analysis id");
    return c.json(await listReports(auth.userId, id));
  } catch (e) {
    return sendError(c, e, "GET /api/analyses/:id/reports");
  }
});

app.get("/api/jobs/:jobId", async (c) => {
  try {
    const auth = await requireAuth(c);
    const jobId = parseIdParam(c.req.param("jobId"), "job id");
    const job = await getJobRow(auth.userId, jobId);
    if (!job) return c.json({ error: "Job not found" }, 404);
    return c.json(job);
  } catch (e) {
    return sendError(c, e, "GET /api/jobs/:jobId");
  }
});

const aiCredsSchema = z
  .object({
    provider: z.enum(["openai", "anthropic", "groq", "gemini"]).optional(),
    model: z.string().regex(/^[A-Za-z0-9._:-]{1,100}$/).optional(),
    apiKey: z.string().max(2000).optional(),
  })
  .strict();

function resolveAiCreds(body: { provider?: string; model?: string; apiKey?: string }): {
  provider: "openai" | "anthropic" | "groq" | "gemini";
  model: string;
  apiKey: string;
} {
  const provider = (body.provider ?? "openai") as "openai" | "anthropic" | "groq" | "gemini";
  const { apiKey } = resolveProviderKey(provider, body.apiKey);
  if (!apiKey) {
    throw new Error(`No API key for "${provider}". Supply one or configure it server-side.`);
  }
  return { provider, model: (body.model ?? "").trim(), apiKey };
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 8192) {
    bin += String.fromCharCode(...bytes.slice(i, i + 8192));
  }
  return (globalThis as unknown as { btoa: (s: string) => string }).btoa(bin);
}

app.post("/api/analyses/:id/artifacts/:aid/describe", async (c) => {
  try {
    const auth = await requireAuth(c);
    checkUserRateLimit(analysisLimiter, "vision", auth.userId);
    const id = parseIdParam(c.req.param("id"), "analysis id");
    const aid = parseIdParam(c.req.param("aid"), "artifact id");
    const body = parseBody(aiCredsSchema, await readJsonBody(c), "AI credentials");
    const creds = resolveAiCreds(body);
    if (!supportsVision(creds.provider)) {
      return c.json({ error: `Vision is not supported for provider "${creds.provider}".` }, 400);
    }

    const artifact = await getArtifactRow(auth.userId, id, aid);
    if (!artifact || !artifact["storage_key"]) return c.json({ error: "Artifact not found" }, 404);
    const mediaType = String(artifact["media_type"] ?? "");
    const bytes = await storage().get(String(artifact["storage_key"]), auth.userId);
    if (!bytes) return c.json({ error: "Artifact bytes unavailable." }, 404);
    const sniffed = sniffBytes(bytes.slice(0, 64));
    const isImage = mediaType.startsWith("image/") || !!sniffed?.mediaType.startsWith("image/");
    if (!isImage) return c.json({ error: "AI Describe applies to image evidence only." }, 400);
    if (bytes.length > 5 * 1024 * 1024) return c.json({ error: "Image exceeds the 5 MB vision limit." }, 413);

    const model = creds.model || (creds.provider === "anthropic" ? "claude-3-5-sonnet-20241022" : creds.provider === "gemini" ? "gemini-1.5-flash" : "gpt-4o-mini");
    const vision = await describeImage({
      provider: creds.provider,
      model,
      apiKey: creds.apiKey,
      imageBase64: bytesToBase64(bytes),
      mediaType: mediaType.startsWith("image/") ? mediaType : "image/png",
      evidenceId: String(artifact["id"]),
      filename: String(artifact["filename"] ?? "image"),
    });
    const saved = await insertEvidenceRow(auth.userId, id, {
      artifactId: String(artifact["id"]),
      location: "image#ai-vision",
      type: "screenshot",
      title: `AI vision description: ${String(artifact["filename"] ?? "image")}`,
      content: `AI-OBSERVED (verify before citing): ${vision.description}\nVisible text: ${vision.visibleText || "(none transcribed)"}`,
      confidence: vision.confidence,
      level: "L2_derived",
    });
    return c.json({ ...vision, evidenceId: saved.id });
  } catch (e) {
    return sendError(c, e, "POST /api/analyses/:id/artifacts/:aid/describe");
  }
});

app.post("/api/analyses/:id/findings/:fid/assist", async (c) => {
  try {
    const auth = await requireAuth(c);
    checkUserRateLimit(analysisLimiter, "assist", auth.userId);
    const id = parseIdParam(c.req.param("id"), "analysis id");
    const fid = parseIdParam(c.req.param("fid"), "finding id");
    const body = parseBody(aiCredsSchema, await readJsonBody(c), "AI credentials");
    const creds = resolveAiCreds(body);

    const row = await getCandidateRow(auth.userId, id, fid);
    if (!row) return c.json({ error: "Finding not found" }, 404);
    const evidenceIds = JSON.parse(String(row["evidence_ids"] ?? "[]")) as string[];
    const detail = await listEvidenceDetail(auth.userId, id, evidenceIds);
    const graph = {
      analysisId: id,
      candidates: [
        {
          id: String(row["id"]),
          title: String(row["title"] ?? ""),
          severity: row["severity"],
          severityBasis: String(row["severity_basis"] ?? ""),
          affectedAssets: JSON.parse(String(row["affected_assets"] ?? "[]")) as string[],
          evidenceIds,
        },
      ],
      evidence: detail.map((e) => ({ id: e.id, content: e.content })),
    };
    const draft = await assistFinding(graph as never, fid, {
      provider: creds.provider,
      model: creds.model || "gpt-4o-mini",
      apiKey: creds.apiKey,
    });
    // Drafts are returned for human approval — never saved or confirmed here.
    return c.json({ draft });
  } catch (e) {
    return sendError(c, e, "POST /api/analyses/:id/findings/:fid/assist");
  }
});

app.post("/api/analyses/:id/summary-draft", async (c) => {
  try {
    const auth = await requireAuth(c);
    checkUserRateLimit(analysisLimiter, "summary", auth.userId);
    const id = parseIdParam(c.req.param("id"), "analysis id");
    const analysis = await getAnalysis(auth.userId, id);
    if (!analysis) return c.json({ error: "Analysis not found" }, 404);
    const body = parseBody(aiCredsSchema, await readJsonBody(c), "AI credentials");
    const creds = resolveAiCreds(body);

    const artifacts = await listArtifactRows(auth.userId, id);
    const candidates = (await listCandidateRows(auth.userId, id)) as Array<Record<string, unknown>>;
    const conflicts = await listConflictRows(auth.userId, id);
    const graph = {
      analysisId: id,
      artifacts: artifacts.map((a) => ({ classification: { label: a.artifact_type } })),
      assets: [],
      candidates: candidates.map((r) => ({ id: String(r["id"]), severity: String(r["severity"]), title: String(r["title"]) })),
      conflicts: conflicts.map((r) => ({ resolution: String((r as Record<string, unknown>)["resolution"]) })),
    };
    const summary = await draftExecutiveSummary(graph as never, {
      provider: creds.provider,
      model: creds.model || "gpt-4o-mini",
      apiKey: creds.apiKey,
    });
    return c.json({ summary });
  } catch (e) {
    return sendError(c, e, "POST /api/analyses/:id/summary-draft");
  }
});

export default app;
