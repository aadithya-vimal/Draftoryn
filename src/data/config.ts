// Client-safe configuration. ONLY public EXPO_PUBLIC_* configuration is exposed here.
// Privileged credentials (DATABASE_URL, CLERK_SECRET_KEY, AI API keys) live exclusively
// on the server runtime and are NEVER imported into the client bundle.

const PRODUCTION_API_URL = "https://draftoryn-api.aadithyavimal-work.workers.dev";

function resolveApiBase(): string {
  const envBase = process.env.EXPO_PUBLIC_API_BASE;
  if (typeof window !== "undefined" && window.location && window.location.hostname) {
    const host = window.location.hostname;
    const isLocal = host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0";
    if (!isLocal) {
      if (!envBase || envBase.includes("localhost") || envBase.includes("127.0.0.1")) {
        return PRODUCTION_API_URL;
      }
      return envBase;
    }
  }
  return envBase || "http://localhost:8787";
}

export const API_BASE: string = resolveApiBase();

export function apiUrl(path: string): string {
  const base = resolveApiBase().replace(/\/$/, "");
  if (!base) return path;
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}

export const CLERK_PUBLISHABLE_KEY: string =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

