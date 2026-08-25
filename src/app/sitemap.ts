import type { MetadataRoute } from "next";
import { getWorkSlugs } from "@/lib/sanity/getCaseStudy";
import { absoluteUrl } from "@/lib/siteUrl";

/**
 * Matches the rest of the app's Sanity-backed routes: a project published in
 * the Studio should appear here without a redeploy, and the existing
 * /api/revalidate webhook already invalidates the `site-content` tag that
 * getWorkSlugs carries.
 */
export const revalidate = 60;

/**
 * Reuses getWorkSlugs — the same source generateStaticParams uses for
 * /work/[slug] — so the sitemap cannot drift from the routes that actually
 * render. It returns [] when Sanity is unreachable rather than throwing, which
 * degrades to a static-routes-only sitemap instead of a failed build.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: absoluteUrl("/work"), lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: absoluteUrl("/about"), lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: absoluteUrl("/contact"), lastModified: now, changeFrequency: "yearly", priority: 0.7 },
  ];

  const slugs = await getWorkSlugs();
  const caseStudies: MetadataRoute.Sitemap = slugs.map((slug) => ({
    url: absoluteUrl(`/work/${slug}`),
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...staticRoutes, ...caseStudies];
}
