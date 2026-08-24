"use client";

import {
  HERO_PORTRAIT_ATTR,
  LANDING_INTRO_DONE_EVENT,
  shouldPlayLandingIntro,
} from "@/components/transition/LandingIntro";
import Link from "@/components/transition/SmartLink";
import LiquidImage from "@/components/ui/LiquidImage";
import TopNav from "@/components/ui/TopNav";
import { useSiteContent } from "@/components/ContentProvider";
import { resolveNavAppearance } from "@/lib/nav";
import { PORTRAIT_FOCUS } from "@/lib/heroPortrait";
import { useIsDesktop } from "@/lib/useMediaQuery";
import { Fragment, useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import KineticLoader from "@/components/ui/KineticLoader";

gsap.registerPlugin(ScrollTrigger);

/* ─── Dash Separator ─────────────────────────── */
const DashSeparator = () => (
  <span className="mx-6 sm:mx-10 flex items-center">
    <span
      className="block bg-white"
      style={{ width: "0.75em", height: "0.035em" }}
    />
  </span>
);

/* ─── Inline SVG Noise (for the global overlay) ───────── */
const NoiseOverlay = () => (
  <svg className="noise-overlay" aria-hidden="true">
    <filter id="noise">
      <feTurbulence
        type="fractalNoise"
        baseFrequency="0.65"
        numOctaves="3"
        stitchTiles="stitch"
      />
    </filter>
    <rect width="100%" height="100%" filter="url(#noise)" />
  </svg>
);

/* ─── Kinetic Loader ───────────────────────────────────── */
// Extracted to src/components/ui/KineticLoader.tsx

/* ─── Word-reveal helper ──────────────────────────────── */
const Reveal = ({ children }: { children: string }) => (
  <>
    {children.split(" ").map((w, i) => (
      <span
        key={i}
        className="reveal-word inline-block overflow-hidden align-bottom mr-[0.25em]"
      >
        <span className="reveal-inner inline-block will-change-transform">
          {w}
        </span>
      </span>
    ))}
  </>
);

const DEFAULT_NAME = "Priyanshu Roy";
const DEFAULT_HEADING = "Brand Designer\n& Web Developer";
const DEFAULT_PARAGRAPH = "Most sites look like\ntemplates. Mine don't.";
const DEFAULT_PILL = "Open to\nprojects";

export default function Hero() {
  const content = useSiteContent();
  const settings = content?.settings;
  const hero = content?.hero;

  const name = settings?.name ?? DEFAULT_NAME;
  // Blend stays the default here: the portrait scrolls under the nav, and a
  // flat ink would be swallowed by it at some point in the scroll.
  const { blend: navBlend, color: navColor } = resolveNavAppearance(settings);
  const marqueeText = hero?.marqueeText ?? name;
  const loaderText = hero?.loaderText; // Using default from KineticLoader if undefined
  const portraitSrc = hero?.portrait ?? "/images/hero-portrait.webp";
  const headingLines = (hero?.heading ?? DEFAULT_HEADING).split("\n");
  const paragraphLines = (hero?.paragraph ?? DEFAULT_PARAGRAPH).split("\n");
  const pillLines = (hero?.pillLabel ?? DEFAULT_PILL).split("\n");

  const sectionRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const portraitRef = useRef<HTMLDivElement>(null);
  const marqueeWrapRef = useRef<HTMLDivElement>(null);
  const marqueeRevealRef = useRef<HTMLDivElement>(null);
  const marqueeInnerRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLAnchorElement>(null);
  const introWrapRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const hasAnimatedRef = useRef(false);

  /* Below `lg` the hero fills the viewport (h-[100dvh]). A ~0.45 phone viewport
     can only be filled by this 0.75 portrait by cropping ~38% of its width —
     that part is arithmetic. What matters is WHERE that crop is taken from: the
     head spans x≈0.17-0.65 while the shoulders run nearly the full frame, so a
     centred crop clips the face and pushes it to ~35% of screen. Anchoring on
     the face takes the crop out of the empty shoulder instead, keeping the head
     whole and landing it at ~48% — visually centred. See PORTRAIT_FOCUS.

     The breakpoint and the focal point both live in @/lib/heroPortrait, shared
     with LandingIntro: it fits its centre panel onto the rect this paints, so
     any drift between the two desyncs the seam at the handoff.

     Starts `false` so SSR and the first client render match — `lg` is the
     layout the markup's base classes describe.

     The shared hook rather than a local matchMedia subscription: it owns the
     same DESKTOP_QUERY and already defers its ScrollTrigger.refresh() by a
     frame. The hand-rolled copy that used to live here refreshed inline, right
     after its own setState, which put a full re-measure of every pinned trigger
     inside the commit that reshapes the page at the breakpoint. Nothing here
     needs the refresh to be synchronous — `isDesktop` only picks props below. */
  const isDesktop = useIsDesktop();

  useLayoutEffect(() => {
    let mounted = true;
    let handleReveal: (() => void) | null = null;
    let marqueeTicker: ((time: number, deltaTime: number) => void) | null = null;

    // Reset the reveal guard whenever the effect re-activates, so a later mount
    // is never left waiting on a guard a previous one set.
    //
    // This is cheap insurance rather than a live case: a 404 round-trip crosses
    // a document boundary in both directions (Next's router turns the non-200
    // RSC response into `location.assign`), so the Back that follows brings back
    // either a fresh document with fresh refs, or a bfcache restore in which this
    // effect does not re-run at all. Neither path can carry a stale `true` in.
    hasAnimatedRef.current = false;

    const ctx = gsap.context(() => {
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      const words = introRef.current?.querySelectorAll<HTMLSpanElement>(
        ".reveal-inner"
      );

      /*
       * Keep the marquee on the same GSAP lifecycle as the rest of the hero.
       * The old CSS animation started before the hero entrance had finished,
       * which made Priyanshu Roy feel detached from the other reveals.
       */
      // Positive speed drifts the track right (the wordmark reads
      // left-to-right); negative runs it right-to-left. The ticker steps in
      // px-per-frame, normalised against a 60fps baseline below.
      const MARQUEE_IDLE_SPEED = 2.2;
      let marqueeSpeed = MARQUEE_IDLE_SPEED;
      let targetMarqueeSpeed = MARQUEE_IDLE_SPEED;
      let marqueeX = 0;

      // A document-wide trigger purely as a velocity source. The hero's own
      // skew trigger below is scoped to `top top`/`bottom top`, so it goes
      // quiet once the hero scrolls away — this one stays live for the whole
      // page and keeps the reversal responsive wherever the user is.
      const marqueeVelocityTracker = ScrollTrigger.create({
        trigger: document.documentElement,
        start: 0,
        end: () => ScrollTrigger.maxScroll(window),
      });

      const updateMarqueeSpeed = (scrollVelocity: number) => {
        // Any scroll gesture — up or down — reverses the wordmark to
        // right-to-left, proportional to how hard the user is scrolling.
        // Releasing the scroll settles it back to its left-to-right drift.
        const speed = Math.abs(scrollVelocity);
        targetMarqueeSpeed = speed > 30
          ? -gsap.utils.clamp(0.9, 7.5, speed / 180)
          : MARQUEE_IDLE_SPEED;
      };

      marqueeTicker = (_time, deltaTime) => {
        const track = marqueeInnerRef.current;
        const firstCopy = track?.firstElementChild as HTMLElement | null;
        if (!track || !firstCopy) return;

        // Read velocity every frame rather than only from the hero's
        // ScrollTrigger.onUpdate: that trigger stops firing once the hero
        // scrolls past, which would freeze the marquee at whatever speed it
        // last saw. Polling here also lets it settle back to the idle drift
        // the moment the gesture ends.
        updateMarqueeSpeed(marqueeVelocityTracker.getVelocity());

        marqueeSpeed += (targetMarqueeSpeed - marqueeSpeed) * 0.12;
        marqueeX += marqueeSpeed * (deltaTime / 16.67);

        const copyWidth = firstCopy.offsetWidth;
        if (copyWidth > 0) {
          marqueeX = gsap.utils.wrap(-copyWidth, 0, marqueeX);
        }
        gsap.set(track, { x: marqueeX });
      };
      gsap.ticker.add(marqueeTicker);

      // The hero's animated entrance is only meaningful once: on the very first
      // visit, right after the landing-intro overlay lifts. On any other mount
      // (a normal navigation or reload) the hero must stay VISIBLE so the native
      // view-transition captures full content in the incoming-page snapshot and
      // the clip-reveal actually shows it — matching the work page. If we hid it
      // here (in a pre-paint layout effect), work→home would reveal an empty page.
      //
      // This asks LandingIntro's own predicate rather than re-deriving the rule:
      // the two must agree exactly, because pre-hiding here while the intro
      // stands down would leave the hero waiting on an event that never fires.
      const playIntroEntrance = shouldPlayLandingIntro();

      // Harmless reset regardless of path.
      gsap.set(frameRef.current, { clearProps: "clipPath" });

      if (playIntroEntrance) {
        /* ── Initial hidden states (first visit only) ──
           The portrait is deliberately absent: LandingIntro fits its centre
           panel onto this exact box and cross-fades into it, so the portrait
           must already be at its final position and opacity when the intro
           lands. Animating it here too would pop at the seam. */
        // Main hero content starts inside the lower half of the dark field.
        // It rises into place first; the veil follows that movement below.
        // Keep the objects solid. They are hidden by the preloader's stacking
        // layer until the push begins; opacity would make this read as a fade.
        gsap.set(navRef.current, { y: 26, opacity: 0 });
        gsap.set(marqueeInnerRef.current, { yPercent: 110 }); // Mask reveal for the marquee
        gsap.set(pillRef.current, { x: -40, opacity: 0 });
        gsap.set(introWrapRef.current, { y: 40, opacity: 0 });
        gsap.set(glowRef.current, { scale: 0.9, opacity: 0 });
        gsap.set(words ?? [], { yPercent: 110, opacity: 1 });
      }

      const revealHero = (instant = reduceMotion) => {
        if (hasAnimatedRef.current) {
          return;
        }

        hasAnimatedRef.current = true;

        if (instant) {
          gsap.set(frameRef.current, { clipPath: "inset(0% 0% 0% 0%)" });
          gsap.set(navRef.current, { y: 0, opacity: 1 });
          gsap.set(portraitRef.current, { y: 0, scale: 1, opacity: 1 });
          gsap.set(marqueeRevealRef.current, { y: 0, opacity: 1 });
          gsap.set(pillRef.current, { x: 0, opacity: 1 });
          gsap.set(introWrapRef.current, { y: 0, opacity: 1 });
          gsap.set(glowRef.current, { scale: 1, opacity: 0.3 });
          return;
        }

        /* The hero elements establish the push before the veil follows. They
           must be visible entering from below the dark field, otherwise the
           wipe reads as an independent overlay instead of their consequence. */
        const tl = gsap.timeline({
          defaults: { ease: "power3.out" },
        });

        // The landing intro is a higher stacking context than the hero. Once
        // the handoff begins, keep the moving hero elements above that stage
        // so their push-in/up motion is visible as part of the wipe.
        gsap.set(navRef.current, { zIndex: 12001 });
        gsap.set(marqueeWrapRef.current, { zIndex: 12001 });
        gsap.set(pillRef.current, { zIndex: 12001 });
        gsap.set(introWrapRef.current, { zIndex: 12001 });

        tl.to(
            glowRef.current,
            {
              scale: 1,
              opacity: 0.3,
              duration: 1.2,
              ease: "power2.out",
            },
            0
          )
          // No portrait tween: LandingIntro's fitted panel is what arrives in
          // that slot, and it hands over an already-visible portrait.
          .to(
            navRef.current,
            { y: 0, opacity: 1, duration: 1.0, ease: "power3.out" },
            0
          )
          .to(
            introWrapRef.current,
            { y: 0, opacity: 1, duration: 1.2, ease: "power3.out" },
            0.1
          )
          .to(
            marqueeInnerRef.current,
            { yPercent: 0, duration: 1.4, ease: "power3.out" },
            0.15
          )
          .to(
            pillRef.current,
            { x: 0, opacity: 1, duration: 1.0, ease: "power3.out" },
            0.2
          );

        if (words && words.length) {
          tl.to(
            words,
            {
              yPercent: 0,
              duration: 1.2,
              ease: "power3.out",
              stagger: 0.035,
            },
            0.2
          );
        }

        // The elevated zIndex above was only needed to stay above the
        // landing-intro stage during the handoff. Left in place, it's an
        // inline style that permanently outranks FollowCursor's canvas
        // (zIndex 10050), leaving the custom cursor invisible under the pill
        // for the rest of the session. Clear it once the handoff has played.
        tl.set(
          [
            navRef.current,
            marqueeWrapRef.current,
            pillRef.current,
            introWrapRef.current,
          ],
          { clearProps: "zIndex" }
        );
      };

      if (playIntroEntrance) {
        // First visit: wait for the landing intro to finish, then animate in.
        handleReveal = () => {
          revealHero();
        };
        window.addEventListener(LANDING_INTRO_DONE_EVENT, handleReveal);
      } else {
        // Normal nav / reload / reduced motion: content is already visible, so
        // the view-transition reveal is the entrance. Snap to the final state.
        revealHero(true);
      }

      /* ── Scroll-linked marquee skew ───────────────── */
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: "top top",
        end: "bottom top",
        scrub: 0.8,
        onUpdate: (self) => {
          // Marquee speed is polled from the ticker; this trigger only skews.
          const skewVal = self.getVelocity() / -300;
          gsap.to(marqueeInnerRef.current, {
            skewX: gsap.utils.clamp(-4, 4, skewVal),
            duration: 0.3,
            ease: "power2.out",
            overwrite: true,
          });
        },
      });

      /* ── Scroll Parallax Effects ──────────────── */
      const parallaxTl = gsap.timeline({
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 1,
          invalidateOnRefresh: true,
        },
      });

      parallaxTl
        .to(portraitRef.current, { y: 120, ease: "none" }, 0) // Portrait scrolls slightly slower (sinks a bit but gets clipped cleanly)
        .to(marqueeWrapRef.current, { y: -80, ease: "none" }, 0) // Marquee scrolls faster
        .to(introWrapRef.current, { y: -40, ease: "none" }, 0) // Intro text scrolls slightly faster
        .to(pillRef.current, { y: -60, ease: "none" }, 0); // Pill scrolls faster

      /* ── Re-sync trigger geometry once webfonts settle ─── */
      if (typeof document !== "undefined" && document.fonts?.ready) {
        document.fonts.ready.then(() => {
          if (mounted) ScrollTrigger.refresh();
        });
      }

    }, sectionRef);

    return () => {
      mounted = false;
      if (handleReveal) {
        window.removeEventListener(LANDING_INTRO_DONE_EVENT, handleReveal);
      }
      if (marqueeTicker) {
        gsap.ticker.remove(marqueeTicker);
      }
      ctx.revert();
    };
  }, []);

  return (
    <>
      <NoiseOverlay />

      <section
        ref={sectionRef}
        className="relative w-full bg-cream overflow-hidden h-[100dvh] min-h-[520px] lg:h-screen"
      >
        <div ref={frameRef} className="relative w-full bg-cream h-[100dvh] min-h-[520px] lg:h-full">
          {/* ── Ambient Depth Glow ───────────────────── */}
          <div
            ref={glowRef}
            aria-hidden
            className="absolute left-1/2 top-[55%] -translate-x-1/2 -translate-y-1/2 w-[60vw] h-[60vw] max-w-[700px] max-h-[700px] rounded-full pointer-events-none z-[5] animate-glow-breathe"
            style={{
              background:
                "radial-gradient(circle, rgba(119,0,0,0.12) 0%, rgba(255,252,250,0) 70%)",
            }}
          />

          {/* ── Top Navbar ───────────────────────────── */}
          <TopNav
            ref={navRef}
            name={name}
            variant="hero"
            blend={navBlend}
            color={navColor}
          />

          {/* ── Portrait ─────────────────────────────── */}
          <div
            ref={portraitRef}
            {...{ [HERO_PORTRAIT_ATTR]: "" }}
            className="transition-hero-image absolute left-1/2 -translate-x-1/2 bottom-0 w-full lg:max-w-[750px] h-full z-10 pointer-events-none"
          >
            <LiquidImage
              src={portraitSrc}
              alt={name}
              fit={isDesktop ? "contain" : "cover"}
              focus={isDesktop ? undefined : PORTRAIT_FOCUS}
              sizes="(max-width: 1024px) 100vw, 750px"
              className="w-full h-full pointer-events-auto"
            />
          </div>

          {/* ── Script Marquee ────────────────────────── */}
          <div
            ref={marqueeWrapRef}
            aria-hidden
            /* Mobile offsets track the figure, not the box: under cover the
               source's vertical fractions map ~1:1 to viewport %, putting the
               chin at 38%, chest at 60% and the lower torso at 75%. The old
               58%/62% predate the full-height portrait and now cut across the
               chest. */
            className="pointer-events-none absolute left-0 w-full top-[72%] sm:top-[74%] lg:top-[79%] lg:-translate-y-1/2 z-20 mix-blend-difference"
          >
            <div ref={marqueeRevealRef} className="w-full overflow-hidden will-change-transform">
              <div
                ref={marqueeInnerRef}
                className="flex items-center w-fit whitespace-nowrap font-script text-white leading-[1.2] select-none py-2 lg:py-4 will-change-transform"
                /* Floor and vw term are both 20% above the desktop-derived
                   base: below ~424px the vw term sits under the floor, so on
                   phones the floor is what actually renders and raising vw
                   alone would do nothing there. The 240px ceiling is
                   untouched, so wide desktop is unchanged. */
                style={{ fontSize: "clamp(104px, 24.7vw, 240px)" }}
              >
                <div className="flex items-center shrink-0">
                  <span>{marqueeText}</span>
                  <DashSeparator />
                  <span>{marqueeText}</span>
                  <DashSeparator />
                  <span>{marqueeText}</span>
                  <DashSeparator />
                </div>
                <div className="flex items-center shrink-0">
                  <span>{marqueeText}</span>
                  <DashSeparator />
                  <span>{marqueeText}</span>
                  <DashSeparator />
                  <span>{marqueeText}</span>
                  <DashSeparator />
                </div>
              </div>
            </div>
          </div>

          {/* ── "Open to projects" Pill ──────────────── */}
          <Link
            ref={pillRef}
            href="/contact"
            aria-label="Open to projects, let's talk"
            className="hidden lg:flex relative z-30 mt-[150px] sm:mt-[180px] lg:mt-0 lg:absolute lg:left-0 lg:top-[38%] group cursor-pointer w-fit"
          >
            <div className="flex items-center gap-[48px] bg-ink text-white rounded-r-full rounded-l-none w-fit -ml-8 pl-[80px] pr-[16px] h-[100px] transition-transform duration-[420ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] group-hover:translate-x-4">
              <span className="text-[18px] sm:text-[20px] leading-[1.15] font-light">
                {pillLines.map((line, i) => (
                  <Fragment key={i}>
                    {i > 0 && <br />}
                    {line}
                  </Fragment>
                ))}
              </span>
              <KineticLoader text={loaderText} />
            </div>
          </Link>

          {/* ── Mobile "Let's talk" arrow ─────────────── */}
          <Link
            href="/contact"
            aria-label="Open to projects, let's talk"
            className="lg:hidden absolute z-30 right-0 bottom-8 sm:bottom-10 px-6 sm:px-8 text-white mix-blend-difference"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="28" height="28">
              <path d="M6 18L18 6M18 6H8M18 6V16" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
            </svg>
          </Link>

          {/* ── Intro Text Block ─────────────────────── */}
          <div
            ref={introWrapRef}
            className="absolute z-30 left-0 bottom-8 sm:bottom-10 px-6 sm:px-8 lg:px-0 lg:bottom-auto lg:left-[calc(50%+27vw)] lg:top-[38%] lg:w-[22vw] lg:max-w-[300px] mix-blend-difference lg:mix-blend-normal"
          >
            <div ref={introRef}>
              <h1
                className="text-hero-label leading-[1.15] text-white lg:text-ink"
                style={{
                  fontWeight: 400,
                  letterSpacing: "-0.01em"
                }}
              >
                {headingLines.map((line, i) => (
                  <Fragment key={i}>
                    {i > 0 && <br />}
                    <Reveal>{line}</Reveal>
                  </Fragment>
                ))}
              </h1>
              <p className="hidden lg:block mt-3 text-hero-desc leading-[1.4] text-ink/80" style={{ fontWeight: 300 }}>
                {paragraphLines.map((line, i) => (
                  <Fragment key={i}>
                    {i > 0 && <br />}
                    <Reveal>{line}</Reveal>
                  </Fragment>
                ))}
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
