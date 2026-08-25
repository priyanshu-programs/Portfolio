/**
 * The site's own canonical origin.
 *
 * Everything SEO-facing needs an absolute URL: `metadataBase` resolves relative
 * OG image paths against it, the sitemap emits absolute `<loc>` entries, and
 * canonical tags point at it. Nothing else in the app knew the site's own
 * address before this — Sanity supplies content, not deployment identity.
 *
 * Resolution order, most to least authoritative:
 *
 *  1. `NEXT_PUBLIC_SITE_URL` — the real production origin. Set this once a
 *     custom domain exists; a canonical pointing at the wrong host is worse
 *     than none, since it tells Google to index an address you don't own.
 *  2. `VERCEL_PROJECT_PRODUCTION_URL` — Vercel's stable production hostname,
 *     which (unlike VERCEL_URL) does not change per deployment.
 *  3. `VERCEL_URL` — the per-deployment hostname. Right for preview builds,
 *     where each deploy legitimately has its own address.
 *  4. Localhost, for `next dev` and local prod runs.
 *
 * Both Vercel vars arrive without a protocol, hence the prefixing below.
 */
const FALLBACK_ORIGIN = "http://localhost:3000";

function normalize(raw: string): string {
  const withProtocol = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  // Trailing slashes would produce `//about` when joined with a path.
  return withProtocol.replace(/\/+$/, "");
}

function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (explicit) return normalize(explicit);

  const vercelProduction = process.env.VERCEL_PROJECT_PRODUCTION_URL?.trim();
  if (vercelProduction) return normalize(vercelProduction);

  const vercelDeployment = process.env.VERCEL_URL?.trim();
  if (vercelDeployment) return normalize(vercelDeployment);

  return FALLBACK_ORIGIN;
}

/** Absolute origin, no trailing slash. e.g. `https://example.com` */
export const SITE_URL = resolveSiteUrl();

/**
 * Join a route path onto the canonical origin.
 *
 * Note that `metadataBase` already resolves relative paths for OG images, so
 * this is for the places that need a genuinely absolute string up front —
 * sitemap entries and JSON-LD `@id`/`url` fields.
 */
export function absoluteUrl(path = "/"): string {
  if (!path || path === "/") return SITE_URL;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}
