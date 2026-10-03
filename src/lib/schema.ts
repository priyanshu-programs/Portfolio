import { absoluteUrl } from "@/lib/siteUrl";

/**
 * Shared JSON-LD fragments.
 *
 * The root layout mints the two sitewide entities — `#person` and `#website`
 * (see src/app/layout.tsx) — and every other node on the site attaches to them
 * by `@id` rather than restating them. This module holds the per-page nodes so
 * the `@id` strings and the graph shape live in one place instead of being
 * retyped in each route.
 *
 * Every URL goes through `absoluteUrl()`, so the whole graph follows
 * NEXT_PUBLIC_SITE_URL and cannot name a host the site does not serve.
 */

/** `@id` of the sitewide Person node minted in the root layout. */
export const PERSON_ID = absoluteUrl("/#person");

/** `@id` of the sitewide WebSite node minted in the root layout. */
export const WEBSITE_ID = absoluteUrl("/#website");

interface WebPageOptions {
  /** Route path, e.g. "/about". */
  path: string;
  /** The page's own name — normally the same string as its <title>. */
  name: string;
  description?: string;
  /**
   * A more specific schema.org type where one fits. `ProfilePage` for a page
   * about a person, `ContactPage` for a contact page; plain `WebPage`
   * otherwise. Google reads these, and they cost nothing to state correctly.
   */
  type?: "WebPage" | "ProfilePage" | "ContactPage" | "CollectionPage";
}

/**
 * One `WebPage` node, tied into the sitewide graph.
 *
 * Without this, every route emitted the identical sitewide Person + WebSite
 * pair and nothing said which entity each individual URL was *about* — so the
 * pages were indexed as anonymous members of the site rather than as pages with
 * a subject. `isPartOf` places the page in the site; `about` names its subject;
 * `primaryImageOfPage` is omitted deliberately, since the OG image is already
 * declared through the Metadata API.
 */
export function webPageNode({
  path,
  name,
  description,
  type = "WebPage",
}: WebPageOptions) {
  return {
    "@type": type,
    "@id": absoluteUrl(`${path}#webpage`),
    url: absoluteUrl(path),
    name,
    ...(description ? { description } : {}),
    isPartOf: { "@id": WEBSITE_ID },
    about: { "@id": PERSON_ID },
    inLanguage: "en",
  };
}

/** A `@graph` wrapper, so routes don't retype the @context boilerplate. */
export function graph(nodes: object[]) {
  return { "@context": "https://schema.org", "@graph": nodes };
}
