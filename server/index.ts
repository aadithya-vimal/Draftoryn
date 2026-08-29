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
app.use("*", cors({ origin: "*", allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"] }));

const PORT = Number(process.env.PORT ?? 8787);

// Dev mode: when no Clerk secret is configured, authentication is bypassed and
// every request is attributed to a local "dev" owner. This lets the API be
// exercised locally without a Clerk tenant. NEVER rely on this in production —
// the absence of CLERK_SECRET_KEY is what disables it.
const DEV_MODE = !process.env.CLERK_SECRET_KEY;

type Ctx = { req: { header: (k: string) => string | undefined } };

async function authenticate(c: Ctx): Promise<string | null> {
  if (DEV_MODE) return "dev";
  const auth = c.req.header("Authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  const token = auth.slice(7);
  try {
    const claims = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
    return claims.sub ?? null;
  } catch {
    return null;
  }
}

app.get("/", (c) => c.json({ product: "Draftoryn", status: "ok" }));

app.post("/api/generate", async (c) => {
  const userId = await authenticate(c as never);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  let body: { definitionId?: string; source?: Record<string, unknown>; sectionId?: string };
  try {
    body = await c.req.json();
  } catch {
    return c.json({ error: "Invalid request body" }, 400);
  }
  if (!body.definitionId) return c.json({ error: "definitionId is required" }, 400);
  try {
    const doc = await runGeneration(body.definitionId, body.source ?? {}, body.sectionId);
    return c.json(doc);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Generation failed." }, 500);
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
  let record: unknown;
  try {
    record = await c.req.json();
  } catch {
    return c.json({ error: "Invalid request body" }, 400);
  }
  const rec = record as { id?: string };
  if (!rec?.id) return c.json({ error: "Document id is required" }, 400);
  try {
    await putDocument(userId, record as never);
    return c.json(record);
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
    if (!doc) return c.json({ error: "Not found" }, 404);
    return c.json(doc);
  } catch (e) {
    return c.json({ error: e instanceof Error ? e.message : "Failed to load document." }, 500);
  }
});

app.put("/api/documents/:id", async (c) => {
  const userId = await authenticate(c as never);
  if (!userId) return c.json({ error: "Unauthorized" }, 401);
  let record: unknown;
  try {
    record = await c.req.json();
  } catch {
    return c.json({ error: "Invalid request body" }, 400);
  }
  const id = c.req.param("id");
  try {
    const existing = await getDocument(userId, id);
    if (!existing) return c.json({ error: "Not found" }, 404);
    await putDocument(userId, record as never);
    return c.json(record);
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
