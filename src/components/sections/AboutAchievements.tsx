"use client";

import React, { useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useSiteContent } from "@/components/ContentProvider";
import type { AchievementItem } from "@/lib/sanity/types";

gsap.registerPlugin(ScrollTrigger);

const DEFAULT_ACHIEVEMENTS: AchievementItem[] = [
  {
    title: "Smart Bengal Hackathon\nFinalist '25",
    description:
      "Reached the finals from 800+ submissions leading UI/UX design and frontend development for the team. Developed Waste2Wealth, an AI-powered agri-waste marketplace with separate farmer and industry portals and a built-in bidding system for raw material sourcing.",
    badge: "/images/smart-bengal-badge.png",
    image: "/images/hackathon-team.png",
    alt: "Smart Bengal Hackathon Finalist Team",
  },
  {
    title: "Edunet X IBM Internship",
    description:
      "6-week AICTE-recognized front-end program on IBM SkillsBuild. Developed Atmos, a real-time weather app with GPS location detection, dark/light mode and offline caching, deployed on Vercel.",
    badge: "/images/aicte-logo.png",
    image: "/images/edunet-certificate.png",
    alt: "Edunet X IBM Certificate of Completion",
  },
];

export default function AboutAchievements() {
  const content = useSiteContent();
  const achievements =
    content?.about?.achievements?.length
      ? content.about.achievements
      : DEFAULT_ACHIEVEMENTS;
  const visibleAchievements = achievements.filter((item) => !item.hidden);

  const containerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    const cards = gsap.utils.toArray<HTMLElement>(".achievement-card", root);

    if (reduceMotion) {
      gsap.set(cards, { opacity: 1, y: 0, filter: "none" });
      return;
    }

    const ctx = gsap.context(() => {
      cards.forEach((card) => {
        gsap.fromTo(
          card,
          { opacity: 0, y: 50, filter: "blur(6px)" },
          {
            opacity: 1,
            y: 0,
            filter: "blur(0px)",
            duration: 1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: card,
              start: "top 82%",
            },
          }
        );
      });

      const imageContainers = gsap.utils.toArray<HTMLElement>(".achievement-image-reveal", root);
      imageContainers.forEach((container) => {
        // We use clip-path polygon to wipe from bottom to top.
        // Start: 100% on the Y axis for the top points (so it's collapsed at the bottom)
        gsap.fromTo(
          container,
          { 
            clipPath: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)",
            WebkitClipPath: "polygon(0% 100%, 100% 100%, 100% 100%, 0% 100%)"
          },
          {
            clipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
            WebkitClipPath: "polygon(0% 0%, 100% 0%, 100% 100%, 0% 100%)",
            duration: 1.4,
            ease: "power3.out",
            scrollTrigger: {
              trigger: container,
              start: "top 85%",
            }
          }
        );

        // Optional slight image scale-down during reveal for extra polish
        const img = container.querySelector(".achievement-img");
        if (img) {
          gsap.fromTo(
            img,
            { scale: 1.15 },
            {
              scale: 1,
              duration: 1.4,
              ease: "power3.out",
              scrollTrigger: {
                trigger: container,
                start: "top 85%",
              }
            }
          );
        }
      });
    }, containerRef);

    return () => ctx.revert();
  }, []);

  if (visibleAchievements.length === 0) return null;

  return (
    <section
      ref={containerRef}
      className="relative w-full bg-cream py-16 md:py-28 lg:pb-36"
    >
      <div className="relative mx-auto w-full max-w-[1360px] px-6 md:px-[40px] lg:px-[60px] flex flex-col gap-24 lg:gap-36">
        {visibleAchievements.map((item, index) => {
          const isEven = index % 2 === 0;
          const badgeSrc = item.badge || (isEven ? "/images/smart-bengal-badge.png" : "/images/aicte-logo.png");
          const imageSrc = item.image || (isEven ? "/images/hackathon-team.png" : "/images/edunet-certificate.png");

          // Helper to split title into line 1 ("Smart Bengal Hackathon") & line 2 ("Finalist '25")
          let titleText = item.title || "";
          if (titleText.includes("Smart Bengal Hackathon") && !titleText.includes("\n")) {
            titleText = titleText.replace("Smart Bengal Hackathon ", "Smart Bengal Hackathon\n");
          }
          const titleLines = titleText.split("\n");

          return (
            <div
              key={index}
              className={`achievement-card grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-16 items-center ${
                isEven ? "" : "lg:grid-flow-dense"
              }`}
            >
              {/* Media Column */}
              <div
                className={`lg:col-span-6 flex ${
                  isEven
                    ? "justify-center lg:justify-end"
                    : "justify-center lg:justify-start lg:col-start-7"
                }`}
              >
                <div
                  className={`achievement-image-reveal relative w-full max-w-[460px] overflow-hidden rounded-sm bg-stone-100 ${
                    isEven ? "lg:-translate-x-[10%]" : "lg:translate-x-[10%]"
                  }`}
                >
                  <div
                    className="relative w-full"
                    style={{ aspectRatio: "7 / 8.1" }}
                  >
                    <Image
                      src={imageSrc}
                      alt={item.alt || item.title || "Achievement photo"}
                      fill
                      sizes="(max-width: 1024px) 100vw, 42vw"
                      className="object-cover achievement-img"
                    />
                  </div>
                </div>
              </div>

              {/* Text / Info Column */}
              <div
                className={`lg:col-span-6 flex flex-col items-start justify-center ${
                  isEven ? "" : "lg:col-start-1"
                }`}
              >
                {/* Badge Icon */}
                {badgeSrc && (
                  <div className="relative mb-5 md:mb-6 h-22 w-22 md:h-28 md:w-28">
                    <Image
                      src={badgeSrc}
                      alt={`${item.title} logo`}
                      fill
                      className="object-contain object-left"
                    />
                  </div>
                )}

                {/* Title */}
                {item.title && (
                  <h2
                    className="mb-6 text-2xl font-normal leading-[1.15] tracking-[-0.03em] text-ink sm:text-3xl md:text-[2.5rem] lg:text-[2.75rem] max-w-[25ch]"
                    style={{ fontFamily: "var(--font-hanken), sans-serif" }}
                  >
                    {titleLines.map((line, lIdx) => (
                      <span key={lIdx} className="block">
                        {line}
                      </span>
                    ))}
                  </h2>
                )}

                {/* Description */}
                {item.description && (
                  <p
                    className="max-w-[48ch] text-base leading-[1.65] text-ink md:text-lg text-left"
                    style={{ fontFamily: "var(--font-hanken), sans-serif" }}
                  >
                    {item.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
