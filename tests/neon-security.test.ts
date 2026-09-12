import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@neondatabase/serverless", () => ({ neon: vi.fn() }));

import { neon } from "@neondatabase/serverless";
import * as db from "../server/neon";

const mockNeon = vi.mocked(neon);
const SAVED_ENV = { ...process.env };

type SqlCall = { query: string; params: unknown[] };
let calls: SqlCall[];
let handlers: Array<(query: string, params: unknown[]) => unknown[] | null>;

function queueHandler(fn: (query: string, params: unknown[]) => unknown[] | null): void {
  handlers.push(fn);
}

beforeEach(() => {
  process.env.DATABASE_URL = "postgresql://test:test@localhost:5432/testdb";
  calls = [];
  handlers = [];
  const mockSql = vi.fn(async (query: string, params?: unknown[]) => {
    calls.push({ query, params: params ?? [] });
    for (const h of handlers) {
      const result = h(query, params ?? []);
      if (result !== null) return result;
    }
    return [];
  });
  mockNeon.mockReturnValue(mockSql as never);
});

afterEach(() => {
  process.env = { ...SAVED_ENV };
  vi.restoreAllMocks();
});

function ownerRow(ownerId: string): (query: string) => unknown[] | null {
  return (query: string) => (query.startsWith("SELECT owner_id FROM documents") ? [{ owner_id: ownerId }] : null);
}

function baseRecord(id: string, ownerId: string): Record<string, unknown> {
  return {
    id,
    definitionId: "pentest_report",
    title: "Test doc",
    status: "draft",
    ownerId,
    workspaceId: "ws_1",
    source: {},
    versions: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

describe("document write ownership (upsert-takeover defense)", () => {
  it("refuses to overwrite a document owned by another tenant", async () => {
    queueHandler(ownerRow("userB"));
    await expect(db.putDocument("userA", baseRecord("doc_victim", "userA") as never, undefined)).rejects.toThrow(
      /not found/i,
    );
    expect(calls.some((c) => c.query.startsWith("INSERT INTO documents"))).toBe(false);
    expect(calls.some((c) => c.query.startsWith("UPDATE documents"))).toBe(false);
  });

  it("allows overwriting an actor-owned document and forces token ownership", async () => {
    queueHandler(ownerRow("userA"));
    queueHandler((query) => {
      if (query.startsWith("SELECT id, owner_id, name") && query.includes("FROM workspaces")) {
        return [{ id: "ws_1", owner_id: "userA", name: "W", slug: "w", is_default: true, settings: {}, created_at: "", updated_at: "" }];
      }
      if (query.startsWith("SELECT id, email")) return [];
      return null;
    });
    const record = baseRecord("doc_mine", "userB"); // hostile ownerId in body
    await db.putDocument("userA", record as never, "ws_1");
    const insert = calls.find((c) => c.query.startsWith("INSERT INTO documents"));
    expect(insert).toBeDefined();
    expect(insert!.params[2]).toBe("userA");
    const saved = JSON.parse(insert!.params[8] as string) as Record<string, unknown>;
    expect(saved.ownerId).toBe("userA");
  });

  it("creates brand-new ids", async () => {
    queueHandler(() => []);
    queueHandler((query) => {
      if (query.startsWith("SELECT id, owner_id, name") && query.includes("FROM workspaces")) {
        return [{ id: "ws_1", owner_id: "userA", name: "W", slug: "w", is_default: true, settings: {}, created_at: "", updated_at: "" }];
      }
      if (query.startsWith("SELECT id, email")) return [];
      return null;
    });
    await db.putDocument("userA", baseRecord("doc_brand_new", "userA") as never, "ws_1");
    expect(calls.some((c) => c.query.startsWith("INSERT INTO documents"))).toBe(true);
  });
});

describe("export audit ownership", () => {
  it("refuses to log exports against foreign documents", async () => {
    queueHandler(() => []);
    await expect(db.logDocumentExport("userA", "doc_victim", "pdf")).rejects.toThrow(/not found/i);
    expect(calls.some((c) => c.query.startsWith("INSERT INTO document_exports"))).toBe(false);
  });
});

describe("owner scoping on every query", () => {
  it("scopes reads, deletes, versions, and exports to the actor", async () => {
    queueHandler(() => []);
    await db.getDocument("userA", "doc1");
    await db.deleteDocument("userA", "doc1");
    await db.listDocumentVersions("userA", "doc1");
    await db.listDocumentExports("userA", "doc1");
    await db.getWorkspaces("userA").catch(() => undefined);
    const scoped = calls.filter((c) => /FROM (documents|document_versions|document_exports|workspaces)/.test(c.query));
    expect(scoped.length).toBeGreaterThan(0);
    for (const call of scoped) {
      expect(call.query).toMatch(/owner_id/);
      expect(call.params).toContain("userA");
    }
  });

  it("caps list limits", async () => {
    queueHandler(() => []);
    queueHandler((query) => {
      if (query.includes("FROM users")) {
        return [{ id: "userA", email: null, name: null, avatar_url: null, role: "r", onboarding_completed: false, onboarding_step: 1, onboarding_data: {}, created_at: "", updated_at: "" }];
      }
      if (query.includes("FROM workspaces")) {
        return [{ id: "ws_1", owner_id: "userA", name: "W", slug: "w", is_default: true, settings: {}, created_at: "", updated_at: "" }];
      }
      return null;
    });
    await db.listDocuments("userA", undefined, 999);
    const list = calls.find((c) => c.query.includes("FROM documents"));
    expect(list).toBeDefined();
    expect(list!.query).toMatch(/LIMIT \$/);
    expect(list!.params[list!.params.length - 1]).toBe(200);
  });
});

describe("workspace management", () => {
  it("deletes non-default and default workspaces without crashing", async () => {
    const all = [
      { id: "ws_1", is_default: true },
      { id: "ws_2", is_default: false },
    ];
    queueHandler((query) => {
      if (query.startsWith("SELECT id, is_default FROM workspaces")) return all.filter((w) => w.id !== (deleted.pop() ?? ""));
      return null;
    });
    const deleted: string[] = [];
    const first = await db.deleteWorkspace("userA", "ws_2");
    expect(first.success).toBe(true);
    expect(first.activeWorkspaceId).toBe("ws_1");
    const second = await db.deleteWorkspace("userA", "ws_1");
    expect(second.success).toBe(true);
  });

  it("surfaces slug collisions as conflicts, not raw database errors", async () => {
    queueHandler((query) => {
      if (query.includes("FROM users")) {
        return [{ id: "userA", email: null, name: null, avatar_url: null, role: "r", onboarding_completed: false, onboarding_step: 1, onboarding_data: {}, created_at: "", updated_at: "" }];
      }
      if (query.includes("FROM workspaces") && !query.startsWith("INSERT")) {
        return [{ id: "ws_1", owner_id: "userA", name: "W", slug: "w", is_default: true, settings: {}, created_at: "", updated_at: "" }];
      }
      if (query.startsWith("SELECT user_id, default_export_format")) {
        return [{ user_id: "userA", default_export_format: "pdf", compact_lists: false, theme_mode: "dark", session_timeout_minutes: 15, tester_profile: {}, client_profile: {}, ai_settings: {}, updated_at: "" }];
      }
      if (query.startsWith("INSERT INTO workspaces")) {
        throw new Error('duplicate key value violates unique constraint "idx_workspaces_owner_slug"');
      }
      return null;
    });
    await expect(db.createWorkspace("userA", "Dup", "w", undefined)).rejects.toThrow(/already exists/);
  });
});
