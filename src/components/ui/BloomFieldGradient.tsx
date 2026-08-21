"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/* ─────────────────────────────────────────────────────────────────────────────
   BloomFieldGradient
   Animated "Bloom Field" mesh gradient recreated from 21st.dev's "Favorites"
   gradient. Each radial blob has its own anchor and drifts on two sinusoidal
   axes, driven by an elapsed-seconds clock.

   ── Why each blob is its own layer ──────────────────────────────────────────
   The original implementation rebuilt one element's `background-image` every
   frame with new gradient centers. `background-image` is not compositable, so
   every frame re-parsed four gradient strings and re-rasterized a box spanning
   the full page height, then re-ran an `overlay` blend across all of it. None of
   it could reach the GPU.

   Splitting the blobs into four layers with *static* gradients and animating
   only `transform` moves the entire per-frame cost to the compositor: no style
   recalc, no paint, no raster.

   ── Why the radius is explicit, and the layers oversized ────────────────────
   A radial-gradient does NOT stop at its final color stop — it floods that
   final color across the whole remaining element box. So each layer is really a
   full rectangle: soft gradient in the middle, flood everywhere else. While all
   four boxes coincide with the parent that is invisible, but translating them
   slides the boxes out of alignment and their EDGES become visible as hard
   rectangles. (Travel reaches ~28 percentage points — see `blobOffset`.)

   The fix is to oversize each layer so its edge is always outside the parent.
   That is only affordable because the radius is given as an explicit length:
   `radial-gradient(circle R at ...)` decouples the ray length from the element
   box entirely — independent of its width, height, aspect and center. With the
   default `farthest-corner` instead, the radius is derived from the box, so
   resizing a layer would silently change every blob's radius and falloff.

   ── Known, deliberate deviation ─────────────────────────────────────────────
   Because `farthest-corner` derives the ray length from the *center* position,
   the original's blobs breathed 33-52% in radius as they drifted. Holding the
   radius fixed drops that. Restoring it would require the gradient geometry to
   change per frame, i.e. a full-viewport repaint per frame — exactly the cost
   this design removes. The breathing was an artifact of `farthest-corner`
   rather than a designed effect, so it is traded away knowingly.
   ───────────────────────────────────────────────────────────────────────────── */

/* ── Palette ──────────────────────────────────────────────────────────────── */
interface BlobDef {
  /** CSS rgba string */
  rgba: string;
  /** Static center x (%) */
  cx: number;
  /** Static center y (%) */
  cy: number;
  /**
   * Outer radius, as a percentage of the farthest-corner ray at rest. The
   * intermediate stops are exact quartiles of it (verified across all four
   * blobs), which is why they collapse into the shared `STOP_PCT` below.
   */
  lastStop: number;
  /** Per-blob phase offsets, derived deterministically from a seed hash */
  p1: number;
  p2: number;
  /**
   * Per-blob angular frequencies (rad/s) for the x and y drift axes.
   *
   * These MUST differ between blobs. Every blob previously shared one pair
   * (0.55/0.43) with only `p1`/`p2` distinguishing them, which means they shared
   * a period: phase offsets shift *when* each blob reaches a given point, not how
   * often, so the whole field re-converged on a fixed cycle and the three blue
   * blobs periodically stacked into one mass.
   *
   * The values below are mutually non-commensurate (no pair is a simple ratio),
   * so the combined field has no short repeat and the blobs never re-sync.
   */
  f1: number;
  f2: number;
  /**
   * Per-blob multiplier on the shared `AMP` travel. The dominant white wash can
   * range further than the blue blobs without ever reading as a blue mass.
   */
  amp: number;
  /**
   * Multiplier on the shared `ALPHA` ramp, per blob. Lets a blob be muted
   * without touching its radius/position — used to cut the blue blobs'
   * presence so the gray blob reads as dominant instead of a 1:3 gray:blue mix.
   */
  alphaScale: number;
}

/**
 * Deterministic hash → stable float in [0, 2π).  Pure arithmetic on the seed
 * string, no `fract(sin(x)*43758)` chaos.
 */
function stablePhase(seed: number, salt: number): number {
  // Combine seed and salt into a deterministic angle.  The multipliers are
  // arbitrary co-primes that spread the values across 2π.
  const h = ((seed ^ (salt * 2654435761)) >>> 0) % 360;
  return (h / 360) * Math.PI * 2;
}

const SEED = 174074637;

const BLOBS: BlobDef[] = [
  {
    // #F5F7FA @ 100% → Mauve (100 → radius ≈76.1%), faint blue tint
    rgba: "rgba(245,247,250,",
    cx: 67.04,
    cy: 45.93,
    lastStop: 76.1,
    p1: stablePhase(SEED, 0),
    p2: stablePhase(SEED, 1),
    f1: 0.23,
    f2: 0.17,
    amp: 1.2,
    alphaScale: 1,
  },
  {
    // #1B9FFE @ 30% → Glazed azure (30 → radius ≈51.6%)
    rgba: "rgba(27,159,254,",
    cx: 35.47,
    cy: 65.92,
    lastStop: 51.6,
    p1: stablePhase(SEED, 2),
    p2: stablePhase(SEED, 3),
    f1: 0.19,
    f2: 0.29,
    amp: 1,
    alphaScale: 0.234,
  },
  {
    // #1B9FFE @ 74% → Glazed azure (74 → radius ≈67%)
    rgba: "rgba(27,159,254,",
    cx: 48.33,
    cy: 20.11,
    lastStop: 67,
    p1: stablePhase(SEED, 4),
    p2: stablePhase(SEED, 5),
    f1: 0.31,
    f2: 0.21,
    amp: 1,
    alphaScale: 0.234,
  },
  {
    // #4AC9FF @ 0% → Sky (0 → radius ≈41.1%)
    rgba: "rgba(74,201,255,",
    cx: 80.81,
    cy: 88.03,
    lastStop: 41.1,
    p1: stablePhase(SEED, 6),
    p2: stablePhase(SEED, 7),
    f1: 0.16,
    f2: 0.27,
    amp: 1,
    alphaScale: 0.322,
  },
];

/** Alpha ramp per stop: 1 → 0.844 → 0.5 → 0.156 → 0  */
const ALPHA = [1, 0.844, 0.5, 0.156, 0] as const;

/**
 * Stop positions as a percentage of the explicit radius. Shared by every blob:
 * each one's original stops were exact quartiles of its own outer radius, so
 * once the radius is stated explicitly they all reduce to this.
 */
const STOP_PCT = [0, 25, 50, 75, 100] as const;

/**
 * How far each layer extends beyond the parent, per side, in percent.
 * Must exceed the largest excursion in `blobOffset` (~28) with margin so a
 * layer's own box edge can never enter the parent. K is the resulting scale.
 */
const OVERSIZE = 40;
const K = 1 + (2 * OVERSIZE) / 100;

/**
 * Shared drift amplitude, in percentage points of the parent box, before the
 * per-blob `amp` multiplier.
 *
 * Halved from the original 14 (real travel ~28pt, see `blobOffset`) because that
 * excursion was large against the anchor spacing — the closest pair of anchors,
 * blobs 1 and 2, sit ~47pt apart, so 28pt of independent travel each could very
 * nearly close the gap. At 7 (real travel ~14pt) any pair's approach is bounded
 * well under half their separation, so the well-distributed static anchors stay
 * dominant and the motion reads as breathing around a fixed position rather than
 * a wander that can pile the blue blobs together.
 */
const AMP = 7;

/** Noise SVG data URI (grain overlay) */
const NOISE_SVG = `url("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' width='120' height='120'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.500'/></svg>")`;

/**
 * The blob's center, re-expressed for the oversized layer so it lands on the
 * same point of the parent. Pure position arithmetic — unlike the radius, this
 * has no coupling to the ray length, which is what makes oversizing safe here.
 */
function layerCenter(b: BlobDef): { x: number; y: number } {
  return { x: (OVERSIZE + b.cx) / K, y: (OVERSIZE + b.cy) / K };
}

/**
 * One blob's gradient. Size-independent: the radius comes from `--r`, set from
 * measured layout by the ResizeObserver below, so this string is built once and
 * never reassigned.
 */
function blobGradient(b: BlobDef): string {
  const { x, y } = layerCenter(b);
  const colorStops = STOP_PCT.map(
    (s, i) => `${b.rgba}${ALPHA[i] * b.alphaScale}) ${s}%`
  ).join(", ");
  return `radial-gradient(circle var(--r) at ${x}% ${y}%, ${colorStops})`;
}

/**
 * The blob's outer radius in px — the `farthest-corner` ray it would have had
 * at rest, scaled by `lastStop`. Reproduces the original's t=0 frame exactly.
 */
function blobRadius(b: BlobDef, w: number, h: number): number {
  const px = (b.cx / 100) * w;
  const py = (b.cy / 100) * h;
  const ray = Math.hypot(Math.max(px, w - px), Math.max(py, h - py));
  return (ray * b.lastStop) / 100;
}

/**
 * The drift, in percentage points of the parent's width/height. `t` is elapsed
 * SECONDS — the frequencies below are rad/s and only mean anything on that clock.
 *
 * Each blob drifts on its own frequency pair (`f1`/`f2`) rather than the single
 * shared 0.55/0.43 this used to apply to all four. See the note on `BlobDef.f1`:
 * a shared frequency pair gives the field one common period no matter how the
 * phases differ, which is what let the three blue blobs periodically stack up.
 *
 * Both terms are exactly 0 at t=0, guaranteed by the `- sin(p)` term, so an
 * untouched transform is already the correct first frame. The reduced-motion
 * path below depends on that.
 *
 * Note the range is NOT ±AMP: subtracting `sin(p)` shifts it, so real travel
 * reaches ~2×AMP in one direction. `OVERSIZE` is sized against that — it has
 * generous headroom now that AMP is 7, and is deliberately left at 40 since the
 * extra area is fully-transparent flood region and costs nothing.
 */
function blobOffset(b: BlobDef, t: number): { dx: number; dy: number } {
  return {
    dx: (Math.sin(t * b.f1 + b.p1) - Math.sin(b.p1)) * AMP * b.amp,
    dy: (Math.sin(t * b.f2 + b.p2) - Math.sin(b.p2)) * AMP * b.amp,
  };
}

export default function BloomFieldGradient({
  className = "",
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  const rootRef = useRef<HTMLDivElement>(null);
  const blobRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    // Parent size, shared by the radius calculation and the ticker. The ticker
    // needs it because it animates in px (see below).
    let w = 0;
    let h = 0;

    // ── Radius, measured ────────────────────────────────────────────────────
    // Deliberately NOT behind the reduced-motion check below: `--r` is what
    // makes `background-image` valid at all. Left unset, `var(--r)` fails at
    // computed-value time and the whole declaration is dropped — the layer
    // renders nothing, silently, for reduced-motion users only.
    const applyRadius = () => {
      const rect = root.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return; // mid-mount / hidden
      if (rect.width === w && rect.height === h) return; // unchanged
      w = rect.width;
      h = rect.height;

      BLOBS.forEach((b, i) => {
        blobRefs.current[i]?.style.setProperty(
          "--r",
          `${blobRadius(b, w, h)}px`
        );
      });
    };

    applyRadius();

    // The contact page's height changes when validation errors appear, so this
    // fires more than on window resize alone — hence the unchanged-value guard.
    const ro = new ResizeObserver(applyRadius);
    ro.observe(root);

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Freeze at t=0, which is what the markup already renders. The radius is
      // set, so this is a complete, correct static frame.
      return () => ro.disconnect();
    }

    // Elapsed seconds since the first tick, so `t` starts at 0 and the
    // "offset is zero at t=0" invariant holds on the first frame too.
    let start: number | null = null;

    const tick = (time: number) => {
      if (start === null) start = time;
      // gsap.ticker hands out MILLISECONDS. This used to pass that straight into
      // blobOffset, whose frequencies are rad/s — so the drift ran ~1000x fast
      // (~87Hz), aliased against the 60fps sample rate into a pseudo-random walk.
      // That, not the frequency choice, is why the blobs used to clump.
      const t = (time - start) / 1000;
      if (w === 0 || h === 0) return;

      for (let i = 0; i < BLOBS.length; i++) {
        const el = blobRefs.current[i];
        if (!el) continue;
        const { dx, dy } = blobOffset(BLOBS[i], t);
        // px, not xPercent: GSAP resolves xPercent against the element's OWN
        // box, which is K times the parent here — that would overshoot the
        // motion by K. The parent's size is already measured, so use it.
        gsap.set(el, { x: (dx / 100) * w, y: (dy / 100) * h });
      }
    };

    // Share the app's single ticker rather than opening a second rAF loop —
    // SmoothScroll.tsx already drives Lenis off it, and Hero.tsx registers its
    // marquee the same way. Running in the same frame as the scroll update also
    // avoids racing it for a slot.
    let running = false;
    const startTicker = () => {
      if (running) return;
      gsap.ticker.add(tick);
      running = true;
    };
    const stopTicker = () => {
      if (!running) return;
      gsap.ticker.remove(tick);
      running = false;
    };

    // Tab-hidden is already free (rAF halts on hidden tabs). This covers the
    // other case: the contact section scrolled fully out of view, which is
    // reachable because the footer is a full-viewport flow sibling.
    //
    // `start` is deliberately never reset on resume — the clock stays
    // continuous, so the blobs pick up where the math says rather than jumping.
    const io = new IntersectionObserver(
      ([entry]) => (entry.isIntersecting ? startTicker() : stopTicker()),
      { rootMargin: "10% 0px" }
    );
    io.observe(root);

    return () => {
      ro.disconnect();
      io.disconnect();
      stopTicker();
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={className}
      style={{
        // Pinned, not absolute. Two reasons, and the first is the important one:
        // a fixed root IS viewport-sized, so `blobRadius` below measures the
        // viewport rather than the ~3-viewport-tall section. Anchored to the
        // section, the farthest-corner ray produced 1300-2000px radii — each
        // blob far larger than the screen, so the viewport only ever showed the
        // middle of one, and ~1000px of drift across a 2000px falloff was
        // imperceptible. The animation ran correctly and looked static.
        // Second, it keeps the backdrop on screen instead of scrolling away.
        //
        // Nothing clips this: `fixed` resolves against the viewport unless an
        // ancestor has transform/filter/perspective/contain, and the section's
        // `overflow-x: clip` does not create a containing block. Containment is
        // by stacking instead — `z-index: 0` here, page content at `z-10`, and
        // SiteFooter is a `relative` opaque `bg-cream` flow sibling that paints
        // over it. If an ancestor ever gains a `transform`, this silently
        // reverts to being section-sized and the animation goes flat again.
        position: "fixed",
        inset: 0,
        zIndex: 0,
        backgroundColor: "#F5F7FA",
        // Contains the oversized layers, which extend 40% past this box on
        // every side. Only their fully-transparent flood region reaches the
        // boundary, so this clips nothing visible — but without it those layers
        // would paint across the whole page, since nothing else clips a fixed
        // element here.
        overflow: "hidden",
        // Load-bearing. The noise below is `mix-blend-mode: overlay`, which
        // would otherwise blend through to whatever is painted behind this
        // element. `isolation` contains the blending group to the blob stack,
        // reproducing the old single-element `background-blend-mode: overlay`.
        isolation: "isolate",
        ...style,
      }}
    >
      {BLOBS.map((b, i) => (
        <div
          key={i}
          ref={(el) => {
            blobRefs.current[i] = el;
          }}
          style={{
            position: "absolute",
            // Oversized so the layer's own box edge stays outside the parent at
            // every point of the drift. Free of geometric consequence only
            // because the gradient's radius is an explicit length.
            inset: `-${OVERSIZE}%`,
            backgroundImage: blobGradient(b),
            willChange: "transform",
          }}
        />
      ))}

      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage: NOISE_SVG,
          backgroundSize: "120px 120px",
          mixBlendMode: "overlay",
        }}
      />
    </div>
  );
}
