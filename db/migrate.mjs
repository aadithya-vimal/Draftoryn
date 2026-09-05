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
  console.error("[db:migrate] ERROR: DATABASE_URL is not set.");
  process.exit(1);
}

const sql = neon(url);

function splitStatements(text) {
  return text
    .replace(/--[^\n]*/g, "")
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
}

async function run() {
  console.log("[db:migrate] Connecting to Neon database...");

  const schemaFile = join(here, "schema.sql");
  const schemaContent = readFileSync(schemaFile, "utf8");
  const statements = splitStatements(schemaContent);

  console.log("[db:migrate] Applying schema (" + statements.length + " statements)...");
  for (const stmt of statements) {
    await sql(stmt);
  }

  // 2. Track migration
  await sql`
    INSERT INTO _migrations (id, name, applied_at)
    VALUES ('001_initial_relational_schema', 'Initial 6-table Relational Schema', now())
    ON CONFLICT (id) DO UPDATE SET applied_at = now();
  `;

  // 3. Verify all tables exist
  const expectedTables = [
    "_migrations",
    "users",
    "workspaces",
    "user_settings",
    "documents",
    "document_versions",
    "document_exports",
  ];

  const rows = await sql`
    SELECT table_name FROM information_schema.tables
    WHERE table_schema = 'public';
  `;
  const existingTables = rows.map((r) => r.table_name);

  console.log("[db:migrate] Verifying tables in public schema:");
  for (const t of expectedTables) {
    if (!existingTables.includes(t)) {
      throw new Error("Verification failed: Table '" + t + "' was not created.");
    }
    console.log("  ✓ Table '" + t + "' exists");
  }

  // 4. Verify indexes
  const indexRows = await sql`
    SELECT indexname, tablename FROM pg_indexes
    WHERE schemaname = 'public';
  `;
  console.log("[db:migrate] Verified " + indexRows.length + " indexes in Neon public schema.");

  // 5. Verify foreign keys
  const fkRows = await sql`
    SELECT tc.table_name, kcu.column_name, ccu.table_name AS foreign_table_name
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY';
  `;
  console.log("[db:migrate] Verified " + fkRows.length + " foreign key relationships in Neon.");
  for (const fk of fkRows) {
    console.log("  ✓ " + fk.table_name + "." + fk.column_name + " -> " + fk.foreign_table_name);
  }

  console.log("[db:migrate] Neon migration COMPLETED and VERIFIED successfully.");
}

run().catch((err) => {
  console.error("[db:migrate] Migration FAILED:", err);
  process.exit(1);
});
