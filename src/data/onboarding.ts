import { clientHttp, type AuthLike } from "./client";

export interface OnboardingData {
  persona?: "cybersecurity_professional" | "client" | "technical_professional" | string;
  role?: string;
  documentFocus?: string;
  focusAreas?: string[];
  firstDocumentDef?: string;
  organizationName?: string;
  representativeName?: string;
  workspaceName?: string;
  defaultExportFormat?: string;
  experienceLevel?: string;
  [key: string]: unknown;
}

export interface UserMeResponse {
  user: {
    id: string;
    email: string | null;
    name: string | null;
    avatarUrl: string | null;
    role: string;
    onboardingCompleted: boolean;
    onboardingStep: number;
    onboardingData: OnboardingData;
    createdAt: string;
    updatedAt: string;
  };
  workspace: {
    id: string;
    ownerId: string;
    name: string;
    slug: string;
    isDefault: boolean;
    settings: Record<string, unknown>;
    createdAt: string;
    updatedAt: string;
  };
  settings: {
    userId: string;
    defaultExportFormat: string;
    compactLists: boolean;
    testerProfile: Record<string, unknown>;
    clientProfile: Record<string, unknown>;
  };
}

export async function fetchUserMe(user: AuthLike): Promise<UserMeResponse | null> {
  try {
    return await clientHttp<UserMeResponse>("/api/user/me", { method: "GET" }, user);
  } catch {
    return null;
  }
}

export async function saveOnboardingProgress(
  user: AuthLike,
  updates: {
    completed?: boolean;
    step?: number;
    role?: string;
    persona?: string;
    workspaceName?: string;
    organizationName?: string;
    representativeName?: string;
    defaultExportFormat?: string;
    onboardingData?: OnboardingData;
  },
): Promise<boolean> {
  try {
    await clientHttp(
      "/api/user/onboarding",
      {
        method: "POST",
        body: JSON.stringify(updates),
      },
      user,
    );
    return true;
  } catch (e) {
    console.error("[onboarding] Failed to save onboarding to Neon:", e);
    return false;
  }
}
