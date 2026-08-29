import { apiUrl } from "./config";
import { getPlatformStorage } from "../lib/storage";
import { LocalRepository } from "../repository/local";
import type { DocumentRecord, DocumentSummary } from "../repository/types";
import type { AppUser } from "../auth/clerk";

interface AuthLike {
  userId: string | null;
  getToken: () => Promise<string | null>;
}

async function authHeaders(user: AuthLike): Promise<Record<string, string>> {
  try {
    const token = await user.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

async function http<T>(path: string, init: RequestInit, user: AuthLike): Promise<T> {
  const headers = await authHeaders(user);
  const res = await fetch(apiUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...headers,
      ...(init.headers ?? {}),
    },
  });
  const body = await res.text();
  let json: unknown = null;
  try {
    json = body ? JSON.parse(body) : null;
  } catch {
    // Non-JSON response
  }
  if (!res.ok) {
    const msg = (json && typeof json === "object" && "error" in json && typeof (json as { error: unknown }).error === "string")
      ? (json as { error: string }).error
      : `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return json as T;
}

const localRepo = new LocalRepository(getPlatformStorage());

export async function listDocuments(user: AppUser): Promise<DocumentSummary[]> {
  try {
    return await http<DocumentSummary[]>("/api/documents", { method: "GET" }, user);
  } catch (err) {
    // Offline / local fallback for development
    const ownerId = user.userId ?? "local";
    return localRepo.list(ownerId);
  }
}

export async function getDocument(user: AppUser, id: string): Promise<DocumentRecord | null> {
  try {
    return await http<DocumentRecord | null>(`/api/documents/${id}`, { method: "GET" }, user);
  } catch (err) {
    const ownerId = user.userId ?? "local";
    return localRepo.get(id, ownerId);
  }
}

export async function createDocumentRecord(user: AppUser, record: DocumentRecord): Promise<DocumentRecord> {
  const ownerId = user.userId ?? "local";
  const doc = { ...record, ownerId };
  try {
    return await http<DocumentRecord>("/api/documents", { method: "POST", body: JSON.stringify(doc) }, user);
  } catch (err) {
    await localRepo.put(doc);
    return doc;
  }
}

export async function saveDocumentRecord(user: AppUser, record: DocumentRecord): Promise<DocumentRecord> {
  const ownerId = user.userId ?? "local";
  const doc = { ...record, ownerId };
  try {
    return await http<DocumentRecord>(`/api/documents/${record.id}`, { method: "PUT", body: JSON.stringify(doc) }, user);
  } catch (err) {
    await localRepo.put(doc);
    return doc;
  }
}

export async function deleteDocument(user: AppUser, id: string): Promise<void> {
  const ownerId = user.userId ?? "local";
  try {
    await http<{ ok: true }>(`/api/documents/${id}`, { method: "DELETE" }, user);
  } catch (err) {
    await localRepo.remove(id, ownerId);
  }
}

