import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { useAppUser } from "../auth/clerk";
import {
  listWorkspaces,
  createWorkspace,
  setDefaultWorkspace,
  deleteWorkspace,
  type WorkspaceRecord,
} from "../data/workspaces";
import {
  deleteWorkspaceDocumentsLocally,
  cleanupLocalOrphanedDocuments,
} from "../data/documents";

const ACTIVE_WS_STORAGE_KEY = "draftoryn_active_workspace_id";

export interface WorkspaceContextValue {
  workspaces: WorkspaceRecord[];
  activeWorkspace: WorkspaceRecord | null;
  loadingWorkspaces: boolean;
  setActiveWorkspace: (ws: WorkspaceRecord) => Promise<void>;
  createAndSelectWorkspace: (name: string) => Promise<WorkspaceRecord>;
  deleteAndSelectWorkspace: (id: string) => Promise<void>;
  reloadWorkspaces: () => Promise<void>;
}

export const WorkspaceContext = createContext<WorkspaceContextValue>({
  workspaces: [],
  activeWorkspace: null,
  loadingWorkspaces: true,
  setActiveWorkspace: async () => {},
  createAndSelectWorkspace: async () => {
    throw new Error("WorkspaceProvider not initialized");
  },
  deleteAndSelectWorkspace: async () => {},
  reloadWorkspaces: async () => {},
});

export function useWorkspace(): WorkspaceContextValue {
  return useContext(WorkspaceContext);
}

export function WorkspaceProvider({ children }: { children: React.ReactNode }) {
  const user = useAppUser();
  const [workspaces, setWorkspaces] = useState<WorkspaceRecord[]>([]);
  const [activeWorkspace, setActiveWorkspaceState] = useState<WorkspaceRecord | null>(null);
  const [loadingWorkspaces, setLoadingWorkspaces] = useState<boolean>(true);

  const reloadWorkspaces = useCallback(async () => {
    if (!user.isSignedIn || !user.userId) {
      setWorkspaces([]);
      setActiveWorkspaceState(null);
      setLoadingWorkspaces(false);
      return;
    }

    try {
      const list = await listWorkspaces(user);
      setWorkspaces(list);

      // Check stored preference or default
      let targetWs: WorkspaceRecord | null = null;
      if (typeof window !== "undefined" && window.localStorage) {
        const storedId = window.localStorage.getItem(ACTIVE_WS_STORAGE_KEY);
        if (storedId) {
          targetWs = list.find((w) => w.id === storedId) || null;
        }
      }

      if (!targetWs) {
        targetWs = list.find((w) => w.isDefault) || list[0] || null;
      }

      setActiveWorkspaceState(targetWs);
      if (targetWs && typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(ACTIVE_WS_STORAGE_KEY, targetWs.id);
      }
    } catch (e) {
      console.warn("[WorkspaceProvider] Failed to load workspaces:", e);
    } finally {
      setLoadingWorkspaces(false);
    }
  }, [user.isSignedIn, user.userId]);

  useEffect(() => {
    reloadWorkspaces();
  }, [reloadWorkspaces]);

  const setActiveWorkspace = useCallback(
    async (ws: WorkspaceRecord) => {
      setActiveWorkspaceState(ws);
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(ACTIVE_WS_STORAGE_KEY, ws.id);
      }
      try {
        await setDefaultWorkspace(user, ws.id);
        setWorkspaces((prev) =>
          prev.map((w) => ({
            ...w,
            isDefault: w.id === ws.id,
          })),
        );
      } catch (e) {
        console.warn("[WorkspaceProvider] Failed to set default workspace in backend:", e);
      }
    },
    [user],
  );

  const createAndSelectWorkspace = useCallback(
    async (name: string): Promise<WorkspaceRecord> => {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Workspace name is required");
      const created = await createWorkspace(user, trimmed);
      await setDefaultWorkspace(user, created.id);
      if (typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(ACTIVE_WS_STORAGE_KEY, created.id);
      }
      await reloadWorkspaces();
      return created;
    },
    [user, reloadWorkspaces],
  );

  // Self-healing: Automatically clean up any local documents whose workspace was deleted
  useEffect(() => {
    if (user.userId && workspaces.length > 0) {
      const validIds = workspaces.map((w) => w.id);
      cleanupLocalOrphanedDocuments(user.userId, validIds).catch(() => {});
    }
  }, [user.userId, workspaces]);

  const deleteAndSelectWorkspace = useCallback(
    async (id: string): Promise<void> => {
      if (user.userId) {
        await deleteWorkspaceDocumentsLocally(id, user.userId);
      }
      const result = await deleteWorkspace(user, id);
      if (result.activeWorkspaceId && typeof window !== "undefined" && window.localStorage) {
        window.localStorage.setItem(ACTIVE_WS_STORAGE_KEY, result.activeWorkspaceId);
      }
      await reloadWorkspaces();
    },
    [user, reloadWorkspaces],
  );

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces,
        activeWorkspace,
        loadingWorkspaces,
        setActiveWorkspace,
        createAndSelectWorkspace,
        deleteAndSelectWorkspace,
        reloadWorkspaces,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}
