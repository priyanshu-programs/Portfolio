/**
 * Notifies Bing/Yandex via IndexNow that this site's URLs exist or changed.
 * Run manually after publishing new content: npm run indexnow:ping
 *
 * Google ignores IndexNow entirely (GSC's own sitemap submission covers it),
 * so this only matters for Bing Webmaster Tools and Yandex.
 *
 * Builds its own Sanity client and slug query rather than importing
 * src/app/sitemap.ts's getWorkSlugs, matching scripts/sanity/verify.mts's
 * convention of standing scripts up independently of the "server-only" app
 * code (getWorkSlugs is wrapped in React's cache() and tagged for Next's
 * fetch cache, neither of which applies outside a request).
 */
import { createClient } from "@sanity/client";

const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/+$/, "");
if (!SITE_URL) {
  console.error("NEXT_PUBLIC_SITE_URL is not set — refusing to guess the host to ping for.");
  process.exit(1);
}

const INDEXNOW_KEY = "1fb8a2b3-73d4-4580-9332-d4f07742bd54";
const host = new URL(SITE_URL).host;

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";

async function getWorkSlugs(): Promise<string[]> {
  if (!projectId) return [];
  const client = createClient({
    projectId,
    dataset,
    apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? "2025-01-01",
    perspective: "published",
    useCdn: false,
  });
  const slugs = await client.fetch<(string | null)[]>(
    `*[_type == "workProject" && defined(slug.current) && visible != false && comingSoon != true].slug.current`
  );
  return slugs?.filter((s): s is string => Boolean(s)) ?? [];
}

const staticRoutes = ["/", "/work", "/about", "/contact"];
const workSlugs = await getWorkSlugs();
const urlList = [...staticRoutes, ...workSlugs.map((slug) => `/work/${slug}`)].map(
  (path) => `${SITE_URL}${path === "/" ? "" : path}`
);

console.log(`Pinging IndexNow for ${urlList.length} URL(s) on ${host}:`);
urlList.forEach((url) => console.log(`  ${url}`));

const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    host,
    key: INDEXNOW_KEY,
    keyLocation: `${SITE_URL}/${INDEXNOW_KEY}.txt`,
    urlList,
  }),
});

if (!response.ok) {
  throw new Error(`IndexNow ping failed: ${response.status} ${await response.text()}`);
}

console.log(`\n✓ IndexNow accepted the submission (${response.status}).`);
