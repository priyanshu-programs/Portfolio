/**
 * Shape of the site content consumed by the frontend. Every field is optional:
 * components fall back to their original hardcoded value when a field is empty
 * or when Sanity isn't configured. Images are resolved to URL strings on the
 * server (see getSiteContent) so client components just receive plain strings.
 */

export interface NavLink {
  label: string;
  href: string;
}

export interface SocialLink {
  label: string;
  href: string;
}

export interface SiteSettings {
  name?: string;
  email?: string;
  phone?: string;
  timezone?: string;
  socials?: SocialLink[];
  navLinks?: NavLink[];
  /** Nav ink on the home page and work index, used when `navBlend` is off. */
  navColor?: string;
  /**
   * When true (the default), the nav inverts its backdrop via difference blend
   * rather than using `navColor`. Case studies always set their own colour.
   */
  navBlend?: boolean;
  seoTitle?: string;
  seoDescription?: string;
}

export interface HeroContent {
  pillLabel?: string;
  heading?: string;
  paragraph?: string;
  marqueeText?: string;
  loaderText?: string;
  portrait?: string;
}

export interface AboutWorkContent {
  quote?: string;
  subParagraph?: string;
}

export interface AboutParagraph {
  text?: string;
  /**
   * Substrings of `text` rendered in italic script. Matched literally, so they
   * have to reproduce the source casing exactly.
   */
  accents?: string[];
}

/**
 * One framed photo and the blurb set beside it. Kept as a single unit so the
 * image and its caption cannot drift apart in the Studio; positions and sizes
 * stay in the component.
 */
export interface AboutSlot {
  image?: string;
  alt?: string;
  blurb?: AboutParagraph;
}

export interface AchievementItem {
  title?: string;
  description?: string;
  badge?: string;
  image?: string;
  alt?: string;
  hidden?: boolean;
}

/** The /about route. Distinct from `aboutWork`, which is the home page section. */
export interface AboutContent {
  title?: string;
  paragraphs?: AboutParagraph[];
  /** Ordered photo slots; the layout renders at most three. */
  slots?: AboutSlot[];
  achievements?: AchievementItem[];
  socials?: SocialLink[];
  /** Falls back to `settings.email`. */
  email?: string;
  seoTitle?: string;
  seoDescription?: string;
}

/** The /contact route. */
export interface ContactContent {
  heading?: string;
  successHeading?: string;
  successBody?: string;
  submitLabel?: string;
  submitPendingLabel?: string;
  profileImage?: string;
  /** Toggles the animated Bloom Field mesh-gradient backdrop. Defaults to off. */
  showBackgroundGradient?: boolean;
  socials?: SocialLink[];
  /** Falls back to `settings.email`. */
  email?: string;
  /** Falls back to `settings.phone`. */
  phone?: string;
  seoTitle?: string;
  seoDescription?: string;
}

export interface ServiceCardContent {
  title?: string;
  copy?: string;
  iconKey?: string;
}

export interface ServicesContent {
  heading?: string;
  ornament?: string;
  landscape?: string;
  cards?: ServiceCardContent[];
}

export interface CtaContent {
  headline?: string;
  revealHeadline?: string;
  linkText?: string;
  /** Ordered list of collage images; positions/sizes stay in the component. */
  collage?: string[];
  handLeft?: string;
  handRight?: string;
  twoHands?: string;
}

export interface FloatingMenuContent {
  tags?: string[];
  image?: string;
}

export interface Tag {
  _id?: string;
  title?: string;
  slug?: string;
}

export interface WorkProject {
  /** Sanity document id — the only field guaranteed unique. Use it as the React key. */
  _id?: string;
  /** Editor-entered display number ("01"). Shown in the UI; duplicates are possible. */
  id?: string;
  title?: string;
  /** Route key: links to /work/<slug>. Rows without one aren't clickable. */
  slug?: string;
  category?: string;
  services?: string;
  year?: string;
  /** Dereferenced tag documents; drives the filter pills. */
  tags?: Tag[];
  thumbnail?: string;
  /** Hex placeholder behind the thumbnail in grid view and on the next-project card. */
  bgColor?: string;
  /** Hover-card image. Falls back to `thumbnail` when unset. */
  hoverImage?: string;
  /** Hover-card colour, projected from the colour picker's hex. Falls back to `bgColor`. */
  hoverBg?: string;
}

export interface GalleryItem {
  image?: string;
  caption?: string;
}

/** Minimal shape needed for the next-project link at the foot of a case study. */
export interface ProjectRef {
  title?: string;
  slug?: string;
  category?: string;
  /** Service line shown on the reveal panel; falls back to `category`. */
  services?: string;
  year?: string;
  thumbnail?: string;
  /**
   * The project's own hero cover, at hero resolution. The foot-of-page peek
   * mirrors the destination page's top composition, so it shows the same image
   * that page will show — not the smaller card thumbnail.
   */
  cover?: string;
  bgColor?: string;
  /**
   * The project's own page background and accent. Unlike `bgColor` (which
   * frames the card thumbnail), these are the colours the page will actually
   * wear — the foot-of-page overscroll blends the current page toward them.
   */
  pageBg?: string;
  accent?: string;
  /** Explicit ink override; empty derives from `pageBg`. */
  textColor?: string;
  /** Explicit nav ink override; empty follows the resolved text colour. */
  navColor?: string;
}

/**
 * A single case study. Fetched per-route (not via siteContentQuery) so project
 * bodies don't ride along on every page render.
 */
export interface CaseStudyContent {
  title?: string;
  slug?: string;
  category?: string;
  services?: string;
  year?: string;
  /** Sanity's document timestamps (ISO 8601), used for JSON-LD recency signals. */
  createdAt?: string;
  updatedAt?: string;
  summary?: string;
  liveUrl?: string;
  cover?: string;
  challenge?: string[];
  approach?: string[];
  galleryHeading?: string;
  gallerySubheading?: string;
  gallery?: GalleryItem[];
  /** Editor-chosen page background hex; empty falls back to the cream. */
  pageBg?: string;
  /** Editor-chosen accent hex; empty is derived from the text colour. */
  accent?: string;
  /**
   * Editor-chosen ink hex. Empty derives it from `pageBg` by luminance, which
   * is the right answer for most backgrounds but not all — this is the escape
   * hatch. Hairlines and muted copy follow whichever wins.
   */
  textColor?: string;
  /** Editor-chosen nav ink hex; empty follows the resolved text colour. */
  navColor?: string;
  /** Editor-chosen hex for just the gallery section; empty matches `pageBg`. */
  galleryBg?: string;
  /** The following project in `order`, wrapping to the first. */
  next?: ProjectRef;
}

export interface SiteContent {
  settings?: SiteSettings;
  hero?: HeroContent;
  aboutWork?: AboutWorkContent;
  about?: AboutContent;
  contact?: ContactContent;
  services?: ServicesContent;
  cta?: CtaContent;
  floatingMenu?: FloatingMenuContent;
  workProjects?: WorkProject[];
  /** Up to 4 projects pinned for the home page's Recent Work section. */
  homeWork?: WorkProject[];
  tags?: Tag[];
}
