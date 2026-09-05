import { getPlatformStorage } from "./storage";
import { clientHttp, type AuthLike } from "../data/client";

export type UserExportFormat = "pdf" | "docx" | "markdown" | "html" | "json" | "xml" | "yaml";

export interface TesterProfile {
  providerName: string;
  providerContactName: string;
  providerContactEmail: string;
  providerDepartment: string;
  providerPhone?: string;
}

export interface ClientProfile {
  clientName: string;
  clientContactName: string;
  clientContactEmail: string;
  clientDepartment: string;
  clientPhone?: string;
  authorizedBy: string;
}

export type ThemeMode = "dark" | "light";

export interface UserSettings {
  defaultExportFormat: UserExportFormat;
  compactLists: boolean;
  themeMode: ThemeMode;
  sessionTimeoutMinutes: number;
  testerProfile: TesterProfile;
  clientProfile: ClientProfile;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  defaultExportFormat: "pdf",
  compactLists: false,
  themeMode: "dark",
  sessionTimeoutMinutes: 15,
  testerProfile: {
    providerName: "",
    providerContactName: "",
    providerContactEmail: "",
    providerDepartment: "",
    providerPhone: "",
  },
  clientProfile: {
    clientName: "",
    clientContactName: "",
    clientContactEmail: "",
    clientDepartment: "",
    clientPhone: "",
    authorizedBy: "",
  },
};

const STORAGE_KEY = "draftoryn_user_settings_v1";

export async function getUserSettings(user?: AuthLike | null): Promise<UserSettings> {
  const storage = getPlatformStorage();

  // 1. Authoritative fetch from Neon if user is authenticated
  if (user && user.userId) {
    try {
      const remote = await clientHttp<{
        defaultExportFormat?: string;
        compactLists?: boolean;
        themeMode?: string;
        sessionTimeoutMinutes?: number;
        testerProfile?: Record<string, unknown>;
        clientProfile?: Record<string, unknown>;
      }>("/api/settings", { method: "GET" }, user);

      if (remote) {
        const remotePrefs = (remote.testerProfile as Record<string, unknown>) || {};
        const merged: UserSettings = {
          defaultExportFormat: (remote.defaultExportFormat as UserExportFormat) || DEFAULT_USER_SETTINGS.defaultExportFormat,
          compactLists: Boolean(remote.compactLists),
          themeMode: (remote.themeMode as ThemeMode) || (remotePrefs.themeMode as ThemeMode) || DEFAULT_USER_SETTINGS.themeMode,
          sessionTimeoutMinutes:
            typeof remote.sessionTimeoutMinutes === "number"
              ? remote.sessionTimeoutMinutes
              : typeof remotePrefs.sessionTimeoutMinutes === "number"
              ? remotePrefs.sessionTimeoutMinutes
              : DEFAULT_USER_SETTINGS.sessionTimeoutMinutes,
          testerProfile: {
            ...DEFAULT_USER_SETTINGS.testerProfile,
            ...((remote.testerProfile as Partial<TesterProfile>) || {}),
          },
          clientProfile: {
            ...DEFAULT_USER_SETTINGS.clientProfile,
            ...((remote.clientProfile as Partial<ClientProfile>) || {}),
          },
        };
        await storage.set(STORAGE_KEY, JSON.stringify(merged));
        return merged;
      }
    } catch {
      // Fall back to storage cache if offline
    }
  }

  // 2. Local storage fallback
  try {
    const raw = await storage.get(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_USER_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      defaultExportFormat: parsed.defaultExportFormat || DEFAULT_USER_SETTINGS.defaultExportFormat,
      compactLists: Boolean(parsed.compactLists),
      themeMode: parsed.themeMode || DEFAULT_USER_SETTINGS.themeMode,
      sessionTimeoutMinutes: typeof parsed.sessionTimeoutMinutes === "number" ? parsed.sessionTimeoutMinutes : DEFAULT_USER_SETTINGS.sessionTimeoutMinutes,
      testerProfile: {
        ...DEFAULT_USER_SETTINGS.testerProfile,
        ...(parsed.testerProfile || {}),
      },
      clientProfile: {
        ...DEFAULT_USER_SETTINGS.clientProfile,
        ...(parsed.clientProfile || {}),
      },
    };
  } catch {
    return { ...DEFAULT_USER_SETTINGS };
  }
}

export async function saveUserSettings(
  settings: Partial<UserSettings>,
  user?: AuthLike | null,
): Promise<UserSettings> {
  const storage = getPlatformStorage();
  const current = await getUserSettings(user);
  const updated: UserSettings = {
    defaultExportFormat: settings.defaultExportFormat ?? current.defaultExportFormat,
    compactLists: settings.compactLists !== undefined ? settings.compactLists : current.compactLists,
    themeMode: settings.themeMode ?? current.themeMode,
    sessionTimeoutMinutes: settings.sessionTimeoutMinutes ?? current.sessionTimeoutMinutes,
    testerProfile: {
      ...current.testerProfile,
      ...(settings.testerProfile || {}),
    },
    clientProfile: {
      ...current.clientProfile,
      ...(settings.clientProfile || {}),
    },
  };

  // Cache locally for instant UI responsiveness
  try {
    await storage.set(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Local storage warning ignored
  }

  // Persist authoritatively to Neon
  if (user && user.userId) {
    try {
      await clientHttp(
        "/api/settings",
        {
          method: "PUT",
          body: JSON.stringify({
            defaultExportFormat: updated.defaultExportFormat,
            compactLists: updated.compactLists,
            themeMode: updated.themeMode,
            sessionTimeoutMinutes: updated.sessionTimeoutMinutes,
            testerProfile: updated.testerProfile,
            clientProfile: updated.clientProfile,
          }),
        },
        user,
      );
    } catch (err) {
      console.error("[userSettings] Failed to persist to Neon:", err);
      throw err;
    }
  }

  return updated;
}

export function autofillFromProfiles(
  currentSource: Record<string, unknown>,
  settings: UserSettings,
  target: "all" | "tester" | "client" = "all",
): Record<string, unknown> {
  const result = { ...currentSource };
  const { testerProfile, clientProfile } = settings;

  if (target === "all" || target === "tester") {
    if (testerProfile.providerName?.trim()) {
      result.providerName = testerProfile.providerName.trim();
    }
    if (testerProfile.providerContactName?.trim()) {
      result.providerContactName = testerProfile.providerContactName.trim();
    }
    if (testerProfile.providerContactEmail?.trim()) {
      result.providerContactEmail = testerProfile.providerContactEmail.trim();
    }
    if (testerProfile.providerDepartment?.trim()) {
      result.providerDepartment = testerProfile.providerDepartment.trim();
    }
    if (testerProfile.providerPhone?.trim()) {
      result.providerPhone = testerProfile.providerPhone.trim();
    }
  }

  if (target === "all" || target === "client") {
    if (clientProfile.clientName?.trim()) {
      result.clientName = clientProfile.clientName.trim();
    }
    if (clientProfile.clientContactName?.trim()) {
      result.clientContactName = clientProfile.clientContactName.trim();
    }
    if (clientProfile.clientContactEmail?.trim()) {
      result.clientContactEmail = clientProfile.clientContactEmail.trim();
    }
    if (clientProfile.clientDepartment?.trim()) {
      result.clientDepartment = clientProfile.clientDepartment.trim();
    }
    if (clientProfile.clientPhone?.trim()) {
      result.clientPhone = clientProfile.clientPhone.trim();
    }
    if (clientProfile.authorizedBy?.trim()) {
      result.authorizedBy = clientProfile.authorizedBy.trim();
    }
  }

  return result;
}
