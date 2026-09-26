import { describe, expect, it } from "vitest";
import { LocalStorageProvider, NeonBlobProvider, type SqlFn } from "../../src/intelligence/storage/index";

function fakeSql(tables: Map<string, { owner: string; bytes: Uint8Array }>): SqlFn {
  return async (query: string, params: unknown[] = []) => {
    if (query.startsWith("SELECT owner_id FROM artifact_blobs")) {
      const hit = tables.get(params[0] as string);
      return hit ? [{ owner_id: hit.owner }] : [];
    }
    if (query.startsWith("INSERT INTO artifact_blobs")) {
      tables.set(params[0] as string, { owner: params[1] as string, bytes: params[2] as Uint8Array });
      return [];
    }
    if (query.startsWith("SELECT bytes FROM artifact_blobs")) {
      const hit = tables.get(params[0] as string);
      if (!hit || hit.owner !== params[1]) return [];
      return [{ bytes: hit.bytes }];
    }
    if (query.startsWith("DELETE FROM artifact_blobs")) {
      const hit = tables.get(params[0] as string);
      if (hit && hit.owner === params[1]) tables.delete(params[0] as string);
      return [];
    }
    throw new Error(`unexpected query: ${query}`);
  };
}

describe("storage providers", () => {
  it("isolates tenants in local storage", async () => {
    const s = new LocalStorageProvider();
    const bytes = new Uint8Array([1, 2, 3]);
    const stored = await s.put("userA", "an_1", "nmap.xml", bytes, "application/xml", "c".repeat(64));
    expect(await s.get(stored.storageKey, "userB")).toBe(null);
    expect(await s.get(stored.storageKey, "userA")).toEqual(bytes);
    await s.remove(stored.storageKey, "userB");
    expect(await s.get(stored.storageKey, "userA")).toEqual(bytes);
    await s.remove(stored.storageKey, "userA");
    expect(await s.get(stored.storageKey, "userA")).toBe(null);
  });

  it("persists blobs owner-scoped via Neon with collision defense", async () => {
    const tables = new Map();
    const s = new NeonBlobProvider(fakeSql(tables));
    const bytes = new Uint8Array([9, 8, 7, 6]);
    const stored = await s.put("userA", "an_1", "../../evil.xml", bytes, "application/xml", "d".repeat(64));
    expect(stored.storageKey.includes("..")).toBe(false);
    expect(await s.get(stored.storageKey, "userB")).toBe(null);
    expect(await s.get(stored.storageKey, "userA")).toEqual(bytes);

    // Cross-tenant key collision is refused, never overwritten.
    const hostile = fakeSql(new Map([[stored.storageKey, { owner: "userB", bytes: new Uint8Array([0]) }]]));
    await expect(new NeonBlobProvider(hostile).put("userA", "an_1", "../../evil.xml", bytes, "application/xml", "d".repeat(64))).rejects.toThrow();

    await s.remove(stored.storageKey, "userA");
    expect(await s.get(stored.storageKey, "userA")).toBe(null);
  });
});
