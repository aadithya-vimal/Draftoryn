import { clientHttp } from "./client";
import { getPlatformStorage } from "../lib/storage";
import { LocalRepository } from "../repository/local";
import type { DocumentRecord, DocumentSummary } from "../repository/types";
import type { AppUser } from "../auth/clerk";

const localRepo = new LocalRepository(getPlatformStorage());

export async function listDocuments(user: AppUser, workspaceId?: string): Promise<DocumentSummary[]> {
  const path = workspaceId ? `/api/documents?workspaceId=${encodeURIComponent(workspaceId)}` : "/api/documents";
  try {
    return await clientHttp<DocumentSummary[]>(path, { method: "GET" }, user);
  } catch (err) {
    const ownerId = user.userId ?? "local";
    return localRepo.list(ownerId);
  }
}

export async function getDocument(user: AppUser, id: string): Promise<DocumentRecord | null> {
  try {
    return await clientHttp<DocumentRecord | null>(`/api/documents/${id}`, { method: "GET" }, user);
  } catch (err) {
    const ownerId = user.userId ?? "local";
    return localRepo.get(id, ownerId);
  }
}

export async function createDocumentRecord(user: AppUser, record: DocumentRecord): Promise<DocumentRecord> {
  const ownerId = user.userId ?? "local";
  const doc = { ...record, ownerId };
  try {
    const saved = await clientHttp<DocumentRecord>("/api/documents", { method: "POST", body: JSON.stringify(doc) }, user);
    await localRepo.put(saved);
    return saved;
  } catch (err) {
    await localRepo.put(doc);
    return doc;
  }
}

export async function saveDocumentRecord(user: AppUser, record: DocumentRecord): Promise<DocumentRecord> {
  const ownerId = user.userId ?? "local";
  const doc = { ...record, ownerId };
  try {
    const saved = await clientHttp<DocumentRecord>(`/api/documents/${record.id}`, { method: "PUT", body: JSON.stringify(doc) }, user);
    await localRepo.put(saved);
    return saved;
  } catch (err) {
    await localRepo.put(doc);
    return doc;
  }
}

export async function deleteDocument(user: AppUser, id: string): Promise<void> {
  const ownerId = user.userId ?? "local";
  try {
    await clientHttp<{ ok: true }>(`/api/documents/${id}`, { method: "DELETE" }, user);
    await localRepo.remove(id, ownerId);
  } catch (err) {
    await localRepo.remove(id, ownerId);
  }
}

export async function logDocumentExport(user: AppUser, documentId: string, format: string): Promise<void> {
  try {
    await clientHttp(`/api/documents/${documentId}/exports`, {
      method: "POST",
      body: JSON.stringify({ format }),
    }, user);
  } catch (err) {
    console.warn("[documents] Export log to Neon skipped:", err);
  }
}

export async function listDocumentVersions(user: AppUser, documentId: string): Promise<Array<{
  id: string;
  documentId: string;
  versionNumber: number;
  title: string;
  data: unknown;
  createdAt: string;
}>> {
  try {
    return await clientHttp(`/api/documents/${documentId}/versions`, { method: "GET" }, user);
  } catch {
    return [];
  }
}
