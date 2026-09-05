import { describe, expect, it } from "vitest";
import { LocalRepository } from "../src/repository/local";
import { MemoryStorage } from "../src/lib/storage";
import type { DocumentRecord } from "../src/repository/types";
import { createVersion } from "../src/engine/serialization";

function makeRecord(id: string, ownerId: string, title: string): DocumentRecord {
  const v = createVersion(1, title, {}, { documentType: "x", category: "offensive_security", documentName: title, people: [], constraints: [], methodology: [], evidence: [], findings: [], risks: [], recommendations: [], assumptions: [], extra: {} }, [], "ready");
  return {
    id,
    ownerId,
    definitionId: "pentest_report",
    title,
    status: "ready",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    currentVersionId: v.id,
    source: {},
    versions: [v],
  };
}

describe("LocalRepository", () => {
  it("creates, lists, gets and deletes documents per owner", async () => {
    const repo = new LocalRepository(new MemoryStorage());
    const a = makeRecord("d1", "u1", "Alpha");
    const b = makeRecord("d2", "u1", "Beta");
    const other = makeRecord("d3", "u2", "Secret");
    await repo.put(a);
    await repo.put(b);
    await repo.put(other);

    const list = await repo.list("u1");
    expect(list.map((d) => d.id).sort()).toEqual(["d1", "d2"]);
    expect((await repo.list("u2")).map((d) => d.id)).toEqual(["d3"]);

    const got = await repo.get("d1","u1");
    expect(got?.title).toBe("Alpha");
    expect(await repo.get("d3","u1")).toBeNull();

    await repo.remove("d1","u1");
    expect(await repo.get("d1","u1")).toBeNull();
    expect((await repo.list("u1")).map((d) => d.id)).toEqual(["d2"]);
  });

  it("updates an existing document in place", async () => {
    const repo = new LocalRepository(new MemoryStorage());
    const rec = makeRecord("d1", "u1", "Alpha");
    await repo.put(rec);
    const updated = { ...rec, title: "Alpha v2" };
    await repo.put(updated);
    expect((await repo.get("d1","u1"))?.title).toBe("Alpha v2");
    expect((await repo.list("u1")).length).toBe(1);
  });

  it("filters documents by workspaceId and cleans up deleted workspaces", async () => {
    const repo = new LocalRepository(new MemoryStorage());
    const d1 = { ...makeRecord("d1", "u1", "Doc 1"), workspaceId: "ws_alpha" };
    const d2 = { ...makeRecord("d2", "u1", "Doc 2"), workspaceId: "ws_beta" };
    const d3 = { ...makeRecord("d3", "u1", "Doc 3"), workspaceId: "ws_alpha" };
    await repo.put(d1);
    await repo.put(d2);
    await repo.put(d3);

    // List scoped to ws_alpha
    const alphaList = await repo.list("u1", "ws_alpha");
    expect(alphaList.map((d) => d.id).sort()).toEqual(["d1", "d3"]);

    // List scoped to ws_beta
    const betaList = await repo.list("u1", "ws_beta");
    expect(betaList.map((d) => d.id)).toEqual(["d2"]);

    // Delete ws_beta documents
    await repo.removeByWorkspace("ws_beta", "u1");
    expect(await repo.list("u1", "ws_beta")).toEqual([]);
    expect((await repo.list("u1")).map((d) => d.id).sort()).toEqual(["d1", "d3"]);

    // Cleanup orphaned documents when valid workspaces are ["ws_gamma"]
    await repo.cleanupOrphanedDocuments("u1", ["ws_gamma"]);
    expect(await repo.list("u1")).toEqual([]);
  });
});
