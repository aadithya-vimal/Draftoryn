import { neon } from "@neondatabase/serverless";
import type { DocumentRecord, DocumentSummary } from "../src/repository/types";
import { getDefinition } from "../src/engine/definitions/catalog";

let _sql: ((query: string, params?: unknown[]) => Promise<unknown[]>) | null = null;

function client(): (query: string, params?: unknown[]) => Promise<unknown[]> {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) throw new Error("DATABASE_URL is not configured on the server.");
  if (!_sql) {
    _sql = neon(dbUrl) as unknown as (query: string, params?: unknown[]) => Promise<unknown[]>;
  }
  return _sql;
}

function toSummary(rec: DocumentRecord): DocumentSummary {
  const def = getDefinition(rec.definitionId);
  return {
    id: rec.id,
    definitionId: rec.definitionId,
    category: def?.category ?? "security_assessment",
    title: rec.title,
    status: rec.status,
    createdAt: rec.createdAt,
    updatedAt: rec.updatedAt,
  };
}

/**
 * Executes a query with app.user_id RLS session variable established.
 */
async function withRls<T>(ownerId: string, fn: (sql: (query: string, params?: unknown[]) => Promise<unknown[]>) => Promise<T>): Promise<T> {
  const sql = client();
  // Set session configuration for PostgreSQL Row Level Security (RLS)
  await sql("SELECT set_config('app.user_id', $1, true)", [ownerId]);
  return fn(sql);
}

export async function listDocuments(ownerId: string): Promise<DocumentSummary[]> {
  return withRls(ownerId, async (sql) => {
    const rows = (await sql(
      "SELECT data FROM documents WHERE owner_id = $1 ORDER BY updated_at DESC",
      [ownerId],
    )) as Array<{ data: DocumentRecord }>;
    return rows.map((r) => toSummary(r.data));
  });
}

export async function getDocument(ownerId: string, id: string): Promise<DocumentRecord | null> {
  return withRls(ownerId, async (sql) => {
    const rows = (await sql(
      "SELECT data FROM documents WHERE owner_id = $1 AND id = $2",
      [ownerId, id],
    )) as Array<{ data: DocumentRecord }>;
    return rows[0]?.data ?? null;
  });
}

export async function putDocument(ownerId: string, record: DocumentRecord): Promise<void> {
  return withRls(ownerId, async (sql) => {
    await sql(
      `INSERT INTO documents (id, owner_id, definition_id, title, status, data, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         owner_id = EXCLUDED.owner_id,
         definition_id = EXCLUDED.definition_id,
         title = EXCLUDED.title,
         status = EXCLUDED.status,
         data = EXCLUDED.data,
         updated_at = EXCLUDED.updated_at`,
      [
        record.id,
        ownerId,
        record.definitionId,
        record.title,
        record.status,
        record,
        record.createdAt,
        record.updatedAt,
      ],
    );
  });
}

export async function deleteDocument(ownerId: string, id: string): Promise<void> {
  return withRls(ownerId, async (sql) => {
    await sql("DELETE FROM documents WHERE owner_id = $1 AND id = $2", [ownerId, id]);
  });
}

