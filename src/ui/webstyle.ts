// Dependency-free style flattening for raw DOM nodes on web.
// React DOM throws ("Failed to set an indexed property on
// 'CSSStyleDeclaration'") when a host element receives an array style or
// numeric keys, so every value forwarded to a plain <div>/<span> goes
// through here: nested arrays are flattened recursively, falsy entries are
// dropped, and RNW compiler metadata ($$css) is stripped.

export type WebStyleInput = Record<string, unknown> | Array<unknown> | null | undefined | false;

export function flattenWebStyle(style?: WebStyleInput): Record<string, unknown> | undefined {
  if (!style) return undefined;
  const out: Record<string, unknown> = {};
  const visit = (s: unknown): void => {
    if (!s || typeof s !== "object") return;
    if (Array.isArray(s)) {
      for (const item of s) visit(item);
      return;
    }
    for (const key of Object.keys(s as Record<string, unknown>)) {
      if (key === "$$css" || key === "$$css$localize") continue;
      out[key] = (s as Record<string, unknown>)[key];
    }
  };
  visit(style);
  return out;
}
