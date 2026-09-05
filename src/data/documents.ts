import { clientHttp } from "./client";
import { getPlatformStorage } from "../lib/storage";
import { LocalRepository } from "../repository/local";
import type { DocumentRecord, DocumentSummary } from "../repository/types";
import type { AppUser } from "../auth/clerk";

const localRepo = new LocalRepository(getPlatformStorage());

export async function listDocuments(user: AppUser, workspaceId?: string): Promise<DocumentSummary[]> {
  if (!user.isSignedIn || !user.userId) {
    throw new Error("Authentication required: you must be signed in to view documents.");
  }
  const path = workspaceId ? `/api/documents?workspaceId=${encodeURIComponent(workspaceId)}` : "/api/documents";
  try {
    const list = await clientHttp<DocumentSummary[]>(path, { method: "GET" }, user);
    return list;
  } catch (err) {
    // In case of transient network failure, read offline mirror for the authenticated user only
    return localRepo.list(user.userId);
  }
}

export async function getDocument(user: AppUser, id: string): Promise<DocumentRecord | null> {
  if (!user.isSignedIn || !user.userId) {
    throw new Error("Authentication required: you must be signed in to view documents.");
  }
  try {
    const doc = await clientHttp<DocumentRecord | null>(`/api/documents/${id}`, { method: "GET" }, user);
    if (doc) await localRepo.put(doc);
    return doc;
  } catch (err) {
    return localRepo.get(id, user.userId);
  }
}

export async function createDocumentRecord(user: AppUser, record: DocumentRecord): Promise<DocumentRecord> {
  if (!user.isSignedIn || !user.userId) {
    throw new Error("Authentication required: you must be signed in to save documents.");
  }
  const ownerId = user.userId;
  const doc = { ...record, ownerId };
  // Authoritative write directly to database
  const saved = await clientHttp<DocumentRecord>("/api/documents", { method: "POST", body: JSON.stringify(doc) }, user);
  await localRepo.put(saved);
  return saved;
}

export async function saveDocumentRecord(user: AppUser, record: DocumentRecord): Promise<DocumentRecord> {
  if (!user.isSignedIn || !user.userId) {
    throw new Error("Authentication required: you must be signed in to save documents.");
  }
  const ownerId = user.userId;
  const doc = { ...record, ownerId };
  // Authoritative write directly to database
  const saved = await clientHttp<DocumentRecord>(`/api/documents/${record.id}`, { method: "PUT", body: JSON.stringify(doc) }, user);
  await localRepo.put(saved);
  return saved;
}

export async function deleteDocument(user: AppUser, id: string): Promise<void> {
  if (!user.isSignedIn || !user.userId) {
    throw new Error("Authentication required: you must be signed in to delete documents.");
  }
  await clientHttp<{ ok: true }>(`/api/documents/${id}`, { method: "DELETE" }, user);
  await localRepo.remove(id, user.userId);
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
