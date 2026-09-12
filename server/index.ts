// Ensure process.env is safely defined in edge/worker environments
if (typeof globalThis.process === "undefined") {
  (globalThis as any).process = { env: {} };
} else if (!globalThis.process.env) {
  (globalThis.process as any).env = {};
}

import { Hono } from "hono";
import type { Context } from "hono";

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

export default app;
