"use client";

import { useLayoutEffect, useRef } from "react";
import gsap from "gsap";
import { CustomEase } from "gsap/CustomEase";

import Link from "@/components/transition/SmartLink";

/* ─────────────────────────────────────────────────────────────────────────────
   NotFoundStage — "Out of Frame"

   The numerals are atmosphere, not subject. One oversized `404` sits behind the
   page — softened and dropped back in alpha, but still plainly readable as a
   404 — and resolves into focus as the page arrives. The centred
   `(Out of Frame)` label is what the eye lands on; the copy and the way back
   sit bottom-right, out of the numeral's way.

   The restraint is the point. Nothing here demands attention after the first
   1.4 seconds — the page is *almost* still, and that residual motion is what
   separates it from a static error screen.

   ── Why the start states are duplicated in CSS ──────────────────────────────
   Every animated element carries its GSAP `from` state in globals.css as an
   `.nf-*-armed` / armed class. Without it the element paints at its final
   position for a frame before the timeline arms, and the entrance reads as a
   flicker-then-replay. This mirrors the `html.intro-armed` technique
   LandingIntro uses to hand off from its pre-paint script to its timeline.

   ── Why the footer flag lives on <html> ─────────────────────────────────────
   `usePathname()` cannot identify a 404 — it returns whatever bad URL the user
   typed, so SiteFooter's case-study regex has nothing to match on. This stage
   raises `html.is-404` instead and SiteFooter observes it. The coupling stays
   one-directional: the stage knows nothing about the footer.
   ───────────────────────────────────────────────────────────────────────────── */

gsap.registerPlugin(CustomEase);

/** Set on <html> while this page is mounted, so SiteFooter can stand down. */
export const NOT_FOUND_CLASS = "is-404";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

/* The intro's easing vocabulary, reused rather than reinvented. The names are
   namespaced so registering here can never clobber LandingIntro's copies if
   both happen to be alive during a transition. */
const GLIDE = CustomEase.create("nf-glide", "0.22, 1, 0.36, 1");
const SETTLE = CustomEase.create("nf-settle", "0.16, 1, 0.3, 1");

/** Resting appearance of the backdrop numeral. Mirrors `.nf-backdrop` in
    globals.css — the blur and the opacity are a pair (see the note there), so
    they are kept together here too. */
const BACKDROP_BLUR = 10;
const BACKDROP_OPACITY = 0.13;

/** Period of the backdrop's breathing scale, in seconds. Deliberately slow
    enough that you only catch it if you stare. */
const BREATHE_DUR = 14;
/** Max drift of the backdrop under cursor parallax, in px. */
const DRIFT_PX = 18;

/* ─── Word-reveal helper ──────────────────────────────────
   The house idiom, duplicated from Hero.tsx / AboutWork.tsx. There is no shared
   primitive in this repo; copying it *is* the established pattern. */
const Reveal = ({ children }: { children: string }) => (
  <>
    {children.split(" ").map((w, i) => (
      <span
        key={i}
        className="reveal-word inline-block overflow-hidden align-bottom mr-[0.25em]"
      >
        <span className="reveal-inner nf-reveal-inner inline-block will-change-transform">
          {w}
        </span>
      </span>
    ))}
  </>
);

export default function NotFoundStage() {
  const rootRef = useRef<HTMLElement>(null);
  const backdropRef = useRef<HTMLDivElement>(null);
  const subRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLDivElement>(null);

  /* Raise the footer-suppression flag before paint, so the footer never gets a
     frame on screen before being told to stand down. */
  useLayoutEffect(() => {
    const root = document.documentElement;
    root.classList.add(NOT_FOUND_CLASS);
    return () => root.classList.remove(NOT_FOUND_CLASS);
  }, []);

  useLayoutEffect(() => {
    const ctx = gsap.context(() => {
      const words = gsap.utils.toArray<HTMLElement>(".reveal-inner");
      const reduceMotion = window.matchMedia(REDUCED_MOTION_QUERY).matches;

      /* Reduced motion: jump straight to the end state. Never "skip the
         animation and leave things invisible" — that is the one failure mode
         this codebase consistently guards against. */
      if (reduceMotion) {
        gsap.set(backdropRef.current, {
          opacity: BACKDROP_OPACITY,
          filter: `blur(${BACKDROP_BLUR}px)`,
          scale: 1,
        });
        gsap.set(words, { yPercent: 0, opacity: 1 });
        gsap.set([subRef.current, ctaRef.current], { y: 0, opacity: 1 });
        return;
      }

      /* `y: 0` alongside `yPercent` for the same reason the backdrop restates
         its whole transform below — the armed CSS state is parsed into a px `y`
         baseline that `yPercent` would otherwise stack on top of, leaving the
         words displaced after the tween completes. */
      gsap.set(words, { y: 0, yPercent: 110, opacity: 1 });
      gsap.set(subRef.current, { y: 30, opacity: 0 });
      gsap.set(ctaRef.current, { y: 24, opacity: 0 });

      /* The backdrop's start state is declared in CSS as `.nf-backdrop-armed`
         to stop a pre-paint flash. GSAP parses that transform into its own
         baseline and would apply further tweens on top of it, so the start is
         restated here in GSAP's terms — that collapses the two systems into one
         and lets the tween own the whole transform. */
      gsap.set(backdropRef.current, {
        opacity: 0,
        filter: "blur(22px)",
        scale: 1.06,
      });

      /* The 0.1 offset keeps the entrance clear of the site's signature 0.9s
         `pr-page-reveal` clip-path zoom, which is already running when this
         page is reached through a SmartLink. Same offset Hero and /work use. */
      const tl = gsap.timeline({ delay: 0.1 });

      /* The ground establishes first, then the label lands on top of it. */
      tl.to(backdropRef.current, {
        opacity: BACKDROP_OPACITY,
        filter: `blur(${BACKDROP_BLUR}px)`,
        scale: 1,
        duration: 1.4,
        ease: GLIDE,
      })
        .to(
          words,
          { yPercent: 0, duration: 1.2, ease: "power3.out", stagger: 0.035 },
          0.35
        )
        .to(
          subRef.current,
          { y: 0, opacity: 1, duration: 1, ease: "power3.out" },
          0.75
        )
        .to(ctaRef.current, { y: 0, opacity: 1, duration: 0.9, ease: SETTLE }, 0.9);

      /* ── Ambient loop A: the backdrop breathes ────────────────────────────
         Started from the timeline so it inherits the entrance's landing scale
         rather than fighting it. */
      tl.add(() => {
        gsap.to(backdropRef.current, {
          scale: 1.03,
          duration: BREATHE_DUR,
          ease: "power1.inOut",
          yoyo: true,
          repeat: -1,
        });
      }, 1.5);

      /* ── Ambient loop B: cursor parallax drift ────────────────────────────
         The backdrop drifts under a fixed label — on blurred type that reads
         better than tilting the glyphs themselves, which just smears.

         Skipped on coarse pointers: a drift driven by touch only updates on
         tap, which reads as a glitch rather than a response. */
      if (window.matchMedia("(pointer: coarse)").matches) return;

      const driftX = gsap.quickTo(backdropRef.current, "x", {
        duration: 0.9,
        ease: "power3.out",
      });
      const driftY = gsap.quickTo(backdropRef.current, "y", {
        duration: 0.9,
        ease: "power3.out",
      });

      const handlePointerMove = (e: PointerEvent) => {
        const nx = e.clientX / window.innerWidth - 0.5;
        const ny = e.clientY / window.innerHeight - 0.5;
        // Moves with the cursor, not against it: the ghost follows the eye.
        driftX(nx * DRIFT_PX);
        driftY(ny * DRIFT_PX);
      };

      window.addEventListener("pointermove", handlePointerMove);
      return () => window.removeEventListener("pointermove", handlePointerMove);
    }, rootRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={rootRef}
      className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#FFFCFA] px-6"
    >
      {/* Every animated element carries a CSS armed start state so it cannot
          paint at its final position before the entrance runs. Those states are
          only ever cleared by GSAP, so without this the page renders blank when
          scripts are unavailable. Neutralizing them here keeps the content
          legible — the same guarantee the reduced-motion block provides. */}
      <noscript>
        <style>{`
          .nf-reveal-inner, .nf-sub, .nf-cta {
            transform: none !important;
            opacity: 1 !important;
          }
          .nf-backdrop-armed {
            transform: none !important;
            opacity: 0.13 !important;
            filter: blur(10px) !important;
          }
        `}</style>
      </noscript>

      <div
        ref={backdropRef}
        className="nf-backdrop nf-backdrop-armed"
        aria-hidden
      >
        404
      </div>

      {/* The backdrop is decorative; this carries the meaning for screen readers. */}
      <h1 className="sr-only">404 — page not found</h1>

      <p className="nf-label relative z-10 text-hero-label leading-[1.25]">
        <Reveal>(Out of Frame)</Reveal>
      </p>

      {/* Bottom-right on desktop, aligned to TopNav's `md:px-[40px]` gutter so
          the two share an edge. Below `md` it falls back into normal flow under
          the label, where it cannot collide with the oversized numeral. */}
      <div className="relative z-10 mt-16 w-full max-w-[34ch] md:absolute md:bottom-[12vh] md:right-[40px] md:mt-0 md:w-auto">
        <p
          ref={subRef}
          className="nf-sub text-body font-light leading-[1.45] text-[#1d1d1f]"
        >
          Looks like this page slipped out of focus.
          <br />
          Let&rsquo;s get you back in the shot.
        </p>

        <div ref={ctaRef} className="nf-cta mt-6">
          <Link href="/" className="nf-back text-body font-light text-[#1d1d1f]">
            Back to Home
          </Link>
        </div>
      </div>
    </section>
  );
}
