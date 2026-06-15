// Single source of truth for resolving the app's public base URL.
//
// Resolution order — the first source that yields a value wins:
//   1. NEXT_PUBLIC_APP_URL — canonical production domain (set only on
//      Production in Vercel; if it's set on Preview too, every preview
//      will hand out share/admin/edit links pointing at production).
//   2. VERCEL_URL — Vercel injects this per deployment, including
//      previews. It's the deployment's unique host (no protocol).
//   3. The incoming request origin — last resort for route handlers
//      when neither env var is available (e.g. running the build
//      somewhere that isn't Vercel).
//   4. http://localhost:3000 — local dev safety net so absolute URLs
//      stay well-formed before env vars are wired up.
//
// Always returns a value without a trailing slash so callers can
// concatenate paths directly.

function stripTrailingSlash(url: string): string {
  return url.replace(/\/$/, "");
}

export function getAppBaseUrl(req?: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL;
  if (fromEnv) return stripTrailingSlash(fromEnv);

  const vercelHost = process.env.VERCEL_URL;
  if (vercelHost) return `https://${vercelHost}`;

  if (req) return new URL(req.url).origin;

  return "http://localhost:3000";
}
