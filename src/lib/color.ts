/**
 * Colour helpers for surfaces whose background is chosen in the CMS.
 *
 * Case-study pages let an editor pick any background hex, so text, rules and
 * badges can't be hardcoded — they're derived from that colour here and handed
 * to the components as CSS custom properties.
 */

/** Default case-study background: the same cream used on /work. */
export const CREAM = "#FFFCFA";
/** Dark ink used on light backgrounds (matches /work's body colour). */
export const INK_DARK = "#1d1d1f";
/** Light ink used on dark backgrounds. */
export const INK_LIGHT = "#FFFCFA";

/**
 * Parse #rgb / #rrggbb into 0–255 channels. Returns null for anything else so
 * callers fall back rather than rendering a broken colour.
 */
function parseHex(hex: string | undefined): [number, number, number] | null {
  if (!hex) return null;
  const raw = hex.trim().replace(/^#/, "");
  const full =
    raw.length === 3
      ? raw
          .split("")
          .map((c) => c + c)
          .join("")
      : raw;
  if (!/^[0-9a-fA-F]{6}$/.test(full)) return null;
  return [
    parseInt(full.slice(0, 2), 16),
    parseInt(full.slice(2, 4), 16),
    parseInt(full.slice(4, 6), 16),
  ];
}

/** Normalise a CMS value to a usable hex, or fall back. */
export function toHex(value: string | undefined, fallback: string): string {
  return parseHex(value) ? `#${value!.trim().replace(/^#/, "")}` : fallback;
}

/** WCAG relative luminance, 0 (black) → 1 (white). */
export function luminance(hex: string): number {
  const rgb = parseHex(hex);
  if (!rgb) return 1;
  const [r, g, b] = rgb.map((channel) => {
    const c = channel / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** True when a background is dark enough to need light text. */
export function isDark(hex: string): boolean {
  return luminance(hex) < 0.4;
}

/** Pick the readable text colour for a background. */
export function readableInk(bg: string): string {
  return isDark(bg) ? INK_LIGHT : INK_DARK;
}

/** `rgba()` string from a hex plus alpha — for hairlines and muted text. */
export function withAlpha(hex: string, alpha: number): string {
  const rgb = parseHex(hex);
  if (!rgb) return `rgba(0, 0, 0, ${alpha})`;
  const [r, g, b] = rgb;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/**
 * Parse either of the two forms this module produces — a hex, or the `rgba()`
 * string `withAlpha` returns — into premultiply-ready channels plus alpha.
 * Needed because a theme's accent is a hex when the editor picked one and an
 * rgba() of the ink when they didn't, and a blend has to cope with one of each.
 */
function parseColor(value: string): [number, number, number, number] | null {
  const hex = parseHex(value);
  if (hex) return [...hex, 1];

  const rgba = value
    .trim()
    .match(/^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+))?\s*\)$/i);
  if (!rgba) return null;

  return [
    Number(rgba[1]),
    Number(rgba[2]),
    Number(rgba[3]),
    rgba[4] === undefined ? 1 : Number(rgba[4]),
  ];
}

/**
 * Per-channel sRGB blend of two hexes. `t` is clamped to 0–1, and anything
 * unparseable falls back to `from` so a bad CMS value freezes the colour rather
 * than flashing black mid-animation.
 */
export function mixHex(from: string, to: string, t: number): string {
  const a = parseHex(from);
  const b = parseHex(to);
  if (!a || !b) return from;

  const amount = Math.min(1, Math.max(0, t));
  const channel = (i: number) =>
    Math.round(a[i] + (b[i] - a[i]) * amount)
      .toString(16)
      .padStart(2, "0");

  return `#${channel(0)}${channel(1)}${channel(2)}`;
}

/**
 * As `mixHex`, but accepts hex and `rgba()` on either side and interpolates
 * alpha too — so a project with a chosen accent hands off cleanly to one
 * without, and vice versa.
 */
export function mixColor(from: string, to: string, t: number): string {
  const a = parseColor(from);
  const b = parseColor(to);
  if (!a || !b) return from;

  const amount = Math.min(1, Math.max(0, t));
  const at = (i: number) => a[i] + (b[i] - a[i]) * amount;
  const alpha = at(3);
  const [r, g, bl] = [Math.round(at(0)), Math.round(at(1)), Math.round(at(2))];

  return alpha >= 1
    ? `#${[r, g, bl].map((c) => c.toString(16).padStart(2, "0")).join("")}`
    : `rgba(${r}, ${g}, ${bl}, ${Number(alpha.toFixed(4))})`;
}

export interface CaseStudyTheme {
  bg: string;
  ink: string;
  /** Small-caps labels and the live pill. */
  accent: string;
  /** Hairline rules and borders. */
  line: string;
  /** Secondary body copy. */
  muted: string;
  /** Top-navigation ink. Follows `ink` unless the editor overrode it. */
  navInk: string;
  /** True when the resolved background is dark. */
  dark: boolean;
  /**
   * True when `ink` came from the CMS rather than from background luminance.
   * Only `blendCaseStudyTheme` reads this — it decides whether the next-project
   * hand-off may re-derive the ink or must honour the editor's choice.
   */
  inkExplicit: boolean;
}

/**
 * Resolve the CMS colour choices into every value the case-study page needs.
 * Every input is optional: an empty background falls back to the cream used on
 * /work, an empty accent falls back to the derived ink, an empty text colour is
 * derived from the background's luminance, and an empty nav colour follows
 * whichever ink won.
 *
 * `dark` stays keyed to the *background*, not the ink, because it only scales
 * the alpha of rules and muted copy against that background — an editor picking
 * an unusual ink shouldn't flip those ratios.
 */
export function caseStudyTheme(
  pageBg?: string,
  accent?: string,
  textColor?: string,
  navColor?: string
): CaseStudyTheme {
  const bg = toHex(pageBg, CREAM);
  const derived = readableInk(bg);
  const ink = toHex(textColor, derived);
  const dark = isDark(bg);
  return {
    bg,
    ink,
    accent: toHex(accent, withAlpha(ink, dark ? 0.65 : 0.55)),
    line: withAlpha(ink, dark ? 0.18 : 0.14),
    muted: withAlpha(ink, dark ? 0.68 : 0.62),
    navInk: toHex(navColor, ink),
    dark,
    inkExplicit: ink !== derived,
  };
}

/**
 * Reattach an ink to a theme, re-deriving the values that hang off it.
 *
 * Callers that hold a theme's colours as separate primitives (so a React effect
 * can depend on them without re-running on every render) use this to rebuild the
 * whole theme without losing an editor's explicit text colour, which
 * `caseStudyTheme(bg, accent)` on its own would silently re-derive.
 */
export function withInk(
  theme: CaseStudyTheme,
  ink: { ink: string; navInk: string; inkExplicit: boolean }
): CaseStudyTheme {
  const dark = theme.dark;
  return {
    ...theme,
    ink: ink.ink,
    line: withAlpha(ink.ink, dark ? 0.18 : 0.14),
    muted: withAlpha(ink.ink, dark ? 0.68 : 0.62),
    navInk: ink.navInk,
    inkExplicit: ink.inkExplicit,
  };
}

/**
 * A theme part-way between two case studies, for the overscroll hand-off at the
 * foot of a project: `t` of 0 is `from`, 1 is `to`.
 *
 * The background and accent are always interpolated. Ink is handled two ways:
 *
 * When both sides derive their ink automatically, it is re-derived from the
 * blended background rather than tweened, because lerping dark ink toward light
 * ink passes through a mid-grey that is unreadable on the mid-grey background
 * arriving at the same moment. Deriving instead flips the text once, at the
 * luminance crossover, and only when the two projects differ in polarity.
 *
 * When either side sets an explicit text colour, that choice has to be honoured
 * — re-deriving would snap the editor's ink to black or white mid-scroll — so
 * the two resolved inks are interpolated instead. Rules and muted copy follow
 * whichever ink won, so they stay in step either way.
 */
export function blendCaseStudyTheme(
  from: CaseStudyTheme,
  to: CaseStudyTheme,
  t: number
): CaseStudyTheme {
  const bg = mixHex(from.bg, to.bg, t);
  const dark = isDark(bg);
  const inkExplicit = from.inkExplicit || to.inkExplicit;
  const ink = inkExplicit ? mixColor(from.ink, to.ink, t) : readableInk(bg);

  return {
    bg,
    ink,
    accent: mixColor(from.accent, to.accent, t),
    line: withAlpha(ink, dark ? 0.18 : 0.14),
    muted: withAlpha(ink, dark ? 0.68 : 0.62),
    navInk: mixColor(from.navInk, to.navInk, t),
    dark,
    inkExplicit,
  };
}
