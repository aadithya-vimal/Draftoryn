import { apiUrl } from "./config";

export interface AuthLike {
  userId: string | null;
  getToken: () => Promise<string | null>;
}

export async function authHeaders(user?: AuthLike | null): Promise<Record<string, string>> {
  if (!user) return {};
  try {
    const token = await user.getToken();
    return token ? { Authorization: `Bearer ${token}` } : {};
  } catch {
    return {};
  }
}

export async function clientHttp<T>(
  path: string,
  init: RequestInit = {},
  user?: AuthLike | null,
): Promise<T> {
  const headers = await authHeaders(user);
  const res = await fetch(apiUrl(path), {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...headers,
      ...(init.headers ?? {}),
    },
  });

  const body = await res.text();
  let json: unknown = null;
  try {
    json = body ? JSON.parse(body) : null;
  } catch {
    // Non-JSON response
  }

  if (!res.ok) {
    const msg =
      json && typeof json === "object" && "error" in json && typeof (json as { error: unknown }).error === "string"
        ? (json as { error: string }).error
        : `Request failed (${res.status})`;
    throw new Error(msg);
  }

  return json as T;
}
