"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useSiteContent } from "@/components/ContentProvider";

gsap.registerPlugin(ScrollTrigger);

const DEFAULT_LANDSCAPE = "/images/services.png";
const DEFAULT_ORNAMENT = "/images/ornament-1.jpg";

const SERVICE_CARDS = [
  {
    title: "Brand\nDesign",
    copy: "Identity that earns recognition before a single word is spoken.",
    bg: "#FFFCFA",
    text: "#13284b",
    muted: "rgba(19,40,75,0.72)",
    position: "left center",
    icon: "trend",
  },
  {
    title: "Web\nDevelopment",
    copy: "Fast, scalable websites engineered to perform and convert.",
    bg: "#13284b",
    text: "#FFFCFA",
    muted: "rgba(255,252,250,0.72)",
    position: "center center",
    icon: "nodes",
  },
  {
    title: "UI / UX\nDesign",
    copy: "Experiences that feel effortless from the very first click.",
    bg: "#1D222E",
    text: "#FFFCFA",
    muted: "rgba(255,252,250,0.62)",
    position: "right center",
    icon: "wand",
  },
];

type ServiceIconProps = {
  type: string;
};

const ServiceIcon = ({ type }: ServiceIconProps) => {
  if (type === "trend") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden className="size-[22px]">
        <path
          d="M7 21.5l6.2-6.2 4.2 4.2L25 11.8"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
        <path
          d="M19.5 11.8H25v5.5"
          fill="none"
          stroke="currentColor"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="1.8"
        />
      </svg>
    );
  }

  if (type === "nodes") {
    return (
      <svg viewBox="0 0 32 32" aria-hidden className="size-[24px]">
        <circle cx="10" cy="10" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="21.5" cy="15" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="11.8" cy="23" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.5" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 32 32" aria-hidden className="size-[23px]">
      <path
        d="M8 23.5 23.5 8"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.7"
      />
      <path
        d="m19.5 8.5 4 4M10.5 7.5l1.1-3 1.1 3 3 1.1-3 1.1-1.1 3-1.1-3-3-1.1 3-1.1Zm12 12 0.8-2.1 0.8 2.1 2.1 0.8-2.1 0.8-0.8 2.1-0.8-2.1-2.1-0.8 2.1-0.8Z"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.3"
      />
    </svg>
  );
};

export default function Services() {
  const services = useSiteContent()?.services;

  // Merge CMS copy into the fixed 3-card deck by index; styling/positions and
  // the exact card count (the flip animation asserts 3) stay in code.
  const cards = SERVICE_CARDS.map((card, i) => ({
    ...card,
    title: services?.cards?.[i]?.title ?? card.title,
    copy: services?.cards?.[i]?.copy ?? card.copy,
    icon: services?.cards?.[i]?.iconKey ?? card.icon,
  }));
  const ornamentSrc = services?.ornament ?? DEFAULT_ORNAMENT;
  const landscapeImage = `url("${services?.landscape ?? DEFAULT_LANDSCAPE}")`;
  const headingOverride = services?.heading;

  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const deckRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLElement | null)[]>([]);
  const visualRefs = useRef<(HTMLDivElement | null)[]>([]);
  const contentRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      mm.add("(min-width: 1024px)", () => {
        const stage = stageRef.current;
        const heading = headingRef.current;
        const deck = deckRef.current;
        const cards = cardRefs.current.filter(Boolean) as HTMLElement[];
        const visuals = visualRefs.current.filter(Boolean) as HTMLDivElement[];
        const contents = contentRefs.current.filter(Boolean) as HTMLDivElement[];

        if (
          !stage ||
          !heading ||
          !deck ||
          cards.length !== 3 ||
          visuals.length !== 3 ||
          contents.length !== 3
        ) {
          return;
        }

        const reduceMotion = window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches;

        gsap.set(deck, {
          gap: 0,
          width: "46vw",
          transformStyle: "preserve-3d",
        });
        gsap.set(heading, { y: 18, opacity: 0.78, filter: "blur(1px)" });
        gsap.set(cards, {
          x: 0,
          y: 0,
          rotateX: 0,
          rotateY: 0,
          rotateZ: 0,
          scale: 1,
          transformOrigin: "center center",
          transformStyle: "preserve-3d",
        });
        gsap.set(cards[0], { borderRadius: "8px 0 0 8px", zIndex: 2 });
        gsap.set(cards[1], { borderRadius: "0px", zIndex: 3 });
        gsap.set(cards[2], { borderRadius: "0 8px 8px 0", zIndex: 2 });
        const flipWrappers = visuals.map((el) => el.parentElement as HTMLDivElement);

        gsap.set(flipWrappers, {
          rotateY: 0,
          scale: 1,
          transformOrigin: "center center",
          transformStyle: "preserve-3d",
          force3D: true,
        });
        gsap.set(visuals, {
          z: 1,
          backfaceVisibility: "hidden",
        });
        gsap.set(contents, {
          rotateY: 180,
          z: -1,
          backfaceVisibility: "hidden",
        });

        if (reduceMotion) {
          gsap.set(heading, { y: 0, opacity: 1, filter: "blur(0px)" });
          gsap.set(deck, { gap: "1.6vw", width: "48vw" });
          gsap.set(cards, { borderRadius: "8px" });
          gsap.set(flipWrappers, { rotateY: -180 });
          gsap.set(cards[0], { x: "-2.15vw", y: "2.1vw", rotateY: 13, rotateZ: -7.8 });
          gsap.set(cards[1], { y: "0.2vw", scale: 1.035 });
          gsap.set(cards[2], { x: "2.15vw", y: "1.75vw", rotateY: -13, rotateZ: 7.8 });
          return;
        }

        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: stage,
            start: "top top",
            end: "+=240%",
            pin: true,
            scrub: 0.85,
            anticipatePin: 1,
            invalidateOnRefresh: true,
            // Pinned triggers change document height via their .pin-spacer, so
            // they must refresh before anything below them measures the page.
            refreshPriority: 1,
          },
          defaults: { ease: "none" },
        });

        tl.to(
          heading,
          {
            y: 0,
            opacity: 1,
            filter: "blur(0px)",
            duration: 0.18,
            ease: "power2.out",
          },
          0
        )
          .to(
            deck,
            {
              gap: "1.6vw",
              width: "48vw",
              duration: 0.34,
              ease: "power2.inOut",
            },
            0.2
          )
          .to(
            cards,
            {
              borderRadius: "8px",
              duration: 0.34,
              ease: "power2.inOut",
            },
            0.2
          )
          .to(
            flipWrappers,
            {
              scale: 1.018,
              duration: 0.3,
              ease: "power2.inOut",
            },
            0.2
          )
          .to(
            flipWrappers,
            {
              rotateY: -180,
              duration: 0.5,
              stagger: { each: 0.025, from: "center" },
              ease: "power3.inOut",
            },
            0.36
          )
          .to(
            cards[0],
            {
              x: "-2.15vw",
              y: "2.1vw",
              rotateY: 13,
              rotateZ: -7.8,
              duration: 0.5,
              ease: "power3.inOut",
            },
            0.36
          )
          .to(
            cards[1],
            {
              y: "0.2vw",
              scale: 1.035,
              duration: 0.5,
              ease: "power3.inOut",
            },
            0.36
          )
          .to(
            cards[2],
            {
              x: "2.15vw",
              y: "1.75vw",
              rotateY: -13,
              rotateZ: 7.8,
              duration: 0.5,
              ease: "power3.inOut",
            },
            0.36
          )
          .to({}, { duration: 0.16 });

        return () => {
          tl.scrollTrigger?.kill();
          tl.kill();
          const flipWrappers = visuals.map((el) => el.parentElement as HTMLDivElement);
          gsap.killTweensOf([heading, deck, ...cards, ...visuals, ...contents, ...flipWrappers]);
        };
      });

      mm.add("(max-width: 1023px)", () => {
        gsap.set(
          [
            headingRef.current,
            deckRef.current,
            ...cardRefs.current,
            ...visualRefs.current,
            ...contentRefs.current,
          ],
          { clearProps: "all" }
        );
      });

      return () => mm.revert();
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative isolate w-full overflow-hidden bg-[#FFFCFA] px-6 text-black sm:px-10 lg:px-0 pb-12 lg:pb-32"
    >
      <div className="py-16 lg:hidden">
        <h2
          className="mx-auto max-w-[800px] text-left font-light leading-[1.3] text-[#1D222E] drop-shadow-none text-[31px] sm:text-[42px] whitespace-pre-wrap"
          style={{ fontFamily: "var(--font-helv)", fontWeight: 300 }}
        >
          {headingOverride ?? (
            <>
              {`            Your website is the \nfirst impression `}
              <span className="inline-block align-middle mx-2 w-[2.8em] h-[1em] relative overflow-hidden rounded-[2em] top-[-0.1em]">
                <Image src={ornamentSrc} alt="ornament" fill className="object-cover" />
              </span>
              {` for every client \n`}
              <span className="text-[#858EA3]">you will ever have.</span>
              {` \n                     It should be worth having.`}
            </>
          )}
        </h2>

        <div
          aria-hidden
          className="mx-auto mt-9 aspect-[15/7] max-w-[680px] overflow-hidden rounded-[8px]"
          style={{
            backgroundImage: landscapeImage,
            backgroundPosition: "center",
            backgroundSize: "cover",
          }}
        />

        <div className="mx-auto mt-8 grid max-w-[720px] grid-cols-1 gap-4 sm:grid-cols-3">
          {cards.map((card) => (
            <article
              key={card.title}
              className="flex min-h-[286px] flex-col justify-between rounded-[8px] p-6 shadow-[0_20px_70px_rgba(0,0,0,0.35)]"
              style={{ backgroundColor: card.bg, color: card.text }}
            >
              <div className="opacity-65">
                <ServiceIcon type={card.icon} />
              </div>
              <div>
                <h3
                  className="whitespace-pre-line text-[29px] leading-[0.98]"
                  style={{ fontFamily: "var(--font-helv)", fontWeight: 300 }}
                >
                  {card.title}
                </h3>
                <p
                  className="mt-3 text-[17px] leading-[1.45] opacity-90"
                  style={{
                    color: card.muted,
                    fontFamily: "var(--font-helv)",
                    fontWeight: 300,
                  }}
                >
                  {card.copy}
                </p>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div ref={stageRef} className="relative hidden h-[100dvh] min-h-[680px] lg:block">
        <div className="flex h-[100dvh] min-h-[680px] flex-col items-center justify-center [perspective:1500px]">
          <h2
            ref={headingRef}
            className="mb-[7vh] text-left text-[clamp(28px,2.55vw,48px)] font-light leading-[1.3] text-[#1D222E] drop-shadow-none whitespace-pre-wrap max-w-[1000px]"
            style={{ fontFamily: "var(--font-helv)", fontWeight: 300 }}
          >
            {headingOverride ?? (
              <>
                {`            Your website is the \nfirst impression `}
                <span className="inline-block align-middle mx-[0.3em] w-[2.8em] h-[1em] relative overflow-hidden rounded-[2em] top-[-0.1em]">
                  <Image src={ornamentSrc} alt="ornament" fill className="object-cover" />
                </span>
                {` for every client \n`}
                <span className="text-[#858EA3]">you will ever have.</span>
                {` \n                     It should be worth having.`}
              </>
            )}
          </h2>

          <div
            ref={deckRef}
            className="flex items-stretch justify-center [transform-style:preserve-3d] will-change-transform"
            style={{ gap: 0, width: "46vw" }}
          >
            {cards.map((card, index) => (
              <article
                key={card.title}
                ref={(el) => {
                  cardRefs.current[index] = el;
                }}
                className="relative aspect-[5/7] flex-1 [transform-style:preserve-3d] will-change-transform"
                style={{
                  borderRadius:
                    index === 0
                      ? "8px 0 0 8px"
                      : index === 1
                        ? "0px"
                        : "0 8px 8px 0",
                  color: card.text,
                  perspective: "1200px",
                  marginLeft: index > 0 ? "-1px" : undefined,
                }}
              >
                <div
                  className="absolute inset-0 shadow-[0_28px_80px_rgba(0,0,0,0.36)] [transform-style:preserve-3d] will-change-transform"
                  style={{ borderRadius: "inherit", backgroundColor: card.bg }}
                >
                  <div
                    ref={(el) => {
                      visualRefs.current[index] = el;
                    }}
                    aria-hidden
                    className="absolute inset-0 -right-px overflow-hidden will-change-transform"
                    style={{
                      backfaceVisibility: "hidden",
                      backgroundImage: landscapeImage,
                      backgroundPosition: card.position,
                      backgroundRepeat: "no-repeat",
                      backgroundSize: "300% 100%",
                      borderRadius: "inherit",
                      transform: "translateZ(1px)",
                      WebkitBackfaceVisibility: "hidden",
                    }}
                  />

                  <div
                    ref={(el) => {
                      contentRefs.current[index] = el;
                    }}
                    className="absolute inset-0 flex flex-col justify-between overflow-hidden p-[clamp(20px,1.55vw,30px)] will-change-transform"
                    style={{
                      backfaceVisibility: "hidden",
                      backgroundColor: card.bg,
                      borderRadius: "inherit",
                      color: card.text,
                      opacity: 1,
                      transform: "rotateY(180deg) translateZ(1px)",
                      WebkitBackfaceVisibility: "hidden",
                    }}
                  >
                    <div className="opacity-58">
                      <ServiceIcon type={card.icon} />
                    </div>
                    <div>
                      <h3
                        className="whitespace-pre-line text-[clamp(26px,1.8vw,36px)] leading-[0.98]"
                        style={{ fontFamily: "var(--font-helv)", fontWeight: 300 }}
                      >
                        {card.title}
                      </h3>
                      <p
                        className="mt-[clamp(12px,1.2vw,20px)] max-w-[34ch] text-[clamp(15px,1.15vw,20px)] leading-[1.45] opacity-90"
                        style={{
                          color: card.muted,
                          fontFamily: "var(--font-helv)",
                          fontWeight: 300,
                        }}
                      >
                        {card.copy}
                      </p>
                    </div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>


    </section>
  );
}
