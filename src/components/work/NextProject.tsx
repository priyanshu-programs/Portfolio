"use client";

import Image from "next/image";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "@/components/transition/SmartLink";
import ScrollCue from "@/components/ui/ScrollCue";
import {
  blendCaseStudyTheme,
  caseStudyTheme,
  readableInk,
  withInk,
} from "@/lib/color";
import type { CaseStudyTheme } from "@/lib/color";
import { beginCaseStudyAdvance } from "@/lib/caseStudyAdvance";
import type { ProjectRef } from "@/lib/sanity/types";

gsap.registerPlugin(ScrollTrigger);

/**
 * Foot-of-page handoff to the following case study.
 *
 * A static label row (this project's name / "Scroll for next section") sits
 * directly under the gallery, in normal flow, with only a small gap. Below it
 * comes the handoff stage: a full-viewport composition that deliberately
 * *mirrors the top of a case study page* — same gutter, same heading scale,
 * same "Service:" block — so being parked there reads as already having
 * arrived at the next project.
 *
 * The stage pins at `top top`, and one `progress` value drives everything, so
 * nothing can drift out of step:
 *
 *   1. Up to REVEAL_PROGRESS, the next project's cover rises from below the
 *      fold into the *foreground* (z above the composition, parked at
 *      `top-full`, translated up), with the stage's `overflow-hidden` letting
 *      the viewport's bottom edge crop it. Only its top band ends up visible —
 *      a drawer sliding open, not a background wash.
 *   2. Over the same span the page's `--cs-*` custom properties blend from this
 *      project's palette toward the next one's, so the surface lands on the
 *      destination colour exactly as the image stops moving.
 *   3. Past REVEAL_PROGRESS the composition simply holds, which is what makes
 *      it read as having arrived somewhere.
 *   4. At ADVANCE_PROGRESS the route push fires, so continuing to scroll flows
 *      straight into the next case study.
 *
 * The one hard-won detail is that none of this may depend on progress reaching
 * exactly 1, or on the `onLeave` that requires it. This section is the last
 * flow content in the document, so a pin ending at `+=100%` puts its `end`
 * precisely on the document's maximum scroll: `anticipatePin` then clamps
 * progress to 0.9999 whenever velocity is low (always, at the bottom), and
 * Lenis's asymptotic easing settles short of the final pixel anyway. Both of
 * those have already broken this handoff once each. Hence the 180% runway and
 * the sub-1 threshold, and hence no `anticipatePin` here.
 *
 * There is also no document-space measurement anywhere in here: an earlier
 * version measured `getBoundingClientRect().bottom + scrollY`, which a pin
 * makes meaningless, since pinning locks an element's rect to the viewport.
 *
 * The route push still gets a beat of `FLATTEN_CLASS` to flatten the browser's
 * view-transition to a hard cut. That is not hiding a rising panel anymore —
 * there isn't one — it's just avoiding the site's normal clip-path zoom
 * playing on top of what is otherwise a plain continuation of the same
 * scroll gesture. See lib/caseStudyAdvance for that and the scroll lock, which
 * are two separately-timed flags for a reason documented there.
 */

/** Gap between the gallery and the label row. Small — not a full section beat. */
const LABEL_GAP = "clamp(1.5rem, 3vw, 2.5rem)";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/**
 * Pin progress at which the cover has finished rising and the palette has
 * finished blending. The composition then holds still for the remainder of the
 * pin — that hold is what makes this read as arriving somewhere rather than
 * scrolling past something.
 */
const REVEAL_PROGRESS = 0.55;

/**
 * Pin progress that commits to the handoff.
 *
 * Deliberately short of 1. Two independent things make exactly 1 unreachable at
 * the foot of a document: `anticipatePin` clamps progress to 0.9999 whenever
 * scroll velocity is low (ScrollTrigger.js:1675), which it always is near the
 * bottom; and Lenis approaches its target asymptotically, settling a fraction
 * short on a fractional-pixel document. Anything keyed to `progress === 1` — or
 * to the `onLeave` that requires it — therefore never fires. With real scroll
 * runway past the pin's end (see `end` below) this threshold is crossed
 * mid-gesture, so the handoff is simply part of continuing to scroll.
 */
const ADVANCE_PROGRESS = 0.995;

/**
 * How much of the viewport the next project's cover occupies once it has fully
 * risen — roughly its top third, enough to read the image but far too little to
 * mistake for the page you're on.
 */
const REVEAL_VH = 0.32;

/** Floor so the peek stays legible on a short landscape phone. */
const REVEAL_MIN_PX = 160;

/** The band the cover rises into, reserved as padding so text never sits behind it. */
const REVEAL_SPACE = `max(${REVEAL_MIN_PX}px, ${REVEAL_VH * 100}vh)`;

const subscribeReducedMotion = (onChange: () => void) => {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};

const getReducedMotion = () => window.matchMedia(REDUCED_MOTION_QUERY).matches;

export default function NextProject({
  project,
  theme,
  currentTitle,
}: {
  project: ProjectRef;
  /** The current page's palette — the "from" end of the blend. */
  theme: CaseStudyTheme;
  /** Shown at the left of the chrome: the project being left behind. */
  currentTitle?: string;
}) {
  const router = useRouter();
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);
  /** Pin progress, for the cue ring only — the tint writes CSS vars directly. */
  const [cueProgress, setCueProgress] = useState(0);

  const href = project.slug ? `/work/${project.slug}` : null;

  // An unset pageBg resolves to the cream, which is exactly what the next page
  // will render — so the blend always ends on the colour actually arriving.
  const nextTheme = caseStudyTheme(
    project.pageBg,
    project.accent,
    project.textColor,
    project.navColor
  );
  // Destructured to primitives so the effect below depends on the colours
  // themselves rather than on theme object identity, which changes every render.
  const {
    bg: fromBg,
    accent: fromAccent,
    ink: fromInk,
    navInk: fromNavInk,
    inkExplicit: fromInkExplicit,
  } = theme;
  const {
    bg: toBg,
    accent: toAccent,
    ink: toInk,
    navInk: toNavInk,
    inkExplicit: toInkExplicit,
  } = nextTheme;

  const panelInk = toInkExplicit ? toInk : readableInk(toBg);
  const serviceLine = project.services ?? project.category;

  // Subscribed rather than read once: the server has no media query, so the
  // snapshot starts false and settles on the client, and a reader who flips
  // the OS setting mid-visit gets the change without a reload.
  const reduced = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    () => false
  );

  useEffect(() => {
    if (!href || reduced) return;

    const section = sectionRef.current;
    const stage = stageRef.current;
    const cover = coverRef.current;
    if (!section || !stage || !cover) return;

    // So the transition doesn't stall on a cold route.
    router.prefetch(href);

    let navigated = false;

    // The element CaseStudy declares the --cs-* vars on. Writing to the same
    // element overrides its inline values without a re-render. Null when
    // neighbours share a background — then there's nothing to blend.
    const host = fromBg === toBg ? null : section.closest("main") ?? null;
    // Rebuilt from the destructured primitives rather than re-deriving from the
    // background: an editor's explicit text colour has to survive into the
    // blend, and caseStudyTheme(bg, accent) alone would discard it.
    const from = withInk(caseStudyTheme(fromBg, fromAccent), {
      ink: fromInk,
      navInk: fromNavInk,
      inkExplicit: fromInkExplicit,
    });
    const to = withInk(caseStudyTheme(toBg, toAccent), {
      ink: toInk,
      navInk: toNavInk,
      inkExplicit: toInkExplicit,
    });
    const root = document.documentElement;

    /** True once we've actually written to <main> — see the cleanup below. */
    let tinted = false;

    const apply = (palette: CaseStudyTheme) => {
      if (!host) return;
      tinted = true;
      host.style.setProperty("--cs-bg", palette.bg);
      host.style.setProperty("--cs-ink", palette.ink);
      host.style.setProperty("--cs-accent", palette.accent);
      host.style.setProperty("--cs-line", palette.line);
      host.style.setProperty("--cs-muted", palette.muted);
      host.style.setProperty("--cs-nav-ink", palette.navInk);
      // So a rubber-band overscroll past <main> doesn't flash the page white.
      root.style.backgroundColor = palette.bg;
    };

    const tint = (progress: number) => {
      // An untouched page is already showing `from` via CaseStudy's own inline
      // style, so there's nothing to write — and not writing keeps React's
      // StrictMode mount/cleanup/mount cycle a genuine no-op.
      if (!tinted && progress === 0) return;
      apply(blendCaseStudyTheme(from, to, progress));
    };

    const advance = () => {
      if (navigated) return;
      navigated = true;

      // Freezes scroll for the length of the swap and flattens the view
      // transition to a hard cut, then unlocks on a timer that outlives this
      // component — it unmounts *during* the navigation it just started.
      beginCaseStudyAdvance();

      router.push(href);
    };

    // How far the cover travels up from its parked position below the stage.
    // Clamped to the cover's own height so it can never overshoot its top edge
    // and expose the gap above it. Read per call, not cached, so it re-measures
    // on refresh.
    const revealPx = () => {
      const height = cover.getBoundingClientRect().height || 0;
      const wanted = Math.max(REVEAL_MIN_PX, window.innerHeight * REVEAL_VH);
      return height ? Math.min(wanted, height) : wanted;
    };

    // Written per frame rather than tweened: the cover's travel is a function of
    // a *remapped* slice of the pin's progress (see below), not a 1:1 scrub of
    // it, so there is no tween whose timeline could express it.
    const setY = gsap.quickSetter(cover, "y", "px");

    // One pin, every job. The stage holds at the top of the viewport; across the
    // pin the cover rises into the foreground, the palette blends toward the
    // next project's, the cue ring fills, and finally the handoff commits. All
    // from one progress value, so they cannot drift apart.
    //
    // `end` is 180%, not 100%: at 100% the pin's spacer made the trigger's end
    // land exactly on the document's maximum scroll — this section is the last
    // flow content on the page — leaving zero reachable scroll beyond it. That
    // is what stalled the handoff. The extra 80% is real runway, so crossing
    // ADVANCE_PROGRESS happens while the reader is still genuinely scrolling.
    const trigger = ScrollTrigger.create({
      trigger: stage,
      start: "top top",
      end: "+=180%",
      pin: true,
      scrub: true,
      invalidateOnRefresh: true,
      // Above the gallery's pin (1 — its spacer must exist before anything below
      // it measures) in document order, so it measures after that spacer lands.
      refreshPriority: 0,
      onUpdate: (self) => {
        // Rise and blend both complete at REVEAL_PROGRESS; past that the
        // composition is simply held while the reader keeps scrolling.
        const reveal = Math.min(1, self.progress / REVEAL_PROGRESS);
        setY(-revealPx() * reveal);
        tint(reveal);
        setCueProgress(self.progress);

        // Threshold rather than `onLeave`: onLeave needs progress to hit exactly
        // 1, which anticipatePin and Lenis's easing conspire to prevent. The
        // `navigated` latch inside advance() makes the repeat calls harmless.
        if (self.progress >= ADVANCE_PROGRESS) advance();
      },
    });

    const raf = requestAnimationFrame(() => ScrollTrigger.refresh());

    return () => {
      cancelAnimationFrame(raf);
      // `true` to revert: without it the pin spacer and the stage's inline
      // position/transform/size survive the kill, so the incoming page would
      // refresh against half-torn-down bookkeeping.
      trigger.kill(true);
      // The cover's transform was written directly, so it has to be cleared
      // directly — nothing else owns it.
      gsap.set(cover, { clearProps: "transform" });

      // Put this project's own colours back unless we're on our way out to
      // the next one — there the blended colour is what the incoming page
      // should land on, and it brings its own <main> anyway.
      //
      // Restore rather than removeProperty: CaseStudy declares these as a JSX
      // inline style, so React believes they're still set and will never
      // re-apply them. Removing would leave `background-color: var(--cs-bg)`
      // invalid — i.e. transparent — and the page would render white.
      if (tinted && !navigated) apply(from);
    };
  }, [
    href,
    router,
    reduced,
    fromBg,
    fromAccent,
    fromInk,
    fromNavInk,
    fromInkExplicit,
    toBg,
    toAccent,
    toInk,
    toNavInk,
    toInkExplicit,
  ]);

  if (!href) return null;

  return (
    <section ref={sectionRef} className="relative w-full">
      {/* Static label row: this project's name and the scroll cue, sitting in
          normal flow directly under the gallery with a small gap — not
          pinned, not fading. */}
      <div style={{ paddingInline: "var(--cs-gutter)" }}>
        <div
          className="flex justify-between lg:grid lg:grid-cols-2 lg:gap-[clamp(2.5rem,5vw,5rem)] items-center border-t pb-[clamp(1.25rem,2.5vw,2rem)] pt-[1.1rem] text-[0.9rem] uppercase transition-colors duration-[400ms] ease-out"
          style={{
            marginTop: LABEL_GAP,
            borderColor: "var(--cs-ink)",
            color: "var(--cs-ink)",
          }}
        >
          <span
            className="text-left font-medium"
            style={{ fontFamily: "'Helvetica Neue 65 Medium', sans-serif" }}
          >
            {currentTitle}
          </span>
          <span
            className="text-right lg:text-left font-medium tracking-[0.06em]"
            style={{ fontFamily: "'Helvetica Neue 65 Medium', sans-serif" }}
          >
            / Scroll for next section
          </span>
        </div>
      </div>

      {/* The pinned stage: a mirror of a case study's own top — same gutter,
          same heading scale, same Service block — so arriving here reads as
          already being on the next project. Exactly one viewport tall, because
          `start: "top top"` only composes if the element fills the screen.
          Flat background: the tint blends --cs-bg toward the next project's
          colour per frame, so a gradient on top would double-count it. */}
      <div
        ref={stageRef}
        className="relative flex w-full flex-col overflow-hidden"
        style={{
          height: reduced ? undefined : "100vh",
          minHeight: reduced ? "100vh" : undefined,
          backgroundColor: reduced ? nextTheme.bg : "var(--cs-bg)",
          color: panelInk,
        }}
      >
        {!reduced && (
          <ScrollCue
            progress={cueProgress}
            className="absolute left-6 top-[21.6px] z-20 md:left-[40px] md:top-[39.6px]"
          />
        )}

        <div
          className="mx-auto flex w-full flex-1 flex-col justify-center text-center"
          style={{
            paddingInline: "var(--cs-gutter)",
            // A floor, not the page's exact rhythm: the pair is centred in the
            // space above the peek rather than pinned to the top edge.
            paddingTop: "clamp(3.5rem, 8vw, 6.5rem)",
            // Reserves the band the cover rises into, so the title and service
            // line centre above the peek instead of sitting behind it.
            paddingBottom: reduced
              ? "clamp(1.25rem, 1.5vw, 1.375rem)"
              : REVEAL_SPACE,
          }}
        >
          <Link href={href} className="block w-full">
            {/* Deliberately NOT .headline-line / .fade-in-up. Those classes
                have no CSS at all — they're bare GSAP selector hooks, and
                CaseStudy's mount intro scopes them to the <main> this section
                lives inside, so using them here would make the foot of the page
                animate on every page load. Same styles, no hooks. */}
            <h2
              className="font-medium tracking-[-0.04em]"
              style={{
                fontSize: "clamp(3.25rem, 11vw, 6.75rem)",
                lineHeight: 0.95,
              }}
            >
              {project.title}
            </h2>

            {serviceLine && (
              <div className="mt-[clamp(1.5rem,8vw,6.625rem)]">
                <span
                  className="block font-medium text-[0.866rem] uppercase opacity-60"
                  style={{ fontFamily: "'Helvetica Neue 65 Medium', sans-serif" }}
                >
                  Service:
                </span>
                <span
                  className="mt-2 block font-medium text-[clamp(0.9375rem,1.4vw,1.125rem)] uppercase"
                  style={{ fontFamily: "'Helvetica Neue 65 Medium', sans-serif" }}
                >
                  {serviceLine}
                </span>
              </div>
            )}
          </Link>
        </div>

        {/* The foreground peek. Parked at `top-full` — entirely below the
            stage's bottom edge — and translated up by the pin, so the stage's
            overflow-hidden makes the viewport's bottom edge do the cropping:
            a drawer sliding open. z-10 puts it in front of the composition,
            which is the whole point; it is not a background wash.

            Out of flow, so it carries its own gutter to stay aligned with the
            title above. The wrapper renders even without an image so the
            effect always has a node to animate (a missing cover would
            otherwise null the ref and take the palette blend down with it) —
            an absent image is then just a clean --cs-line block, same as the
            case study's own cover placeholder. */}
        <div
          ref={coverRef}
          aria-hidden="true"
          className={
            reduced
              ? "relative z-10 w-full"
              : "pointer-events-none absolute inset-x-0 top-full z-10 will-change-transform"
          }
          style={{ paddingInline: "var(--cs-gutter)" }}
        >
          <div
            className="relative aspect-[16/10] w-full overflow-hidden"
            style={{ backgroundColor: "var(--cs-line)" }}
          >
            {project.cover && (
              <Image
                src={project.cover}
                alt=""
                fill
                sizes="(max-width: 768px) 100vw, 80vw"
                className="object-cover"
              />
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
