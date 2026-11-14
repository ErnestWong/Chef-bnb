/** Absolute URL for links in emails and share buttons; NEXT_PUBLIC_APP_URL is the Vercel URL now, the real domain later. */
export function appUrl(path: string, env: Record<string, string | undefined> = process.env): string {
  const base = (env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
