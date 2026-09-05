import { clientHttp } from "./client";
import type { AppUser } from "../auth/clerk";

export interface WorkspaceRecord {
  id: string;
  ownerId: string;
  name: string;
  slug: string;
  isDefault: boolean;
  settings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export async function listWorkspaces(user: AppUser): Promise<WorkspaceRecord[]> {
  try {
    return await clientHttp<WorkspaceRecord[]>("/api/workspaces", { method: "GET" }, user);
  } catch (err) {
    console.warn("[workspaces] Failed to fetch workspaces from Neon:", err);
    return [
      {
        id: "default",
        ownerId: user.userId ?? "local",
        name: "Primary Security Workspace",
        slug: "default",
        isDefault: true,
        settings: {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }
}

export async function createWorkspace(
  user: AppUser,
  name: string,
  slug?: string,
  settings?: Record<string, unknown>,
): Promise<WorkspaceRecord> {
  return await clientHttp<WorkspaceRecord>(
    "/api/workspaces",
    {
      method: "POST",
      body: JSON.stringify({ name, slug, settings }),
    },
    user,
  );
}

export async function updateWorkspace(
  user: AppUser,
  workspaceId: string,
  updates: { name?: string; slug?: string; settings?: Record<string, unknown> },
): Promise<WorkspaceRecord> {
  return await clientHttp<WorkspaceRecord>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}`,
    {
      method: "PATCH",
      body: JSON.stringify(updates),
    },
    user,
  );
}

export async function setDefaultWorkspace(
  user: AppUser,
  workspaceId: string,
): Promise<WorkspaceRecord> {
  return await clientHttp<WorkspaceRecord>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}/default`,
    {
      method: "POST",
    },
    user,
  );
}

export async function deleteWorkspace(
  user: AppUser,
  workspaceId: string,
): Promise<{ success: boolean; activeWorkspaceId: string }> {
  return await clientHttp<{ success: boolean; activeWorkspaceId: string }>(
    `/api/workspaces/${encodeURIComponent(workspaceId)}`,
    {
      method: "DELETE",
    },
    user,
  );
}