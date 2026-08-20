import "server-only";
import { cache } from "react";
import { sanityClient, warnUnconfigured } from "./client";
import { siteContentQuery } from "./queries";
import { buildImageUrl } from "./image";
import type {
  SiteContent,
  WorkProject,
  Tag,
  AboutParagraph,
  AboutSlot,
  SocialLink,
} from "./types";

/**
 * Server-only fetch of all site content. Resolves image references to CDN URL
 * strings so client components receive plain, serializable data.
 *
 * Returns null on any failure (unconfigured project, network error, bad data)
 * so every consumer falls back to its hardcoded content. Wrapped in
 * React.cache to dedupe across generateMetadata + the layout in one request.
 */
/**
 * Deadline for the site-content fetch. Generous enough for a cold CDN miss on
 * a large query, short enough that a Sanity outage doesn't hold the page.
 */
const SANITY_FETCH_TIMEOUT_MS = 8_000;

export const getSiteContent = cache(async (): Promise<SiteContent | null> => {
  if (!sanityClient) {
    warnUnconfigured("getSiteContent");
    return null;
  }

  try {
    // Classic (non-Cache-Components) revalidation: tagged for on-demand
    // invalidation via the /api/revalidate route, with a 60s time fallback.
    const raw = await sanityClient.fetch<RawSiteContent>(
      siteContentQuery,
      {},
      {
        next: { tags: ["site-content"], revalidate: 60 },
        // Without a deadline, an unreachable or hanging Sanity endpoint blocks
        // RootLayout for as long as the connection stays open — and because
        // this call is awaited before anything renders, the whole site serves
        // nothing rather than degrading. The catch below already falls back to
        // each consumer's hardcoded content, so a timeout is strictly better
        // than waiting: it turns an outage into stale-but-served copy.
        signal: AbortSignal.timeout(SANITY_FETCH_TIMEOUT_MS),
      }
    );

    if (!raw) return null;
    return normalize(raw);
  } catch (error) {
    console.error("[sanity] getSiteContent failed:", error);
    return null;
  }
});

// Raw shape mirrors the GROQ projection; images arrive as Sanity image objects.
interface RawSiteContent {
  settings?: SiteContent["settings"];
  hero?: (Omit<NonNullable<SiteContent["hero"]>, "portrait"> & {
    portrait?: unknown;
  }) | null;
  aboutWork?: {
    quote?: string;
    subParagraph?: string;
  } | null;
  about?: {
    title?: string;
    paragraphs?: AboutParagraph[];
    slots?: {
      image?: unknown;
      alt?: string;
      blurb?: AboutParagraph;
    }[];
    achievements?: {
      title?: string;
      description?: string;
      badge?: unknown;
      image?: unknown;
      alt?: string;
      hidden?: boolean;
    }[];
    socials?: SocialLink[];
    email?: string;
    seoTitle?: string;
    seoDescription?: string;
  } | null;
  contact?: {
    heading?: string;
    successHeading?: string;
    successBody?: string;
    submitLabel?: string;
    submitPendingLabel?: string;
    profileImage?: unknown;
    showBackgroundGradient?: boolean;
    socials?: SocialLink[];
    email?: string;
    phone?: string;
    seoTitle?: string;
    seoDescription?: string;
  } | null;
  services?: {
    heading?: string;
    ornament?: unknown;
    landscape?: unknown;
    cards?: { title?: string; copy?: string; iconKey?: string }[];
  } | null;
  cta?: {
    headline?: string;
    revealHeadline?: string;
    linkText?: string;
    collage?: unknown[];
    handLeft?: unknown;
    handRight?: unknown;
    twoHands?: unknown;
  } | null;
  floatingMenu?: { tags?: string[]; image?: unknown } | null;
  /**
   * `tags[]->` yields `null` for any entry whose reference doesn't resolve — a
   * dangling `_ref`, or a value that was never a reference at all. Typing the
   * elements as non-null `Tag` is what let a crash reach the browser: the
   * optional chain in a consumer's `project.tags?.some(t => t.slug)` guards the
   * array, not its contents. Normalize strips them; the type says so.
   */
  workProjects?: (Omit<WorkProject, "thumbnail" | "tags"> & {
    thumbnail?: unknown;
    tags?: (Tag | null)[] | null;
  })[] | null;
  homeWork?: (Omit<WorkProject, "thumbnail"> & {
    thumbnail?: unknown;
  })[] | null;
  tags?: (Tag | null)[] | null;
}

function normalize(raw: RawSiteContent): SiteContent {
  return {
    settings: raw.settings ?? undefined,
    hero: raw.hero
      ? { ...raw.hero, portrait: buildImageUrl(raw.hero.portrait, 1400) }
      : undefined,
    aboutWork: raw.aboutWork
      ? {
          quote: raw.aboutWork.quote,
          subParagraph: raw.aboutWork.subParagraph,
        }
      : undefined,
    about: raw.about
      ? {
          title: raw.about.title,
          paragraphs: raw.about.paragraphs,
          // A slot whose image fails to resolve is dropped entirely: the layout
          // keys its blurb positioning off the slot index, so rendering a
          // pictureless slot would leave a caption floating beside nothing.
          slots: raw.about.slots
            ?.map(
              (slot): AboutSlot => ({
                image: buildImageUrl(slot.image, 1200),
                alt: slot.alt,
                blurb: slot.blurb,
              })
            )
            .filter((slot) => Boolean(slot.image)),
          achievements: raw.about.achievements?.map((item) => ({
            title: item.title,
            description: item.description,
            badge: buildImageUrl(item.badge, 300, { compress: false }),
            image: buildImageUrl(item.image, 1200, { compress: false }),
            alt: item.alt,
            hidden: item.hidden,
          })),
          socials: raw.about.socials,
          email: raw.about.email,
          seoTitle: raw.about.seoTitle,
          seoDescription: raw.about.seoDescription,
        }
      : undefined,
    contact: raw.contact
      ? {
          heading: raw.contact.heading,
          successHeading: raw.contact.successHeading,
          successBody: raw.contact.successBody,
          submitLabel: raw.contact.submitLabel,
          submitPendingLabel: raw.contact.submitPendingLabel,
          profileImage: buildImageUrl(raw.contact.profileImage, 400),
          showBackgroundGradient: raw.contact.showBackgroundGradient,
          socials: raw.contact.socials,
          email: raw.contact.email,
          phone: raw.contact.phone,
          seoTitle: raw.contact.seoTitle,
          seoDescription: raw.contact.seoDescription,
        }
      : undefined,
    services: raw.services
      ? {
          heading: raw.services.heading,
          ornament: buildImageUrl(raw.services.ornament, 200),
          landscape: buildImageUrl(raw.services.landscape, 1600),
          cards: raw.services.cards,
        }
      : undefined,
    cta: raw.cta
      ? {
          headline: raw.cta.headline,
          revealHeadline: raw.cta.revealHeadline,
          linkText: raw.cta.linkText,
          collage: raw.cta.collage
            ?.map((img) => buildImageUrl(img, 900))
            .filter((u): u is string => Boolean(u)),
          handLeft: buildImageUrl(raw.cta.handLeft, 900),
          handRight: buildImageUrl(raw.cta.handRight, 900),
          twoHands: buildImageUrl(raw.cta.twoHands, 1600),
        }
      : undefined,
    floatingMenu: raw.floatingMenu
      ? {
          tags: raw.floatingMenu.tags,
          image: buildImageUrl(raw.floatingMenu.image, 900),
        }
      : undefined,
    // hoverImage is served wider than the thumbnail: its 352px window still has
    // to stay sharp on 3x displays.
    //
    // Unresolved tags are dropped for the same reason blank gallery slides and
    // pictureless about-slots are: a null in the array is not a tag the filter
    // pills can do anything with, and every consumer would otherwise have to
    // remember to guard each element.
    workProjects: raw.workProjects?.map((p) => ({
      ...p,
      tags: p.tags?.filter((t): t is Tag => Boolean(t)),
      thumbnail: buildImageUrl(p.thumbnail, 900),
      hoverImage: buildImageUrl(p.hoverImage, 1200),
    })),
    homeWork: raw.homeWork?.map((p) => ({
      ...p,
      thumbnail: buildImageUrl(p.thumbnail, 900),
      hoverImage: buildImageUrl(p.hoverImage, 1200),
    })),
    tags: raw.tags?.filter((t): t is Tag => Boolean(t)),
  };
}
