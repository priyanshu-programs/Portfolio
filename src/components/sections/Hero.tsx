"use client";

import TransitionLink from "@/components/transition/TransitionLink";
import {
  LANDING_INTRO_STORAGE_KEY,
  PAGE_REVEAL_EVENT,
  useTransition,
} from "@/components/transition/TransitionContext";
import LiquidImage from "@/components/ui/LiquidImage";
import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

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
const KineticLoader = () => (
  <div className="relative inline-flex items-center justify-center size-[76px] rounded-full bg-white shrink-0 text-ink font-oswald">
    {/* The solid background that expands on hover */}
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,_#60a5fa_0%,_var(--color-border-deep)_50%,_#818cf8_100%)] animate-flow-gradient rounded-full scale-0 transition-transform duration-[600ms] ease-[cubic-bezier(0.85,0,0.15,1)] z-10 group-hover:scale-100" />

    {/* The SVG Text Layer */}
    <div className="absolute inset-0 flex items-center justify-center z-20 transition-colors duration-400 group-hover:text-[#f4f4f4]">
      <svg viewBox="0 0 100 100" width="100%" height="100%" className="overflow-visible animate-[spin_10s_linear_infinite] group-hover:animate-[spin_3s_linear_infinite]">
        <defs>
          <path id="circlePath" d="M 50, 50 m -36, 0 a 36,36 0 1,1 72,0 a 36,36 0 1,1 -72,0" />
        </defs>
        <text fontSize="10.5" fontWeight="600" fill="currentColor" letterSpacing="1.2">
          <textPath href="#circlePath" startOffset="0%" textLength="226" lengthAdjust="spacing">
            LET&apos;S TALK • LET&apos;S TALK • LET&apos;S TALK •
          </textPath>
        </text>
      </svg>
    </div>

    {/* The Center Icon */}
    <div className="relative z-30 flex items-center justify-center transition-all duration-[600ms] ease-[cubic-bezier(0.85,0,0.15,1)] group-hover:rotate-45 group-hover:scale-125 group-hover:text-[#f4f4f4]">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="24" height="24">
        <path d="M6 18L18 6M18 6H8M18 6V16" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      </svg>
    </div>
  </div>
);

/* ─── Navigation ──────────────────────────────────────── */
const NAV = [
  { label: "Work", href: "/work" },
  { label: "About", href: "/#about" },
  { label: "Contact", href: "/#contact" },
];

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

export default function Hero() {
  const { isAnimating, isLandingIntroActive } = useTransition();
  const isTransitionEntryRef = useRef(false);
  const shouldRevealOnMountRef = useRef(true);
  const sectionRef = useRef<HTMLElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLElement>(null);
  const portraitRef = useRef<HTMLDivElement>(null);
  const marqueeWrapRef = useRef<HTMLDivElement>(null);
  const marqueeInnerRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement>(null);
  const introWrapRef = useRef<HTMLDivElement>(null);
  const introRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const hasAnimatedRef = useRef(false);

  useLayoutEffect(() => {
    isTransitionEntryRef.current = isAnimating;
    shouldRevealOnMountRef.current = !isAnimating && !isLandingIntroActive;
  }, [isAnimating, isLandingIntroActive]);

  useLayoutEffect(() => {
    let handleReveal: ((event: Event) => void) | null = null;

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

      /* ── Initial hidden states ────────────────────── */
      gsap.set(frameRef.current, { clearProps: "clipPath" });
      gsap.set(navRef.current, { y: -18, opacity: 0 });
      gsap.set(portraitRef.current, { y: 36, scale: 1.04, opacity: 0.2 });
      gsap.set(marqueeWrapRef.current, { y: 24, opacity: 0 });
      gsap.set(pillRef.current, { x: -42, opacity: 0 });
      gsap.set(introWrapRef.current, { y: 20, opacity: 0 });
      gsap.set(glowRef.current, { scale: 0.9, opacity: 0 });

      if (reduceMotion) {
        gsap.set(words ?? [], {
          yPercent: 0,
          opacity: 1,
        });
      } else {
        gsap.set(words ?? [], {
          yPercent: 110,
          opacity: 0,
        });
      }

      const revealHero = () => {
        if (hasAnimatedRef.current) {
          return;
        }

        hasAnimatedRef.current = true;

        if (reduceMotion) {
          gsap.set(frameRef.current, { clipPath: "inset(0% 0% 0% 0%)" });
          gsap.set(navRef.current, { y: 0, opacity: 1 });
          gsap.set(portraitRef.current, { y: 0, scale: 1, opacity: 1 });
          gsap.set(marqueeWrapRef.current, { y: 0, opacity: 1 });
          gsap.set(pillRef.current, { x: 0, opacity: 1 });
          gsap.set(introWrapRef.current, { y: 0, opacity: 1 });
          gsap.set(glowRef.current, { scale: 1, opacity: 0.3 });
          return;
        }

        const tl = gsap.timeline({
          defaults: { ease: "power3.out" },
          delay: isTransitionEntryRef.current ? 0.08 : 0.18,
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
            marqueeWrapRef.current,
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

      handleReveal = (event: Event) => {
        const customEvent = event as CustomEvent<{ path?: string }>;

        if (customEvent.detail?.path === "/") {
          revealHero();
        }
      };

      window.addEventListener(PAGE_REVEAL_EVENT, handleReveal);

      let shouldWaitForLandingIntro = false;

      try {
        shouldWaitForLandingIntro =
          window.location.pathname === "/" &&
          window.sessionStorage.getItem(LANDING_INTRO_STORAGE_KEY) !== "true";
      } catch {}

      if (shouldRevealOnMountRef.current && !shouldWaitForLandingIntro) {
        revealHero();
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
        },
      });

      parallaxTl
        .to(portraitRef.current, { y: 120, ease: "none" }, 0) // Portrait scrolls slightly slower (sinks a bit but gets clipped cleanly)
        .to(marqueeWrapRef.current, { y: -80, ease: "none" }, 0) // Marquee scrolls faster
        .to(introWrapRef.current, { y: -40, ease: "none" }, 0) // Intro text scrolls slightly faster
        .to(pillRef.current, { y: -60, ease: "none" }, 0); // Pill scrolls faster

    }, sectionRef);

    return () => {
      if (handleReveal) {
        window.removeEventListener(PAGE_REVEAL_EVENT, handleReveal);
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
          <nav
            ref={navRef}
            className="relative z-30 flex items-center justify-between px-6 md:px-[40px] pt-8 md:pt-[44px] text-[16px]"
            style={{
              fontWeight: 300,
              letterSpacing: "-0.01em"
            }}
          >
            <span style={{
              fontWeight: 300,
              letterSpacing: "-0.01em"
            }}>© Priyanshu Roy</span>
            <ul className="flex items-center gap-8 md:gap-[76px]" style={{
              fontWeight: 300,
              letterSpacing: "-0.01em"
            }}>
              {NAV.map((item) => (
                <li key={item.label}>
                  <TransitionLink
                    href={item.href}
                    className="magnetic-hover relative group inline-block py-1"
                    style={{
                      fontWeight: 300,
                      letterSpacing: "-0.01em"
                    }}
                  >
                    {item.label}
                    <span className="absolute left-0 bottom-0 w-full h-[1px] bg-current origin-left scale-x-0 transition-transform duration-300 ease-out group-hover:scale-x-100" />
                  </TransitionLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* ── Portrait ─────────────────────────────── */}
          <div
            ref={portraitRef}
            className="transition-hero-image absolute left-1/2 -translate-x-1/2 bottom-0 w-[95vw] sm:w-[80vw] lg:w-full lg:max-w-[750px] h-full z-10 pointer-events-none"
          >
            <LiquidImage
              src="/images/hero-portrait.png"
              alt="Priyanshu Roy"
              className="w-full h-full pointer-events-auto"
            />
          </div>

          {/* ── Script Marquee ────────────────────────── */}
          <div
            ref={marqueeWrapRef}
            aria-hidden
            className="pointer-events-none absolute left-0 w-full top-[58%] sm:top-[62%] lg:top-[79%] lg:-translate-y-1/2 z-20 mix-blend-difference"
          >
            <div
              ref={marqueeInnerRef}
              className="flex items-center w-fit whitespace-nowrap font-script text-white leading-[1.2] select-none animate-marquee py-2 lg:py-4 will-change-transform"
              style={{ fontSize: "clamp(72px, 17vw, 240px)" }}
            >
              <div className="flex items-center shrink-0">
                <span>Priyanshu Roy</span>
                <DashSeparator />
                <span>Priyanshu Roy</span>
                <DashSeparator />
                <span>Priyanshu Roy</span>
                <DashSeparator />
              </div>
              <div className="flex items-center shrink-0">
                <span>Priyanshu Roy</span>
                <DashSeparator />
                <span>Priyanshu Roy</span>
                <DashSeparator />
                <span>Priyanshu Roy</span>
                <DashSeparator />
              </div>
            </div>
          </div>

          {/* ── "Open to projects" Pill ──────────────── */}
          <div
            ref={pillRef}
            className="relative z-30 mt-[150px] sm:mt-[180px] lg:mt-0 lg:absolute lg:left-0 lg:top-[38%]"
          >
            <div className="group flex items-center gap-[48px] bg-ink text-white rounded-r-full rounded-l-none w-fit -ml-8 pl-[80px] pr-[16px] h-[100px] cursor-pointer transition-transform duration-[420ms] ease-[cubic-bezier(0.25,0.46,0.45,0.94)] hover:translate-x-4">
              <span className="text-[18px] sm:text-[20px] leading-[1.15] font-light">
                Open to
                <br />
                projects
              </span>
              <KineticLoader />
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
                <Reveal>Brand Designer</Reveal>
                <br />
                <Reveal>&amp; Web Developer</Reveal>
              </h1>
              <p className="mt-3 text-hero-desc leading-[1.4] text-ink/80" style={{ fontWeight: 300 }}>
                <Reveal>Most sites look like</Reveal>
                <br />
                <Reveal>templates. Mine don&apos;t.</Reveal>
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
