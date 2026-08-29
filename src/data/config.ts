// Client-safe configuration. Only EXPO_PUBLIC_* values are readable here.
//
// Modern Serverless 1-Click Architecture:
//   Clerk  -> Authentication & session JWTs
//   Neon   -> Serverless Postgres database
//   Groq   -> Ultra-fast, cost-effective LLM generation (Llama 3.3 70B / 8B)

export const DATABASE_URL: string =
  process.env.EXPO_PUBLIC_DATABASE_URL ??
  process.env.DATABASE_URL ??
  "";

export const GROQ_API_KEY: string =
  process.env.EXPO_PUBLIC_GROQ_API_KEY ??
  process.env.GROQ_API_KEY ??
  "";

export const GROQ_BASE_URL: string =
  process.env.EXPO_PUBLIC_GROQ_BASE_URL ??
  "https://api.groq.com/openai/v1";

export const GROQ_MODEL: string =
  process.env.EXPO_PUBLIC_GROQ_MODEL ??
  "llama-3.3-70b-versatile";

export const API_BASE: string = process.env.EXPO_PUBLIC_API_BASE ?? "";

export function apiUrl(path: string): string {
  const base = API_BASE.replace(/\/$/, "");
  return base ? `${base}${path}` : path;
}

export const USE_SERVER: boolean = API_BASE.length > 0;
export const HAS_NEON: boolean = DATABASE_URL.length > 0;
export const HAS_GROQ: boolean = GROQ_API_KEY.length > 0;
