/**
 * Circular scroll cue: a down arrow inside a ring that fills as `progress` goes
 * 0 → 1.
 *
 * Decorative and stateless — the caller owns the progress source, so this works
 * equally for a pinned section's scrub progress or whole-page progress. Colours
 * come from `currentColor`, so it rides whatever ink its container carries
 * (including the foot-of-page palette blend, which rewrites `--cs-ink` per
 * frame).
 */

/** Geometry of the SVG's own coordinate space, independent of rendered size. */
const VIEW = 100;
const RADIUS = 46;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export default function ScrollCue({
  progress = 0,
  className = "",
}: {
  /** 0–1. Values outside the range are clamped. */
  progress?: number;
  /** Positioning and colour come from the caller. */
  className?: string;
}) {
  const filled = Math.min(1, Math.max(0, progress));

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none relative flex h-[56px] w-[56px] items-center justify-center md:h-[60px] md:w-[60px] ${className}`}
    >
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
    </div>
  );
}
