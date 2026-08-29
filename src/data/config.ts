// Client-safe configuration. ONLY public EXPO_PUBLIC_* configuration is exposed here.
// Privileged credentials (DATABASE_URL, CLERK_SECRET_KEY, AI API keys) live exclusively
// on the server runtime and are NEVER imported into the client bundle.

export const API_BASE: string = process.env.EXPO_PUBLIC_API_BASE ?? "";

export function apiUrl(path: string): string {
  const base = API_BASE.replace(/\/$/, "");
  if (!base) return path;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export const CLERK_PUBLISHABLE_KEY: string =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

