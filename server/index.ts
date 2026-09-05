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
import { runGeneration } from "./generate";
import { listDocuments, getDocument, putDocument, deleteDocument } from "./neon";

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

async function authenticate(c: Ctx): Promise<string | null> {
  const auth = c.req.header("Authorization");
  if (auth && auth.startsWith("Bearer ")) {
    const token = auth.slice(7);
    try {
      if (process.env.CLERK_SECRET_KEY) {
        const claims = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
        if (claims?.sub) return claims.sub;
      }
    } catch {
      // Token verification failed
    }
  }

  if (DEV_MODE) return "dev";
  return null;
}

app.get("/", (c) => c.json({ product: "Draftoryn", status: "ok" }));
app.get("/api/health", (c) => c.json({ product: "Draftoryn", status: "ok", timestamp: new Date().toISOString() }));

app.post("/api/generate", async (c) => {
  const userId = await authenticate(c as never);
  if (!userId) return c.json({ error: "Unauthorized. Please sign in to generate documents." }, 401);
  
  let body: { definitionId?: string; source?: Record<string, unknown>; sectionId?: string; useAi?: boolean };
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
    });
    return c.json(doc);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Generation failed.";
    return c.json({ error: message }, 500);
  }
});

app.get("/api/documents", async (c) => {
  const userId = await authenticate(c as never);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  try {
    const docs = await listDocuments(userId);
    return c.json(docs);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Failed to load documents." }, 500);
  }
});

app.post("/api/documents", async (c) => {
  const userId = await authenticate(c as never);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  
  let record: Record<string, unknown>;
  try {
    record = await c.req.json();
  } catch {
    return c.json({ error: "Invalid request body" }, 400);
  }
  
  if (!record?.id || typeof record.id !== "string") {
    return c.json({ error: "Document id is required" }, 400);
  }

  // Derive ownership securely from Clerk auth — never trust client-provided ownerId
  const sanitized = { ...record, ownerId: userId };
  
  try {
    await putDocument(userId, sanitized as never);
    return c.json(sanitized);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Failed to save document." }, 500);
  }
});

app.get("/api/documents/:id", async (c) => {
  const userId = await authenticate(c as never);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  const id = c.req.param("id");
  try {
    const doc = await getDocument(userId, id);
    if (!doc) return c.json({ error: "Document not found" }, 404);
    return c.json(doc);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Failed to load document." }, 500);
  }
});

app.put("/api/documents/:id", async (c) => {
  const userId = await authenticate(c as never);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  
  let record: Record<string, unknown>;
  try {
    record = await c.req.json();
  } catch {
    return c.json({ error: "Invalid request body" }, 400);
  }
  
  const id = c.req.param("id");
  
  // Ensure document exists and belongs to this user
  try {
    const existing = await getDocument(userId, id);
    if (!existing) return c.json({ error: "Document not found or unauthorized" }, 404);

    // Derive ownership securely
    const sanitized = { ...record, id, ownerId: userId };
    await putDocument(userId, sanitized as never);
    return c.json(sanitized);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Failed to save document." }, 500);
  }
});

app.delete("/api/documents/:id", async (c) => {
  const userId = await authenticate(c as never);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  const id = c.req.param("id");
  try {
    await deleteDocument(userId, id);
    return c.json({ ok: true });
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Failed to delete document." }, 500);
  }
});

serve({ fetch: app.fetch, port: PORT }, () => {
  // eslint-disable-next-line no-console
  console.log(`Draftoryn server listening on http://localhost:${PORT}`);
});

