// Applies and validates Draftoryn migrations against Neon.
// Usage: DATABASE_URL=... node db/validate.mjs
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { neon } from "@neondatabase/serverless";

const here = dirname(fileURLToPath(import.meta.url));
const envPath = join(here, "..", ".env");
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

const url = process.env.DATABASE_URL;

if (!url) {
  console.log("[db:validate] DATABASE_URL not set - skipping migration (local/offline mode).");
  process.exit(0);
}

const sql = neon(url);

function splitStatements(text) {
  return text
    .replace(/--[^\n]*/g, "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function main() {
  const files = ["schema.sql"];
  for (const f of files) {
    const stmts = splitStatements(readFileSync(join(here, f), "utf8"));
    for (const stmt of stmts) {
      await sql(stmt);
    }
    console.log(`[db:validate] applied ${f} (${stmts.length} statements)`);
  }

  const tables = (await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'documents'
  `);
  const names = tables.map((t) => t.table_name);
  if (!names.includes("documents")) {
    throw new Error(`Expected table documents in Neon database`);
  }
  console.log(`[db:validate] Connected to Neon. Verified table: ${names.join(", ")}`);
  console.log("[db:validate] OK");
}

main().catch((err) => {
  console.error("[db:validate] FAILED:", err instanceof Error ? err.message : err);
  process.exit(1);
});
