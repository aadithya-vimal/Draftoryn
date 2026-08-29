import { neon } from "@neondatabase/serverless";
import type { DocumentRecord, DocumentSummary, Repository } from "./types";
import { getDefinition } from "../engine/definitions/catalog";

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

export class NeonRepository implements Repository {
  private sql: (query: string, params?: unknown[]) => Promise<unknown[]>;

  constructor(databaseUrl: string) {
    this.sql = neon(databaseUrl) as unknown as (query: string, params?: unknown[]) => Promise<unknown[]>;
  }

  async list(ownerId: string): Promise<DocumentSummary[]> {
    if (!ownerId) return [];
    const rows = (await this.sql(
      "SELECT data FROM documents WHERE owner_id = $1 ORDER BY updated_at DESC",
      [ownerId],
    )) as Array<{ data: DocumentRecord }>;
    return rows.map((r) => toSummary(r.data));
  }

  async get(id: string, ownerId: string): Promise<DocumentRecord | null> {
    if (!ownerId || !id) return null;
    const rows = (await this.sql(
      "SELECT data FROM documents WHERE owner_id = $1 AND id = $2",
      [ownerId, id],
    )) as Array<{ data: DocumentRecord }>;
    return rows[0]?.data ?? null;
  }

  async put(record: DocumentRecord): Promise<void> {
    if (!record.ownerId) throw new Error("Document must have a valid owner.");
    await this.sql(
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
        record.ownerId,
        record.definitionId,
        record.title,
        record.status,
        JSON.stringify(record),
        record.createdAt,
        record.updatedAt,
      ],
    );
  }

  async remove(id: string, ownerId: string): Promise<void> {
    if (!ownerId || !id) return;
    await this.sql("DELETE FROM documents WHERE owner_id = $1 AND id = $2", [ownerId, id]);
  }
}
