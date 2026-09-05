import type { DocumentRecord, DocumentSummary, Repository, StorageAdapter } from "./types";

const docKey = (id: string) => `draftoryn:doc:${id}`;
const indexKey = (ownerId: string) => `draftoryn:docs:${ownerId}`;

export class LocalRepository implements Repository {
  constructor(private storage: StorageAdapter) {}

  private async index(ownerId: string): Promise<string[]> {
    const raw = await this.storage.get(indexKey(ownerId));
    if (!raw) return [];
    try {
      const arr = JSON.parse(raw);
      return Array.isArray(arr) ? (arr as string[]) : [];
    } catch {
      return [];
    }
  }

  private async writeIndex(ownerId: string, ids: string[]): Promise<void> {
    await this.storage.set(indexKey(ownerId), JSON.stringify(ids));
  }

  async list(ownerId: string, workspaceId?: string): Promise<DocumentSummary[]> {
    const ids = await this.index(ownerId);
    const records = await Promise.all(ids.map((id) => this.get(id, ownerId)));
    return records
      .filter((r): r is DocumentRecord => {
        if (!r || r.ownerId !== ownerId) return false;
        if (workspaceId) {
          // Match matching workspaceId, or match missing workspaceId if looking for default
          return r.workspaceId === workspaceId || (!r.workspaceId && workspaceId === "default");
        }
        return true;
      })
      .map((r) => ({
        id: r.id,
        definitionId: r.definitionId,
        category: r.versions[r.versions.length - 1]?.model.category ?? "",
        workspaceId: r.workspaceId,
        title: r.title,
        status: r.status,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }))
      .sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : -1));
  }

  async get(id: string, ownerId: string): Promise<DocumentRecord | null> {
    const raw = await this.storage.get(docKey(id));
    if (!raw) return null;
    try {
      const rec = JSON.parse(raw) as DocumentRecord;
      return rec.ownerId === ownerId ? rec : null;
    } catch {
      return null;
    }
  }

  async put(record: DocumentRecord): Promise<void> {
    await this.storage.set(docKey(record.id), JSON.stringify(record));
    const ids = await this.index(record.ownerId);
    if (!ids.includes(record.id)) {
      ids.push(record.id);
      await this.writeIndex(record.ownerId, ids);
    }
  }

  async remove(id: string, ownerId: string): Promise<void> {
    const rec = await this.get(id, ownerId);
    await this.storage.remove(docKey(id));
    if (rec) {
      const ids = (await this.index(rec.ownerId)).filter((x) => x !== id);
      await this.writeIndex(rec.ownerId, ids);
    }
  }

  async removeByWorkspace(workspaceId: string, ownerId: string): Promise<void> {
    const ids = await this.index(ownerId);
    for (const id of ids) {
      const rec = await this.get(id, ownerId);
      if (rec && (rec.workspaceId === workspaceId || (!rec.workspaceId && workspaceId === "default"))) {
        await this.remove(id, ownerId);
      }
    }
  }

  async cleanupOrphanedDocuments(ownerId: string, validWorkspaceIds: string[]): Promise<void> {
    if (!validWorkspaceIds || validWorkspaceIds.length === 0) return;
    const validSet = new Set(validWorkspaceIds);
    const ids = await this.index(ownerId);
    for (const id of ids) {
      const rec = await this.get(id, ownerId);
      if (rec && rec.workspaceId && !validSet.has(rec.workspaceId)) {
        await this.remove(id, ownerId);
      }
    }
  }
}
