import { API_BASE, USE_SERVER, DATABASE_URL, HAS_NEON, apiUrl } from "./config";
import { getPlatformStorage } from "../lib/storage";
import { LocalRepository } from "../repository/local";
import { NeonRepository } from "../repository/neon";
import type { DocumentRecord, DocumentSummary, Repository } from "../repository/types";
import type { AppUser } from "../auth/clerk";

interface AuthLike {
  userId: string | null;
  getToken: () => Promise<string | null>;
}

async function authHeaders(user: AuthLike): Promise<Record<string, string>> {
  const token = await user.getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function http<T>(path: string, init: RequestInit, user: AuthLike): Promise<T> {
  const res = await fetch(apiUrl(path), {
    ...init,
    headers: { "Content-Type": "application/json", ...(await authHeaders(user)), ...(init.headers ?? {}) },
  });
  const body = await res.text();
  const json = body ? JSON.parse(body) : null;
  if (!res.ok) throw new Error((json && json.error) || `Request failed (${res.status})`);
  return json as T;
}

let _neonRepo: NeonRepository | null = null;

async function getRepository(): Promise<Repository> {
  if (HAS_NEON) {
    if (!_neonRepo) {
      _neonRepo = new NeonRepository(DATABASE_URL);
    }
    return _neonRepo;
  }
  return new LocalRepository(getPlatformStorage());
}

export async function listDocuments(user: AppUser): Promise<DocumentSummary[]> {
  const ownerId = user.userId ?? "local";
  if (USE_SERVER) {
    return http<DocumentSummary[]>("/api/documents", { method: "GET" }, user);
  }
  const repo = await getRepository();
  return repo.list(ownerId);
}

export async function getDocument(user: AppUser, id: string): Promise<DocumentRecord | null> {
  const ownerId = user.userId ?? "local";
  if (USE_SERVER) {
    return http<DocumentRecord | null>(`/api/documents/${id}`, { method: "GET" }, user);
  }
  const repo = await getRepository();
  return repo.get(id, ownerId);
}

export async function createDocumentRecord(user: AppUser, record: DocumentRecord): Promise<DocumentRecord> {
  const ownerId = user.userId ?? "local";
  const doc = { ...record, ownerId };
  if (USE_SERVER) {
    return http<DocumentRecord>("/api/documents", { method: "POST", body: JSON.stringify(doc) }, user);
  }
  const repo = await getRepository();
  await repo.put(doc);
  return doc;
}

export async function saveDocumentRecord(user: AppUser, record: DocumentRecord): Promise<DocumentRecord> {
  const ownerId = user.userId ?? "local";
  const doc = { ...record, ownerId };
  if (USE_SERVER) {
    return http<DocumentRecord>(`/api/documents/${record.id}`, { method: "PUT", body: JSON.stringify(doc) }, user);
  }
  const repo = await getRepository();
  await repo.put(doc);
  return doc;
}

export async function deleteDocument(user: AppUser, id: string): Promise<void> {
  const ownerId = user.userId ?? "local";
  if (USE_SERVER) {
    await http<{ ok: true }>(`/api/documents/${id}`, { method: "DELETE" }, user);
    return;
  }
  const repo = await getRepository();
  await repo.remove(id, ownerId);
}

export const API_BASE_FOR_DEBUG = API_BASE;
