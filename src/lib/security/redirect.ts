/**
 * Where a user-supplied "come back to" value may send someone: a path on this
 * site and nothing else. `startsWith("/")` alone is not enough: browsers read
 * "/\evil.example" as "//evil.example", a different host. So the value is
 * resolved against a placeholder origin and must stay on it; backslashes and
 * control characters are refused outright. Pure, so the proxy can use it too.
 */
const PLACEHOLDER_ORIGIN = "https://covers.invalid";

export function safeRedirectPath(value: unknown, fallback: string): string;
export function safeRedirectPath(value: unknown, fallback?: null): string | null;
export function safeRedirectPath(value: unknown, fallback: string | null = null): string | null {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return fallback;
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return fallback;
  try {
    const url = new URL(value, PLACEHOLDER_ORIGIN);
    if (url.origin !== PLACEHOLDER_ORIGIN) return fallback;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return fallback;
  }
}
