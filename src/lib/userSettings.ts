import { getPlatformStorage } from "./storage";

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

export interface UserSettings {
  defaultExportFormat: UserExportFormat;
  compactLists: boolean;
  testerProfile: TesterProfile;
  clientProfile: ClientProfile;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  defaultExportFormat: "pdf",
  compactLists: false,
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

export async function getUserSettings(): Promise<UserSettings> {
  try {
    const storage = getPlatformStorage();
    const raw = await storage.get(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_USER_SETTINGS };
    const parsed = JSON.parse(raw);
    return {
      defaultExportFormat: parsed.defaultExportFormat || DEFAULT_USER_SETTINGS.defaultExportFormat,
      compactLists: Boolean(parsed.compactLists),
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
): Promise<UserSettings> {
  try {
    const current = await getUserSettings();
    const updated: UserSettings = {
      defaultExportFormat: settings.defaultExportFormat ?? current.defaultExportFormat,
      compactLists: settings.compactLists !== undefined ? settings.compactLists : current.compactLists,
      testerProfile: {
        ...current.testerProfile,
        ...(settings.testerProfile || {}),
      },
      clientProfile: {
        ...current.clientProfile,
        ...(settings.clientProfile || {}),
      },
    };
    const storage = getPlatformStorage();
    await storage.set(STORAGE_KEY, JSON.stringify(updated));
    return updated;
  } catch (err) {
    console.error("Failed to save user settings:", err);
    return { ...DEFAULT_USER_SETTINGS, ...settings } as UserSettings;
  }
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
