import type { DocumentStatus, DocumentVersion } from "../engine/types";
export type { DocumentStatus, DocumentVersion };

export interface DocumentRecord {
  id: string;
  definitionId: string;
  ownerId: string;
  workspaceId?: string;
  title: string;
  status: DocumentStatus;
  createdAt: string;
  updatedAt: string;
  currentVersionId: string;
  source: Record<string, unknown>;
  versions: DocumentVersion[];
}

export interface DocumentSummary {
  id: string;
  definitionId: string;
  category: string;
  workspaceId?: string;
  title: string;
  status: DocumentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface StorageAdapter {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  remove(key: string): Promise<void>;
  keys(prefix?: string): Promise<string[]>;
}

export interface Repository {
  list(ownerId: string, workspaceId?: string): Promise<DocumentSummary[]>;
  get(id: string, ownerId: string): Promise<DocumentRecord | null>;
  put(record: DocumentRecord): Promise<void>;
  remove(id: string, ownerId: string): Promise<void>;
  removeByWorkspace?(workspaceId: string, ownerId: string): Promise<void>;
  cleanupOrphanedDocuments?(ownerId: string, validWorkspaceIds: string[]): Promise<void>;
}
