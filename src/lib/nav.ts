import type { SiteSettings } from "@/lib/sanity/types";

export const NAV_LINKS = [
  { label: "Work", href: "/work" },
  { label: "About", href: "/about" },
  { label: "Contact", href: "/contact" },
];

/** Ink used when blend is off and the CMS hasn't chosen one. Matches /work's body colour. */
export const DEFAULT_NAV_COLOR = "#1d1d1f";

/**
 * Resolve the nav's colour settings for the home page and work index. Case
 * studies don't use this — they carry their own per-project ink.
 *
 * `fallbackBlend` is what applies when the CMS hasn't decided. It differs by
 * page: the hero has imagery under the nav, where difference blend is the only
 * thing that stays legible, while /work is a flat near-white where blend has
 * only ever resolved to near-black anyway.
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
