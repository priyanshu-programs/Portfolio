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
