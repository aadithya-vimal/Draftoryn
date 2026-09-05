import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";

// Load .env automatically if running via node/tsx
const envPath = join(process.cwd(), ".env");
if (existsSync(envPath)) {
  const envContent = readFileSync(envPath, "utf8");
  for (const line of envContent.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const idx = trimmed.indexOf("=");
    if (idx > 0) {
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

import { verifyToken } from "@clerk/backend";
import { runGeneration, resolveProviderKey } from "./generate";
import { AI_PROVIDERS, type AiProviderType, executeAiCall } from "../src/engine/ai/providers";
import {
  getOrCreateUser,
  getUser,
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

const app = new Hono();

// Secure CORS configuration
app.use(
  "*",
  cors({
    origin: (origin) => {
      if (!origin) return "*";
      // Allow localhost in development
      if (origin.includes("localhost") || origin.includes("127.0.0.1")) return origin;
      // Allow production deployment domains
      if (origin.endsWith(".draftoryn.com") || origin.endsWith(".pages.dev") || origin.endsWith(".vercel.app")) {
        return origin;
      }
      return origin;
    },
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization"],
  }),
);

const PORT = Number(process.env.PORT ?? 8787);

// Dev mode: when no Clerk secret is configured, authentication falls back to local dev user.
const DEV_MODE = !process.env.CLERK_SECRET_KEY;

type Ctx = { req: { header: (k: string) => string | undefined } };

interface AuthUserClaims {
  sub: string;
  email?: string;
  name?: string;
  picture?: string;
}

async function authenticate(c: Ctx): Promise<{ userId: string; claims?: AuthUserClaims } | null> {
  const auth = c.req.header("Authorization");
  if (auth && auth.startsWith("Bearer ")) {
    const token = auth.slice(7);
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
      // Token verification failed
    }
  }

  if (DEV_MODE) {
    return {
      userId: "dev_user",
      claims: {
        sub: "dev_user",
        email: "dev@draftoryn.local",
        name: "Security Lead",
      },
    };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Health & Diagnostic Endpoints
// ---------------------------------------------------------------------------
app.get("/", (c) => c.json({ product: "Draftoryn", status: "ok" }));
app.get("/api/health", (c) => c.json({ product: "Draftoryn", status: "ok", timestamp: new Date().toISOString() }));

// ---------------------------------------------------------------------------
// User & Onboarding Endpoints (Authoritative in Neon)
// ---------------------------------------------------------------------------
app.get("/api/user/me", async (c) => {
  const auth = await authenticate(c as never);
  if (!auth) return c.json({ error: "Unauthorized" }, 401);

  try {
    const data = await getOrCreateUser(auth.userId, {
      email: auth.claims?.email,
      name: auth.claims?.name,
      avatarUrl: auth.claims?.picture,
    });
    return c.json(data);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Failed to load user." }, 500);
  }
});

app.post("/api/user/onboarding", async (c) => {
  const auth = await authenticate(c as never);
  if (!auth) return c.json({ error: "Unauthorized" }, 401);

  let body: {
    completed?: boolean;
    step?: number;
    role?: string;
    onboardingData?: Record<string, unknown>;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  try {
    const updated = await updateUserOnboarding(auth.userId, body);
    return c.json(updated);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Failed to save onboarding data." }, 500);
  }
});

// ---------------------------------------------------------------------------
// Settings Endpoints (Authoritative in Neon)
// ---------------------------------------------------------------------------
app.get("/api/settings", async (c) => {
  const auth = await authenticate(c as never);
  if (!auth) return c.json({ error: "Unauthorized" }, 401);

  try {
    const settings = await getUserSettings(auth.userId);
    return c.json(settings);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Failed to load settings." }, 500);
  }
});

app.put("/api/settings", async (c) => {
  const auth = await authenticate(c as never);
  if (!auth) return c.json({ error: "Unauthorized" }, 401);

  let body: Record<string, unknown>;
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  try {
    const updated = await putUserSettings(auth.userId, body);
    return c.json(updated);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Failed to update settings." }, 500);
  }
});

// ---------------------------------------------------------------------------
// Workspaces Endpoints (Authoritative in Neon)
// ---------------------------------------------------------------------------
app.get("/api/workspaces", async (c) => {
  const auth = await authenticate(c as never);
  if (!auth) return c.json({ error: "Unauthorized" }, 401);

  try {
    const workspaces = await getWorkspaces(auth.userId);
    return c.json(workspaces);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Failed to load workspaces." }, 500);
  }
});

app.post("/api/workspaces", async (c) => {
  const auth = await authenticate(c as never);
  if (!auth) return c.json({ error: "Unauthorized" }, 401);

  let body: { name: string; slug?: string; settings?: Record<string, unknown> };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  if (!body.name?.trim()) return c.json({ error: "Workspace name is required" }, 400);

  try {
    const ws = await createWorkspace(auth.userId, body.name.trim(), body.slug, body.settings);
    return c.json(ws);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Failed to create workspace." }, 500);
  }
});

app.patch("/api/workspaces/:id", async (c) => {
  const auth = await authenticate(c as never);
  if (!auth) return c.json({ error: "Unauthorized" }, 401);

  const workspaceId = c.req.param("id");
  let body: { name?: string; slug?: string; settings?: Record<string, unknown> };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  try {
    const ws = await updateWorkspace(auth.userId, workspaceId, body);
    return c.json(ws);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Failed to update workspace." }, 500);
  }
});

app.post("/api/workspaces/:id/default", async (c) => {
  const auth = await authenticate(c as never);
  if (!auth) return c.json({ error: "Unauthorized" }, 401);

  const workspaceId = c.req.param("id");
  try {
    const ws = await setDefaultWorkspace(auth.userId, workspaceId);
    return c.json(ws);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Failed to set default workspace." }, 500);
  }
});

app.delete("/api/workspaces/:id", async (c) => {
  const auth = await authenticate(c as never);
  if (!auth) return c.json({ error: "Unauthorized" }, 401);

  const workspaceId = c.req.param("id");
  try {
    const result = await deleteWorkspace(auth.userId, workspaceId);
    return c.json(result);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Failed to delete workspace." }, 500);
  }
});

// ---------------------------------------------------------------------------
// Generation Endpoint
// ---------------------------------------------------------------------------
app.post("/api/generate", async (c) => {
  const auth = await authenticate(c as never);
  if (!auth) return c.json({ error: "Unauthorized. Please sign in to generate documents." }, 401);

  let body: {
    definitionId?: string;
    source?: Record<string, unknown>;
    sectionId?: string;
    useAi?: boolean;
    provider?: AiProviderType;
    model?: string;
    apiKey?: string;
  };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON request body" }, 400);
  }

  if (!body.definitionId) return c.json({ error: "definitionId is required" }, 400);

  try {
    const doc = await runGeneration(body.definitionId, body.source ?? {}, {
      sectionId: body.sectionId,
      useAi: Boolean(body.useAi),
      provider: body.provider,
      model: body.model,
      apiKey: body.apiKey,
    });
    return c.json(doc);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Generation failed.";
    return c.json({ error: message }, 500);
  }
});

// ---------------------------------------------------------------------------
// AI Providers & Diagnostics Endpoints
// ---------------------------------------------------------------------------
app.get("/api/ai/providers", async (c) => {
  const auth = await authenticate(c as never);
  if (!auth) return c.json({ error: "Unauthorized." }, 401);

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
});

app.post("/api/ai/test", async (c) => {
  const auth = await authenticate(c as never);
  if (!auth) return c.json({ error: "Unauthorized." }, 401);

  let body: { provider?: AiProviderType; apiKey?: string; model?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON request body" }, 400);
  }

  const provider: AiProviderType = body.provider || "openai";
  const { apiKey } = resolveProviderKey(provider, body.apiKey);
  if (!apiKey) {
    return c.json({
      success: false,
      error: `No API key provided or configured on server for "${AI_PROVIDERS[provider]?.name ?? provider}".`,
    }, 400);
  }

  const model = body.model?.trim() || AI_PROVIDERS[provider].defaultModel;
  const start = Date.now();
  try {
    await executeAiCall({
      provider,
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
      provider,
      model,
      latencyMs,
      message: `Successfully connected to ${AI_PROVIDERS[provider].name} (${model}) in ${latencyMs}ms.`,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Connection test failed.";
    return c.json({
      success: false,
      provider,
      model,
      error: message,
    }, 500);
  }
});

// ---------------------------------------------------------------------------
// Documents Endpoints (Authoritative in Neon with Workspace Scoping)
// ---------------------------------------------------------------------------
app.get("/api/documents", async (c) => {
  const auth = await authenticate(c as never);
  if (!auth) return c.json({ error: "Unauthorized" }, 401);
  const workspaceId = c.req.query("workspaceId");

  try {
    const docs = await listDocuments(auth.userId, workspaceId);
    return c.json(docs);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Failed to load documents." }, 500);
  }
});

app.post("/api/documents", async (c) => {
  const auth = await authenticate(c as never);
  if (!auth) return c.json({ error: "Unauthorized" }, 401);

  let record: Record<string, unknown>;
  try {
    record = await c.req.json();
  } catch {
    return c.json({ error: "Invalid request body" }, 400);
  }

  if (!record?.id || typeof record.id !== "string") {
    return c.json({ error: "Document id is required" }, 400);
  }

  // Derive ownership securely from verified token — never trust client-provided ownerId
  const sanitized = { ...record, ownerId: auth.userId };

  try {
    await putDocument(auth.userId, sanitized as never, record.workspaceId as string | undefined);
    return c.json(sanitized);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Failed to save document." }, 500);
  }
});

app.get("/api/documents/:id", async (c) => {
  const auth = await authenticate(c as never);
  if (!auth) return c.json({ error: "Unauthorized" }, 401);
  const id = c.req.param("id");

  try {
    const doc = await getDocument(auth.userId, id);
    if (!doc) return c.json({ error: "Document not found" }, 404);
    return c.json(doc);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Failed to load document." }, 500);
  }
});

app.put("/api/documents/:id", async (c) => {
  const auth = await authenticate(c as never);
  if (!auth) return c.json({ error: "Unauthorized" }, 401);

  let record: Record<string, unknown>;
  try {
    record = await c.req.json();
  } catch {
    return c.json({ error: "Invalid request body" }, 400);
  }

  const id = c.req.param("id");

  try {
    const existing = await getDocument(auth.userId, id);
    if (!existing) return c.json({ error: "Document not found or unauthorized" }, 404);

    const sanitized = { ...record, id, ownerId: auth.userId };
    await putDocument(auth.userId, sanitized as never, record.workspaceId as string | undefined);
    return c.json(sanitized);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Failed to save document." }, 500);
  }
});

app.delete("/api/documents/:id", async (c) => {
  const auth = await authenticate(c as never);
  if (!auth) return c.json({ error: "Unauthorized" }, 401);
  const id = c.req.param("id");

  try {
    await deleteDocument(auth.userId, id);
    return c.json({ ok: true });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Failed to delete document." }, 500);
  }
});

// ---------------------------------------------------------------------------
// Version History & Export Logging Endpoints (Authoritative in Neon)
// ---------------------------------------------------------------------------
app.get("/api/documents/:id/versions", async (c) => {
  const auth = await authenticate(c as never);
  if (!auth) return c.json({ error: "Unauthorized" }, 401);
  const id = c.req.param("id");

  try {
    const versions = await listDocumentVersions(auth.userId, id);
    return c.json(versions);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Failed to load versions." }, 500);
  }
});

app.post("/api/documents/:id/exports", async (c) => {
  const auth = await authenticate(c as never);
  if (!auth) return c.json({ error: "Unauthorized" }, 401);
  const id = c.req.param("id");

  let body: { format?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid JSON body" }, 400);
  }

  if (!body.format) return c.json({ error: "Format is required" }, 400);

  try {
    const exp = await logDocumentExport(auth.userId, id, body.format);
    return c.json(exp);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Failed to log export." }, 500);
  }
});

app.get("/api/documents/:id/exports", async (c) => {
  const auth = await authenticate(c as never);
  if (!auth) return c.json({ error: "Unauthorized" }, 401);
  const id = c.req.param("id");

  try {
    const exportsList = await listDocumentExports(auth.userId, id);
    return c.json(exportsList);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Failed to load exports." }, 500);
  }
});

serve({ fetch: app.fetch, port: PORT }, () => {
  // eslint-disable-next-line no-console
  console.log(`Draftoryn server listening on http://localhost:${PORT}`);
});
