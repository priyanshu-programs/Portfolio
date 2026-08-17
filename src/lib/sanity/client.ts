import { createClient, type SanityClient } from "@sanity/client";

// These are safe to expose to the browser (public project identifiers).
export const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
export const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";
export const apiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? "2025-01-01";

/**
 * Whether a Sanity project is wired up. When false, the whole site falls back
 * to its hardcoded content, so the app builds and renders unchanged until the
 * owner creates a project and fills in `.env.local`.
 */
export const sanityConfigured = Boolean(projectId);

/**
 * In production the graceful fallback above is a trap, not a kindness: `/work`
 * has no hardcoded project list, so a build without this variable silently
 * ships an empty archive page and every CMS image resolves to undefined. That
 * is exactly what a missing Vercel env var produced once already, and it left
 * no trace in the build log. Fail the build instead.
 *
 * `NEXT_PUBLIC_*` is inlined at build time, so this fires during `next build`
 * on the host — the only moment where the value still matters. The scripts in
 * scripts/sanity/ raise their own clearer errors from writeClient.ts before
 * reaching a query, and run under NODE_ENV=development anyway.
 */
if (!projectId && process.env.NODE_ENV === "production") {
  throw new Error(
    "NEXT_PUBLIC_SANITY_PROJECT_ID is not set. The production build reads all " +
      "content from Sanity, so without it /work renders empty and every CMS " +
      "image breaks. Set it (plus NEXT_PUBLIC_SANITY_DATASET and " +
      "NEXT_PUBLIC_SANITY_API_VERSION) in your host's environment variables — " +
      "on Vercel: Settings -> Environment Variables, scoped to Production — " +
      "then redeploy. See SANITY_SETUP.md - Deploying."
  );
}

export const sanityClient: SanityClient | null = sanityConfigured
  ? createClient({
      projectId: projectId as string,
      dataset,
      apiVersion,
      // Never resolve drafts. apiVersion 2025-01-01 predates the v2025-02-19
      // default change, so without this the client is on the legacy `raw`
      // perspective and an unpublished `drafts.*` doc would win queries like
      // `*[_type == "hero"][0]` and render as if it were live.
      perspective: "published",
      // Sanity's edge CDN caches for ~60s, which stacks on top of Next's own
      // cache and can let a background revalidation re-cache stale content.
      // In dev that makes freshly published edits invisible, so only use it in
      // production — where Next's cache already absorbs the request volume.
      useCdn: process.env.NODE_ENV === "production",
    })
  : null;

/**
 * Logged wherever an unconfigured client short-circuits a fetch. Without this
 * the likeliest failure mode — no project ID — is the only one that returns
 * null without saying anything, so a blank page looks identical to a Sanity
 * outage in the logs. Every other branch already logs via its catch.
 */
export function warnUnconfigured(fn: string): void {
  console.error(
    `[sanity] ${fn}: skipped — NEXT_PUBLIC_SANITY_PROJECT_ID is not set, so ` +
      `no client exists. Falling back to hardcoded content (/work has none ` +
      `and will render empty). See SANITY_SETUP.md - Deploying.`
  );
}
