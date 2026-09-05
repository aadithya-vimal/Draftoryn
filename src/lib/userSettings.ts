import { getPlatformStorage } from "./storage";
import { clientHttp, type AuthLike } from "../data/client";
import type { AiProviderType } from "../engine/ai/providers";

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

export interface AiSettings {
  defaultProvider: AiProviderType;
  openaiApiKey?: string;
  openaiModel?: string;
  anthropicApiKey?: string;
  anthropicModel?: string;
  groqApiKey?: string;
  groqModel?: string;
  geminiApiKey?: string;
  geminiModel?: string;
}

export const DEFAULT_AI_SETTINGS: AiSettings = {
  defaultProvider: "openai",
  openaiApiKey: "",
  openaiModel: "gpt-4o-mini",
  anthropicApiKey: "",
  anthropicModel: "claude-3-5-sonnet-20241022",
  groqApiKey: "",
  groqModel: "llama-3.3-70b-versatile",
  geminiApiKey: "",
  geminiModel: "gemini-1.5-flash",
};

export interface UserSettings {
  defaultExportFormat: UserExportFormat;
  compactLists: boolean;
  themeMode: ThemeMode;
  sessionTimeoutMinutes: number;
  testerProfile: TesterProfile;
  clientProfile: ClientProfile;
  aiSettings: AiSettings;
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
  aiSettings: DEFAULT_AI_SETTINGS,
};

const STORAGE_KEY = "draftoryn_user_settings_v1";
const AI_KEYS_LOCAL_STORAGE_KEY = "draftoryn_ai_keys_secure_local_v1";

interface SecureLocalAiKeys {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  groqApiKey?: string;
  geminiApiKey?: string;
}

const AI_MODELS_LOCAL_STORAGE_KEY = "draftoryn_ai_models_v1";

export async function getLocalAiModels(): Promise<Partial<AiSettings>> {
  try {
    const storage = getPlatformStorage();
    const raw = await storage.get(AI_MODELS_LOCAL_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export async function saveLocalAiModels(models: Partial<AiSettings>): Promise<void> {
  try {
    const storage = getPlatformStorage();
    const existing = await getLocalAiModels();
    await storage.set(AI_MODELS_LOCAL_STORAGE_KEY, JSON.stringify({ ...existing, ...models }));
  } catch {
    // Local storage error ignored
  }
}

async function getLocalAiKeys(): Promise<SecureLocalAiKeys> {
  try {
    const storage = getPlatformStorage();
    const raw = await storage.get(AI_KEYS_LOCAL_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

async function saveLocalAiKeys(keys: SecureLocalAiKeys): Promise<void> {
  try {
    const storage = getPlatformStorage();
    await storage.set(AI_KEYS_LOCAL_STORAGE_KEY, JSON.stringify(keys));
  } catch {
    // Local storage error ignored
  }
}

export async function getUserSettings(user?: AuthLike | null): Promise<UserSettings> {
  const storage = getPlatformStorage();
  const localKeys = await getLocalAiKeys();
  const localModels = await getLocalAiModels();

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
        aiSettings?: Record<string, unknown>;
      }>("/api/settings", { method: "GET" }, user);

      if (remote) {
        const remotePrefs = (remote.testerProfile as Record<string, unknown>) || {};
        const remoteAi = (remote.aiSettings as Partial<AiSettings>) || {};
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
          aiSettings: {
            defaultProvider: remoteAi.defaultProvider || localModels.defaultProvider || DEFAULT_AI_SETTINGS.defaultProvider,
            openaiModel: remoteAi.openaiModel || localModels.openaiModel || DEFAULT_AI_SETTINGS.openaiModel,
            anthropicModel: remoteAi.anthropicModel || localModels.anthropicModel || DEFAULT_AI_SETTINGS.anthropicModel,
            groqModel: remoteAi.groqModel || localModels.groqModel || DEFAULT_AI_SETTINGS.groqModel,
            geminiModel: remoteAi.geminiModel || localModels.geminiModel || DEFAULT_AI_SETTINGS.geminiModel,
            // API keys are strictly loaded from local storage only - NEVER from database
            openaiApiKey: localKeys.openaiApiKey ?? "",
            anthropicApiKey: localKeys.anthropicApiKey ?? "",
            groqApiKey: localKeys.groqApiKey ?? "",
            geminiApiKey: localKeys.geminiApiKey ?? "",
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
    if (!raw) {
      return {
        ...DEFAULT_USER_SETTINGS,
        aiSettings: {
          ...DEFAULT_AI_SETTINGS,
          ...localKeys,
        },
      };
    }
    const parsed = JSON.parse(raw);
    const parsedAi = parsed.aiSettings || {};
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
      aiSettings: {
        defaultProvider: parsedAi.defaultProvider || DEFAULT_AI_SETTINGS.defaultProvider,
        openaiModel: parsedAi.openaiModel || DEFAULT_AI_SETTINGS.openaiModel,
        anthropicModel: parsedAi.anthropicModel || DEFAULT_AI_SETTINGS.anthropicModel,
        groqModel: parsedAi.groqModel || DEFAULT_AI_SETTINGS.groqModel,
        geminiModel: parsedAi.geminiModel || DEFAULT_AI_SETTINGS.geminiModel,
        openaiApiKey: localKeys.openaiApiKey ?? parsedAi.openaiApiKey ?? "",
        anthropicApiKey: localKeys.anthropicApiKey ?? parsedAi.anthropicApiKey ?? "",
        groqApiKey: localKeys.groqApiKey ?? parsedAi.groqApiKey ?? "",
        geminiApiKey: localKeys.geminiApiKey ?? parsedAi.geminiApiKey ?? "",
      },
    };
  } catch {
    return {
      ...DEFAULT_USER_SETTINGS,
      aiSettings: {
        ...DEFAULT_AI_SETTINGS,
        ...localKeys,
      },
    };
  }
}

export async function saveUserSettings(
  settings: Partial<UserSettings>,
  user?: AuthLike | null,
): Promise<UserSettings> {
  const storage = getPlatformStorage();
  const current = await getUserSettings(user);

  const newAiSettings: AiSettings = {
    ...current.aiSettings,
    ...(settings.aiSettings || {}),
  };

  // 1. Securely save API keys ONLY in local storage
  await saveLocalAiKeys({
    openaiApiKey: newAiSettings.openaiApiKey ?? "",
    anthropicApiKey: newAiSettings.anthropicApiKey ?? "",
    groqApiKey: newAiSettings.groqApiKey ?? "",
    geminiApiKey: newAiSettings.geminiApiKey ?? "",
  });

  // 2. Persist chosen models to local storage
  await saveLocalAiModels({
    openaiModel: newAiSettings.openaiModel,
    anthropicModel: newAiSettings.anthropicModel,
    groqModel: newAiSettings.groqModel,
    geminiModel: newAiSettings.geminiModel,
    defaultProvider: newAiSettings.defaultProvider,
  });

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
    aiSettings: newAiSettings,
  };

  // Cache locally for instant UI responsiveness
  try {
    await storage.set(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Local storage warning ignored
  }

  // Persist authoritatively to Neon: strictly STRIP all API keys so they are never sent to or stored in DB
  if (user && user.userId) {
    try {
      const sanitizedAiSettingsForDb = {
        defaultProvider: updated.aiSettings.defaultProvider,
        openaiModel: updated.aiSettings.openaiModel,
        anthropicModel: updated.aiSettings.anthropicModel,
        groqModel: updated.aiSettings.groqModel,
        geminiModel: updated.aiSettings.geminiModel,
      };

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
            aiSettings: sanitizedAiSettingsForDb,
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
