import "server-only";
import { cache } from "react";
import { sanityClient } from "./client";
import { caseStudyBySlugQuery, workSlugsQuery } from "./queries";
import { buildImageUrl } from "./image";
import type { CaseStudyContent, GalleryItem, ProjectRef } from "./types";

/**
 * Server-only fetch of a single case study, mirroring getSiteContent: images
 * resolve to CDN URL strings, failures return null so the route can 404 rather
 * than throw, and the request carries the same `site-content` cache tag so the
 * existing Sanity webhook (/api/revalidate) already invalidates case studies.
 *
 * Deliberately separate from siteContentQuery — that query runs in the root
 * layout on every route, and full project bodies there would bloat every page.
 */
export const getCaseStudy = cache(
  async (slug: string): Promise<CaseStudyContent | null> => {
    if (!sanityClient) return null;

    try {
      const raw = await sanityClient.fetch<RawResult>(
        caseStudyBySlugQuery,
        { slug },
        { next: { tags: ["site-content"], revalidate: 60 } }
      );

      if (!raw?.project) return null;
      return normalize(raw, slug);
    } catch (error) {
      console.error(`[sanity] getCaseStudy(${slug}) failed:`, error);
      return null;
    }
  }
);

/** Slugs for generateStaticParams. Empty array when Sanity isn't configured. */
export const getWorkSlugs = cache(async (): Promise<string[]> => {
  if (!sanityClient) return [];

  try {
    const slugs = await sanityClient.fetch<(string | null)[]>(
      workSlugsQuery,
      {},
      { next: { tags: ["site-content"], revalidate: 60 } }
    );
    return slugs?.filter((s): s is string => Boolean(s)) ?? [];
  } catch (error) {
    console.error("[sanity] getWorkSlugs failed:", error);
    return [];
  }
});

interface RawProject {
  title?: string;
  slug?: string;
  category?: string;
  services?: string;
  year?: string;
  summary?: string;
  liveUrl?: string;
  cover?: unknown;
  challenge?: string[];
  approach?: string[];
  galleryHeading?: string;
  gallerySubheading?: string;
  gallery?: { image?: unknown; caption?: string }[];
  pageBg?: string;
  accent?: string;
  galleryBg?: string;
}

interface RawOrderedItem extends Omit<ProjectRef, "thumbnail" | "cover"> {
  thumbnail?: unknown;
  cover?: unknown;
}

interface RawResult {
  project?: RawProject | null;
  ordered?: RawOrderedItem[] | null;
}

function normalize(raw: RawResult, slug: string): CaseStudyContent {
  const project = raw.project!;
  const ordered = raw.ordered ?? [];

  const gallery: GalleryItem[] = (project.gallery ?? [])
    .map((item) => ({
      image: buildImageUrl(item.image, 1400),
      caption: item.caption,
    }))
    // A slide whose asset failed to resolve would render as an empty card.
    .filter((item) => Boolean(item.image));

  return {
    title: project.title,
    slug: project.slug ?? slug,
    category: project.category,
    services: project.services,
    year: project.year,
    summary: project.summary,
    liveUrl: project.liveUrl,
    cover: buildImageUrl(project.cover, 2000),
    // Drop blank paragraphs so an empty array entry doesn't leave a gap.
    challenge: project.challenge?.filter((p) => p?.trim()),
    approach: project.approach?.filter((p) => p?.trim()),
    galleryHeading: project.galleryHeading,
    gallerySubheading: project.gallerySubheading,
    gallery,
    pageBg: project.pageBg,
    accent: project.accent,
    galleryBg: project.galleryBg,
    next: resolveNext(ordered, slug),
  };
}

/** The following project in display order, wrapping past the last one. */
function resolveNext(
  ordered: RawOrderedItem[],
  slug: string
): ProjectRef | undefined {
  if (ordered.length < 2) return undefined;

  const index = ordered.findIndex((p) => p.slug === slug);
  if (index === -1) return undefined;

  // Both images are pulled out of the spread because RawOrderedItem types them
  // as `unknown` — spreading would conflict with the `string` fields assigned
  // below.
  const { cover, thumbnail, ...next } = ordered[(index + 1) % ordered.length];
  return {
    ...next,
    // Falls back to the case study's own Cover Image when Thumbnail is
    // unset, since editors always fill in Cover but may not know Thumbnail
    // is also used for this sneak-peek card.
    thumbnail: buildImageUrl(thumbnail ?? cover, 900),
    // 2000 to match the destination page's own cover (see normalize above): the
    // foot-of-page peek renders this at full gutter width as a 16/10 hero, so
    // the 900px thumbnail size would visibly soften. Falls back to Thumbnail
    // for the inverse gap.
    cover: buildImageUrl(cover ?? thumbnail, 2000),
  };
}
