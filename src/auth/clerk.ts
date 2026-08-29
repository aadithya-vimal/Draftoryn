import { useMemo } from "react";
import { Platform } from "react-native";
import { useAuth as useClerkAuth, useUser, useClerk } from "@clerk/expo";
import type { TokenCache } from "@clerk/expo";

// On native platforms Clerk needs a token cache backed by secure storage.
// On web the browser manages the session and no cache is required.
let tokenCache: TokenCache | undefined;
if (Platform.OS !== "web") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require("@clerk/expo/token-cache");
    tokenCache = mod.default ?? mod.tokenCache;
  } catch {
    tokenCache = undefined;
  }
}

const rawKey = process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY;
export const CLERK_PUBLISHABLE_KEY: string | undefined =
  rawKey && !rawKey.includes("xxx") && rawKey.startsWith("pk_")
    ? rawKey
    : undefined;

export function getTokenCache(): TokenCache | undefined {
  return tokenCache;
}

export interface AppUser {
  userId: string | null;
  email: string | null;
  name: string | null;
  isLoaded: boolean;
  isSignedIn: boolean;
  getToken: () => Promise<string | null>;
  signOut: () => Promise<void>;
}

export function useAppUser(): AppUser {
  const { isLoaded, isSignedIn, userId, getToken: clerkGetToken, signOut: clerkSignOut } = useClerkAuth();
  const { user } = useUser();

  const value = useMemo<AppUser>(() => {
    return {
      userId: userId ?? null,
      email: user?.primaryEmailAddress?.emailAddress ?? null,
      name: user?.fullName ?? user?.firstName ?? null,
      isLoaded,
      isSignedIn: !!isSignedIn,
      getToken: async () => {
        const t = await clerkGetToken();
        return t ?? null;
      },
      signOut: async () => {
        await clerkSignOut();
      },
    };
  }, [isLoaded, isSignedIn, userId, user, clerkGetToken, clerkSignOut]);

  return value;
}

export function useClerkSignOutFallback(): () => Promise<void> {
  const { signOut } = useClerk();
  return signOut;
}
