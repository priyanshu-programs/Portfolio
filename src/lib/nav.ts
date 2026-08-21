import type { SiteSettings } from "@/lib/sanity/types";

export const NAV_LINKS = [
  { label: "Work", href: "/work" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

/**
 * Ink used when blend is off and the CMS hasn't chosen one. Matches what the
 * hero's difference blend resolves to over cream, so a flat-ink nav reads at
 * the same contrast — and therefore the same apparent weight — as the home
 * page. Kept in sync with `--color-nav-ink` in globals.css.
 */
export const DEFAULT_NAV_COLOR = "#000305";

/**
 * Resolve the nav's colour settings for the home page and work index. Case
 * studies don't use this — they carry their own per-project ink.
 *
 * `fallbackBlend` is what applies when the CMS hasn't decided. Both surfaces
 * are in practice flat near-whites — the hero nav sits on bg-cream with the
 * portrait anchored below it, and /work is a flat #FFFCFA — so blend resolves
 * to near-black on either. The hero keeps it on by default only because that
 * is the established behaviour a CMS editor toggles against.
 */
export function resolveNavAppearance(
  settings?: SiteSettings,
  fallbackBlend = true
) {
  const blend = settings?.navBlend ?? fallbackBlend;
  return {
    blend,
    color: blend ? undefined : settings?.navColor || DEFAULT_NAV_COLOR,
  };
}
