/**
 * Circular scroll cue: a down arrow inside a ring that fills as `progress` goes
 * 0 → 1.
 *
 * Stateless — the caller owns the progress source, so this works equally for a
 * pinned section's scrub progress or whole-page progress. Colours come from
 * `currentColor`, so it rides whatever ink its container carries (including the
 * foot-of-page palette blend, which rewrites `--cs-ink` per frame).
 *
 * Decorative by default. Passing `onClick` promotes it to a real button, for
 * the case where the thing the ring is counting down to can also be committed
 * early — the foot-of-page handoff, where clicking the cue skips the rest of
 * the reveal and goes straight to the next case study. The two inner SVGs stay
 * decorative either way; the label carries the meaning.
 */

/** Geometry of the SVG's own coordinate space, independent of rendered size. */
const VIEW = 100;
const RADIUS = 46;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function ScrollCue({
  progress = 0,
  className = "",
  onClick,
  label,
}: {
  /** 0–1. Values outside the range are clamped. */
  progress?: number;
  /** Positioning and colour come from the caller. */
  className?: string;
  /**
   * Supply to make the cue an actual button that commits early. Omit and it
   * stays a decorative, non-interactive indicator.
   */
  onClick?: () => void;
  /** Accessible name for the button form. Ignored when `onClick` is omitted. */
  label?: string;
}) {
  const filled = Math.min(1, Math.max(0, progress));

  // One shared visual, two wrappers. Rendered inline rather than as a nested
  // component so the SVGs are not remounted when the cue changes mode.
  const art = (
    <>
      <svg
        viewBox={`0 0 ${VIEW} ${VIEW}`}
        className="absolute inset-0 h-full w-full"
        // Start the ring at 12 o'clock rather than 3, so it reads as filling
        // downward — the same direction as the scroll it reports.
        style={{ transform: "rotate(-90deg)" }}
      >
        <circle
          cx={VIEW / 2}
          cy={VIEW / 2}
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="opacity-25"
        />
        <circle
          cx={VIEW / 2}
          cy={VIEW / 2}
          r={RADIUS}
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={CIRCUMFERENCE * (1 - filled)}
        />
      </svg>

      {/* Same idiom as CaseStudy's ArrowUpRight: stroked line + polyline head. */}
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="relative"
      >
        <line x1="12" y1="5" x2="12" y2="19" />
        <polyline points="6 13 12 19 18 13" />
      </svg>
    </>
  );

  // 56/60px square already clears the 44px touch-target minimum, so the button
  // needs no padding of its own — and gaining any would shift the caller's
  // absolute positioning.
  const base = `relative flex h-[56px] w-[56px] items-center justify-center md:h-[60px] md:w-[60px] ${className}`;

  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-label={label} className={`${base} cursor-pointer`}>
        {art}
      </button>
    );
  }

  return (
    <div aria-hidden="true" className={`pointer-events-none ${base}`}>
      {art}
    </div>
  );
}
