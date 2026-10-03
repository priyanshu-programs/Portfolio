import type { MetadataRoute } from "next";
import { getWorkSitemapEntries } from "@/lib/sanity/getCaseStudy";
import { absoluteUrl } from "@/lib/siteUrl";

/**
 * Matches the rest of the app's Sanity-backed routes: a project published in
 * the Studio should appear here without a redeploy, and the existing
 * /api/revalidate webhook already invalidates the `site-content` tag that
 * getWorkSlugs carries.
 */
export const revalidate = 60;

/**
 * The static routes' own last substantive change, hand-maintained.
 *
 * Deliberately a constant and not `new Date()`. Stamping the build time made
 * every entry claim it changed on every deploy, and Google's documented
 * response to a `lastmod` that is perpetually "now" is to stop trusting the
 * field — on the whole sitemap, not just the lying rows. A date that is
 * slightly stale is a usable signal; one that is always current is noise.
 *
 * Bump this when a static page's content actually changes. The case studies
 * below need no such discipline: Sanity stamps `_updatedAt` for them.
 */
const STATIC_ROUTES_LAST_MODIFIED = new Date("2026-10-03");

/**
 * Reuses getWorkSitemapEntries — the same publishable filter
 * generateStaticParams uses for /work/[slug] — so the sitemap cannot drift from
 * the routes that actually render. It returns [] when Sanity is unreachable
 * rather than throwing, which degrades to a static-routes-only sitemap instead
 * of a failed build.
 *
 * No `changeFrequency` or `priority` on any entry: Google has said for years it
 * ignores both, and a file that only asserts what is actually read is easier to
 * trust than one padded with hints that aren't.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: STATIC_ROUTES_LAST_MODIFIED },
    { url: absoluteUrl("/work"), lastModified: STATIC_ROUTES_LAST_MODIFIED },
    { url: absoluteUrl("/about"), lastModified: STATIC_ROUTES_LAST_MODIFIED },
    { url: absoluteUrl("/contact"), lastModified: STATIC_ROUTES_LAST_MODIFIED },
  ];

  const entries = await getWorkSitemapEntries();
  const caseStudies: MetadataRoute.Sitemap = entries.map(
    ({ slug, updatedAt }) => ({
      url: absoluteUrl(`/work/${slug}`),
      // A document with no _updatedAt is not a real case; falling back to the
      // static date keeps the field present rather than emitting an invalid one.
      lastModified: updatedAt ? new Date(updatedAt) : STATIC_ROUTES_LAST_MODIFIED,
    })
  );

  return [...staticRoutes, ...caseStudies];
}
