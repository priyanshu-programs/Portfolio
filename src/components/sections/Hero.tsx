"use client";

import {
  LANDING_INTRO_DONE_EVENT,
  LANDING_INTRO_STORAGE_KEY,
} from "@/components/transition/LandingIntro";
import LiquidImage from "@/components/ui/LiquidImage";
import TopNav from "@/components/ui/TopNav";
import { useSiteContent } from "@/components/ContentProvider";
import { resolveNavAppearance } from "@/lib/nav";
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
  const portraitSrc = hero?.portrait ?? "/images/hero-portrait.png";
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
  const pillRef = useRef<HTMLDivElement>(null);
  const introWrapRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const hasAnimatedRef = useRef(false);

  useLayoutEffect(() => {
    let mounted = true;
    let handleReveal: (() => void) | null = null;

    // Next can restore cached routes on browser back/forward while preserving refs.
    // Reset the reveal guard whenever the effect re-activates so the intro can play again.
    hasAnimatedRef.current = false;

    const ctx = gsap.context(() => {
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;

      const words = introRef.current?.querySelectorAll<HTMLSpanElement>(
        ".reveal-inner"
      );

      // The hero's animated entrance is only meaningful once: on the very first
      // visit, right after the landing-intro overlay lifts. On any other mount
      // (a normal navigation or reload) the hero must stay VISIBLE so the native
      // view-transition captures full content in the incoming-page snapshot and
      // the clip-reveal actually shows it — matching the work page. If we hid it
      // here (in a pre-paint layout effect), work→home would reveal an empty page.
      let shouldWaitForLandingIntro = false;
      try {
        shouldWaitForLandingIntro =
          window.location.pathname === "/" &&
          window.sessionStorage.getItem(LANDING_INTRO_STORAGE_KEY) !== "true";
      } catch {}
      const playIntroEntrance = shouldWaitForLandingIntro && !reduceMotion;

      // Harmless reset regardless of path.
      gsap.set(frameRef.current, { clearProps: "clipPath" });

      if (playIntroEntrance) {
        /* ── Initial hidden states (first visit only) ── */
        gsap.set(navRef.current, { y: -18, opacity: 0 });
        gsap.set(portraitRef.current, { y: 36, scale: 1.04, opacity: 0.2 });
        gsap.set(marqueeRevealRef.current, { y: 24, opacity: 0 });
        gsap.set(pillRef.current, { x: -42, opacity: 0 });
        gsap.set(introWrapRef.current, { y: 20, opacity: 0 });
        gsap.set(glowRef.current, { scale: 0.9, opacity: 0 });
        gsap.set(words ?? [], { yPercent: 110, opacity: 0 });
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

        const tl = gsap.timeline({
          defaults: { ease: "power3.out" },
          delay: 0.18,
        });

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
          .to(
            portraitRef.current,
            {
              y: 0,
              scale: 1,
              opacity: 1,
              duration: 1.18,
              ease: "power2.out",
            },
            0.04
          )
          .to(
            navRef.current,
            { y: 0, opacity: 1, duration: 0.72 },
            0.1
          )
          .to(
            introWrapRef.current,
            { y: 0, opacity: 1, duration: 0.72 },
            0.16
          )
          .to(
            pillRef.current,
            { x: 0, opacity: 1, duration: 0.78 },
            0.2
          )
          .to(
            marqueeRevealRef.current,
            { y: 0, opacity: 1, duration: 0.95 },
            0.34
          );

        if (words && words.length) {
          tl.to(
            words,
            {
              yPercent: 0,
              opacity: 1,
              duration: 0.78,
              ease: "power3.out",
              stagger: 0.035,
            },
            0.26
          );
        }
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
      ctx.revert();
    };
  }, []);

  return (
    <>
      <NoiseOverlay />

      <section
        ref={sectionRef}
        className="relative w-full bg-cream overflow-hidden min-h-[520px] lg:h-screen"
      >
        <div ref={frameRef} className="relative w-full bg-cream min-h-[520px] lg:h-full">
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
            className="transition-hero-image absolute left-1/2 -translate-x-1/2 bottom-0 w-[95vw] sm:w-[80vw] lg:w-full lg:max-w-[750px] h-full z-10 pointer-events-none"
          >
            <LiquidImage
              src={portraitSrc}
              alt={name}
              className="w-full h-full pointer-events-auto"
            />
          </div>

          {/* ── Script Marquee ────────────────────────── */}
          <div
            ref={marqueeWrapRef}
            aria-hidden
            className="pointer-events-none absolute left-0 w-full top-[58%] sm:top-[62%] lg:top-[79%] lg:-translate-y-1/2 z-20 mix-blend-difference"
          >
            <div ref={marqueeRevealRef} className="w-full will-change-transform">
              <div
                ref={marqueeInnerRef}
                className="flex items-center w-fit whitespace-nowrap font-script text-white leading-[1.2] select-none animate-marquee py-2 lg:py-4 will-change-transform"
                style={{ fontSize: "clamp(72px, 17vw, 240px)" }}
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
          <div
            ref={pillRef}
            className="relative z-30 mt-[150px] sm:mt-[180px] lg:mt-0 lg:absolute lg:left-0 lg:top-[38%] group cursor-pointer w-fit"
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
          </div>

          {/* ── Intro Text Block ─────────────────────── */}
          <div
            ref={introWrapRef}
            className="relative z-30 px-6 sm:px-8 lg:px-0 lg:absolute lg:left-[calc(50%+27vw)] lg:top-[38%] mt-4 lg:mt-0 lg:w-[22vw] lg:max-w-[300px]"
          >
            <div ref={introRef}>
              <h1
                className="text-hero-label leading-[1.15] text-ink"
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
              <p className="mt-3 text-hero-desc leading-[1.4] text-ink/80" style={{ fontWeight: 300 }}>
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
