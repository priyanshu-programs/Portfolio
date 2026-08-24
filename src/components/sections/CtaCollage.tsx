"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import CtaConversation from "./CtaConversation";
import { useSiteContent } from "@/components/ContentProvider";
import Link from "@/components/transition/SmartLink";

gsap.registerPlugin(ScrollTrigger);

// Each image's desktop position is anchored to the 1058×526 Figma frame, then
// expressed as percentages so the collage scales gracefully.
// Added initialZ and endZ for 3D scrolling effect
const IMAGES = [
  { src: "/images/cta1-img-5.png", left: 9.0, top: 15.4, w: 12.1, h: 21.5, zInit: -300, zEnd: 1500 },
  { src: "/images/cta1-img-2.png", left: 18.4, top: 41.1, w: 12.2, h: 20.9, zInit: -600, zEnd: 1800 },
  { src: "/images/cta1-img-3.png", left: 8.6, top: 66.2, w: 12.5, h: 22.6, zInit: -150, zEnd: 1200 },
  { src: "/images/cta1-img-4.png", left: 48.1, top: 64.6, w: 12.2, h: 21.5, zInit: -500, zEnd: 1700 },
  { src: "/images/cta1-img-1.png", left: 64.9, top: 38.0, w: 12.3, h: 21.7, zInit: -250, zEnd: 1300 },
  { src: "/images/cta1-img-6.png", left: 79.2, top: 11.2, w: 12.3, h: 22.4, zInit: -700, zEnd: 2000 },
];

const HAND_LAYOUT = {
  left: {
    className:
      "absolute pointer-events-none z-20 left-[-6vw] top-[40%] h-[70vw] w-[70vw] sm:left-[-4vw] sm:top-[34%] sm:h-[52vw] sm:w-[52vw] lg:left-[-3vw] lg:top-[28%] lg:h-[44vw] lg:w-[44vw] xl:left-[-2.7vw] xl:top-[26%] xl:h-[41.5vw] xl:w-[41.5vw]",
    imageClassName: "object-contain object-left-center",
    sizes: "(max-width: 640px) 70vw, (max-width: 1024px) 52vw, (max-width: 1280px) 44vw, 41.5vw",
    fromXPercent: -32,
    fromYPercent: 8,
    rotation: 0,
  },
  right: {
    className:
      "absolute pointer-events-none z-20 right-[-4vw] top-[20%] h-[52vw] w-[78vw] sm:right-[-2vw] sm:top-[16%] sm:h-[36vw] sm:w-[54vw] lg:right-[-1vw] lg:top-[14%] lg:h-[33vw] lg:w-[49.5vw] xl:right-[0vw] xl:top-[17.5%] xl:h-[31.3vw] xl:w-[47vw]",
    imageClassName: "object-contain object-right-center",
    sizes: "(max-width: 640px) 78vw, (max-width: 1024px) 54vw, (max-width: 1280px) 49.5vw, 47vw",
    fromXPercent: 32,
    fromYPercent: 8,
    rotation: 0,
  },
} as const;

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

const DEFAULT_HEADLINE = "no more forgettable work";
const DEFAULT_REVEAL_HEADLINE = "Good work starts with a conversation.";
const DEFAULT_LINK_TEXT = "Let's have one.";

export default function CtaCollage() {
  const content = useSiteContent();
  const cta = content?.cta;
  const collage = cta?.collage ?? [];
  const handLeftSrc = cta?.handLeft ?? "/images/hand left.png";
  const handRightSrc = cta?.handRight ?? "/images/hand right.png";
  const headline = cta?.headline ?? DEFAULT_HEADLINE;
  const revealHeadline = cta?.revealHeadline ?? DEFAULT_REVEAL_HEADLINE;
  const linkText = cta?.linkText ?? DEFAULT_LINK_TEXT;

  const containerRef = useRef<HTMLElement>(null);
  const imagesDesktopRef = useRef<(HTMLDivElement | null)[]>([]);
  const imagesMobileRef = useRef<(HTMLDivElement | null)[]>([]);
  const textRef = useRef<HTMLDivElement>(null);
  const nextSectionRef = useRef<HTMLDivElement>(null);
  const newTextRef = useRef<HTMLDivElement>(null);
  const handLeftRef = useRef<HTMLDivElement>(null);
  const handRightRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    /* Captured now rather than read in the cleanup: by teardown React may have
       already detached the node and nulled the ref, and the cleanup below has
       to match the trigger against the very element it was created for. */
    const container = containerRef.current;

    const ctx = gsap.context(() => {
      // Pin the section and animate Z values
      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: containerRef.current,
          start: "top top",
          end: "+=200%", // Tighter scroll range
          scrub: 1,
          pin: true,
          /* No spacer, and pinned by transform rather than position:fixed.
             Both matter for correctness, not just layout: with the default
             `pinSpacing`, ScrollTrigger injects a .pin-spacer div and moves
             this <section> inside it. React never sees that re-parent, so when
             page.tsx's `{isDesktop && <CtaCollage />}` gate flips false, React
             calls removeChild on the parent it recorded and the browser throws
             NotFoundError. The section already reserves its own viewport
             height below, so the spacer's contributed height buys nothing. */
          pinSpacing: false,
          pinType: "transform",
          anticipatePin: 1,
          invalidateOnRefresh: true,
          // Still first to refresh: this trigger pins the last full-viewport
          // section on the page, so anything measuring below it wants this
          // one's start/end settled before it reads its own.
          refreshPriority: 1,
        },
      });

      // Animate Desktop Images
      imagesDesktopRef.current.forEach((el, i) => {
        if (el) {
          const img = IMAGES[i];
          gsap.set(el, { z: img.zInit, opacity: 1 }); // Normal visibility
          tl.to(
            el,
            {
              z: img.zEnd,
              duration: 1,
              ease: "power1.inOut",
            },
            0
          );
        }
      });

      // Animate Mobile Images
      imagesMobileRef.current.forEach((el, i) => {
        if (el) {
          const img = IMAGES[i];
          gsap.set(el, { z: img.zInit, opacity: 1 });
          tl.to(
            el,
            {
              z: img.zEnd,
              duration: 1,
              ease: "power1.inOut",
            },
            0
          );
        }
      });

      // Bring in the next section seamlessly as an expanding dot
      if (nextSectionRef.current) {
        gsap.set(nextSectionRef.current, {
          opacity: 1,
          scale: 0,
        });

        tl.to(
          nextSectionRef.current,
          {
            scale: 1,
            pointerEvents: "auto",
            duration: 0.6,
            ease: "power2.inOut",
          },
          0.20 // Hands appear very early
        );
      }

      // --- HAND ANIMATIONS ---
      // Hands slide in perfectly synced with the text reveal.
      // Text has 9 words, stagger 0.05, duration 0.4 → runs from 1.00 to ~1.80.
      // Hands match that exact window so fingers draw closer as words appear.
      if (handLeftRef.current) {
        gsap.set(handLeftRef.current, {
          xPercent: HAND_LAYOUT.left.fromXPercent,
          yPercent: HAND_LAYOUT.left.fromYPercent,
          rotation: HAND_LAYOUT.left.rotation,
          opacity: 0,
        });
        tl.to(
          handLeftRef.current,
          {
            xPercent: 0,
            yPercent: 0,
            opacity: 1,
            duration: 0.8,
            ease: "power2.out",
          },
          1.00 // Starts with the first word
        );
      }

      if (handRightRef.current) {
        gsap.set(handRightRef.current, {
          xPercent: HAND_LAYOUT.right.fromXPercent,
          yPercent: HAND_LAYOUT.right.fromYPercent,
          rotation: HAND_LAYOUT.right.rotation,
          opacity: 0,
        });
        tl.to(
          handRightRef.current,
          {
            xPercent: 0,
            yPercent: 0,
            opacity: 1,
            duration: 0.8,
            ease: "power2.out",
          },
          1.00 // Starts with the first word
        );
      }

      // Animate Headline out of screen once picture is fullscreen (at 1.60)
      if (textRef.current) {
        gsap.set(textRef.current, { z: 50 });
        tl.to(
          textRef.current,
          {
            opacity: 0,
            duration: 0.2,
            ease: "power1.inOut",
          },
          0.80
        );
      }

      // Animate new text word by word
      const newTextWords = newTextRef.current?.querySelectorAll<HTMLSpanElement>(".reveal-inner");
      if (newTextWords && newTextWords.length) {
        gsap.set(newTextWords, {
          yPercent: 110,
          opacity: 0,
          filter: "blur(6px)",
        });

        tl.to(
          newTextWords,
          {
            yPercent: 0,
            opacity: 1,
            filter: "blur(0px)",
            duration: 0.4,
            stagger: 0.05,
            ease: "power3.out",
          },
          1.00 // Starts after old text fades out
        );
      }

      // Animate underline left to right on scrolling
      const underline = newTextRef.current?.querySelector(".cta-underline");
      if (underline) {
        gsap.set(underline, { scaleX: 0, transformOrigin: "left center" });
        tl.to(
          underline,
          {
            scaleX: 1,
            duration: 0.3,
            ease: "power2.out",
          },
          1.50 // Starts right after text reveal is complete
        );
      }
    }, containerRef);

    /* Kill the trigger before reverting the context, and revert it explicitly
       with `true` — same shape as NextProject's cleanup. This runs as a child
       effect cleanup in the very commit React deletes this <section>, so any
       GSAP-owned wrapper or inline geometry that outlives the kill would still
       be in place when React reaches for the node. Order it so nothing does. */
    return () => {
      ScrollTrigger.getAll()
        .filter((t) => t.trigger === container)
        .forEach((t) => t.kill(true));
      ctx.revert();
    };
  }, []);

  return (
    <section
      ref={containerRef}
      className="relative w-full bg-[#FFFCFA] overflow-hidden min-h-[520px] h-[100dvh]"
      style={{ perspective: "1000px", transformStyle: "preserve-3d" }}
    >
      {/* Desktop / tablet: scattered floating images */}
      <div className="hidden sm:block absolute inset-0 w-full h-full z-10" style={{ transformStyle: "preserve-3d" }}>
        {IMAGES.map((img, i) => (
          <div
            key={i}
            ref={(el) => {
              imagesDesktopRef.current[i] = el;
            }}
            className="absolute rounded-md overflow-hidden shadow-2xl"
            style={{
              left: `${img.left}%`,
              top: `${img.top}%`,
              width: `${img.w}%`,
              height: `${img.h}%`,
            }}
          >
            <Image
              src={collage[i] ?? img.src}
              alt=""
              fill
              sizes="130px"
              className="object-cover"
            />
          </div>
        ))}
      </div>

      {/* Mobile: simple grid of the same images behind the headline */}
      <div
        className="sm:hidden grid grid-cols-3 gap-2 px-6 pt-10 absolute inset-0 w-full h-full z-10"
        style={{ transformStyle: "preserve-3d" }}
      >
        {IMAGES.map((img, i) => (
          <div
            key={i}
            ref={(el) => {
              imagesMobileRef.current[i] = el;
            }}
            className="relative aspect-[4/3] rounded-md overflow-hidden shadow-lg"
          >
            <Image src={collage[i] ?? img.src} alt="" fill sizes="33vw" className="object-cover" />
          </div>
        ))}
      </div>

      {/* Centered headline */}
      <div
        ref={textRef}
        className="absolute inset-0 flex items-center justify-center px-6 pointer-events-none z-30 mix-blend-difference"
      >
        <h2
          className="text-center text-white font-light leading-tight"
          style={{ fontSize: "clamp(28px, 4.6vw, 43px)" }}
        >
          {headline}
        </h2>
      </div>

      {/* New conversation text that reveals word by word */}
      <div
        ref={newTextRef}
        className="absolute inset-0 flex flex-col items-center justify-center px-6 pointer-events-auto z-40 mix-blend-difference"
      >
        <h2
          className="text-center text-white font-light leading-tight max-w-[800px]"
          style={{ fontSize: "clamp(26px, 4.6vw, 43px)" }}
        >
          <Reveal>{revealHeadline}</Reveal>{" "}
          <Link
            href="/contact"
            className="relative inline-block italic hover:opacity-70 transition-opacity group"
          >
            <Reveal>{linkText}</Reveal>
            <span className="cta-underline absolute bottom-[-4px] left-0 w-full h-[2px] bg-white origin-left scale-x-0 will-change-transform" />
          </Link>
        </h2>
      </div>

      {/* The Next Section integrated to appear seamlessly */}
      <div
        ref={nextSectionRef}
        className="absolute inset-0 z-0 opacity-0 pointer-events-none flex flex-col justify-end"
      >
        <CtaConversation src={cta?.twoHands} />
      </div>

      {/* Left Hand — slides in from the left */}
      <div
        ref={handLeftRef}
        className={HAND_LAYOUT.left.className}
      >
        <Image
          src={handLeftSrc}
          alt=""
          fill
          sizes={HAND_LAYOUT.left.sizes}
          className={HAND_LAYOUT.left.imageClassName}
        />
      </div>

      {/* Right Hand — slides in from the right */}
      <div
        ref={handRightRef}
        className={HAND_LAYOUT.right.className}
      >
        <Image
          src={handRightSrc}
          alt=""
          fill
          sizes={HAND_LAYOUT.right.sizes}
          className={HAND_LAYOUT.right.imageClassName}
        />
      </div>
    </section>
  );
}
