/**
 * HTTP security headers, applied to every route from next.config.ts.
 * Pure so it can be unit-tested; the environment decides the few
 * differences (dev needs eval for React refresh; previews load Vercel's
 * toolbar; production adds HSTS and upgrade-insecure-requests).
 */
export type HeaderEnv = { nodeEnv?: string; vercelEnv?: string };

export function contentSecurityPolicy(env: HeaderEnv = {}): string {
  const dev = env.nodeEnv !== "production";
  const preview = env.vercelEnv === "preview";
  const script = ["'self'", "'unsafe-inline'", ...(dev ? ["'unsafe-eval'"] : []), ...(preview ? ["https://vercel.live"] : [])];
  const connect = [
    "'self'",
    // Mapbox GL (M5): tiles, styles and telemetry.
    "https://api.mapbox.com",
    "https://events.mapbox.com",
    "https://*.tiles.mapbox.com",
    ...(dev ? ["ws://localhost:*", "http://localhost:*"] : []),
    ...(preview ? ["https://vercel.live", "wss://*.pusher.com"] : []),
  ];
  const frame = preview ? ["https://vercel.live"] : ["'none'"];
  const directives = [
    `default-src 'self'`,
    `script-src ${script.join(" ")}`,
    `style-src 'self' 'unsafe-inline'`,
    // Avatars (Google), Blob photos later, map tiles.
    `img-src 'self' data: blob: https:`,
    `font-src 'self' data:`,
    `connect-src ${connect.join(" ")}`,
    `worker-src 'self' blob:`,
    `frame-src ${frame.join(" ")}`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ];
  return directives.join("; ");
}

export function securityHeaders(env: HeaderEnv = {}): { key: string; value: string }[] {
  const dev = env.nodeEnv !== "production";
  return [
    { key: "Content-Security-Policy", value: contentSecurityPolicy(env) },
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()" },
    { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
    ...(dev ? [] : [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]),
  ];
}
