"use client";

import React, { Fragment, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "@/components/transition/SmartLink";
import { useSiteContent } from "@/components/ContentProvider";
import HoverPreviewCard from "@/components/ui/HoverPreviewCard";
import { GlassButton } from "@/components/ui/glass-button";

gsap.registerPlugin(ScrollTrigger);

/* ─── Word-reveal helper (mirrors Hero) ──────────────────── */
const Reveal = ({ children }: { children: string }) => (
  <>
    {children.split(" ").map((w, i) => (
      <span
        key={i}
        className="about-reveal-word inline-block overflow-hidden align-bottom mr-[0.28em]"
      >
        <span className="about-reveal-inner inline-block will-change-transform">
          {w}
        </span>
      </span>
    ))}
  </>
);

const MoreWorkButton = () => {
  const buttonRef = useRef<HTMLAnchorElement>(null);
  // Same source the /work index counts from, so the two numbers never drift.
  // Not homeWork — that query is sliced to the 4 pinned projects.
  const workCount = useSiteContent()?.workProjects?.length ?? 0;

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    buttonRef.current.style.setProperty('--mouse-x', `${x}px`);
    buttonRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <Link
      href="/work"
      className="pearl-btn block"
      ref={buttonRef}
      onMouseMove={handleMouseMove}
    >
      <div className="pearl-btn-spotlight" />
      <div className="wrap">
        <p>
          More work
          {workCount > 0 && (
            <sup className="text-[0.6em] -translate-y-[0.3em]"> {workCount}</sup>
          )}
        </p>
      </div>
    </Link>
  );
};

// Popout renders in a 300x200 box; request ~640px so retina stays crisp
// without downloading the full ~2500px source images.
type WorkRow = {
  name: string;
  services?: string;
  /** Shown only on the mobile card, paired with `services`. */
  year?: string;
  image: string;
  slug?: string;
  bgColor?: string;
  /** Hover-card overrides; each falls back to `image` / `bgColor`. */
  hoverImage?: string;
  hoverBg?: string;
};

const WORK_ROWS: WorkRow[] = [
  { name: "TWICE", services: "Interaction & Development", year: "2026", image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=640&auto=format&fit=crop" },
  { name: "TWICE", services: "Interaction & Development", year: "2026", image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?q=80&w=640&auto=format&fit=crop" },
  { name: "TWICE", services: "Interaction & Development", year: "2025", image: "https://images.unsplash.com/photo-1634017839464-5c339afa60f0?q=80&w=640&auto=format&fit=crop" },
  { name: "TWICE", services: "Interaction & Development", year: "2025", image: "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=640&auto=format&fit=crop" },
];

const DEFAULT_QUOTE =
  "A website is the sharpest version of\na brand or it's a missed opportunity.\nThere's not much in between.";
const DEFAULT_SUBPARAGRAPH =
  "Identity without execution is just a mood board. Execution\nwithout identity is just a website.\nI work at the point where they become the same thing.";

export default function AboutWork() {
  const content = useSiteContent();
  const aboutWork = content?.aboutWork;
  const quoteLines = (aboutWork?.quote ?? DEFAULT_QUOTE).split("\n");
  const subParagraphLines = (
    aboutWork?.subParagraph ?? DEFAULT_SUBPARAGRAPH
  ).split("\n");
  const homeWork = content?.homeWork;
  // Memoised because hovering a row re-renders this section: a fresh array
  // every render would re-run the preview card's parking effect mid-hover and
  // cut the outgoing thumbnail's slide short.
  const workRows: WorkRow[] = useMemo(() => {
    // An empty list is a real answer — every project unpinned or hidden — and
    // must render as nothing. The placeholders are only for a site running
    // without Sanity at all, which is the one case `content` is null.
    if (!content) return WORK_ROWS;
    return (homeWork ?? []).map((p) => ({
      name: p.title ?? "",
      services: p.services,
      year: p.year,
      image: p.thumbnail ?? "",
      slug: p.slug,
      bgColor: p.bgColor,
      hoverImage: p.hoverImage,
      hoverBg: p.hoverBg,
    }));
  }, [content, homeWork]);

  const sectionRef = useRef<HTMLElement>(null);
  const workRowsRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // Memoised so the preview card's parking effect only re-runs when the set of
  // thumbnails actually changes, not on every render.
  const previewItems = useMemo(
    () =>
      workRows.map((row, index) => ({
        // Suffixed with the index: a half-filled CMS entry can leave two rows
        // sharing a slug or name, and duplicate keys break the thumbnail stack.
        key: `${row.slug ?? row.name ?? "row"}-${index}`,
        // `||` not `??`: an unset CMS image resolves to "", which would render
        // an <img src=""> rather than falling through to the colour block.
        image: row.hoverImage || row.image || undefined,
        bgColor: row.hoverBg ?? row.bgColor,
      })),
    [workRows]
  );

  useEffect(() => {
    const ctx = gsap.context(() => {
      const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      /* ── Quote: word-by-word blur reveal ───────────────── */
      const quoteWords = sectionRef.current?.querySelectorAll<HTMLSpanElement>(".about-reveal-inner");

      if (reduceMotion) {
        gsap.set(quoteWords ?? [], { yPercent: 0, opacity: 1, filter: "none" });
      } else if (quoteWords && quoteWords.length) {
        gsap.fromTo(
          quoteWords,
          { yPercent: 110, opacity: 0, filter: "blur(6px)" },
          {
            yPercent: 0,
            opacity: 1,
            filter: "blur(0px)",
            duration: 0.75,
            ease: "power3.out",
            stagger: 0.04,
            scrollTrigger: {
              trigger: sectionRef.current,
              start: "top 72%",
            },
          }
        );
      }

      /* ── Right sub-text: fade-in only (no float) ───────── */
      gsap.fromTo(
        ".reveal-text",
        { opacity: 0 },
        {
          opacity: 1,
          duration: 1.1,
          stagger: 0.18,
          ease: "power2.out",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top 72%",
          },
        }
      );

      /* ── 'Recent work' label: fade-in only ─────────────── */
      gsap.fromTo(
        ".reveal-bottom",
        { opacity: 0 },
        {
          opacity: 1,
          duration: 0.9,
          stagger: 0.18,
          ease: "power2.out",
          scrollTrigger: {
            trigger: ".reveal-bottom-trigger",
            start: "top 85%",
          },
        }
      );

      /* ── Work rows: subtle horizontal slide-in ─────────── */
      gsap.fromTo(
        ".work-row",
        { x: -18, opacity: 0 },
        {
          x: 0,
          opacity: 1,
          duration: 0.85,
          stagger: 0.09,
          ease: "power3.out",
          scrollTrigger: {
            trigger: ".work-rows-container",
            start: "top 80%",
          },
        }
      );
    }, sectionRef);

    return () => ctx.revert();
  }, []);

  const handleRowEnter = (index: number) => {
    setHoveredIndex(index);
  };

  const handleRowLeave = () => {
    setHoveredIndex(null);
  };

  return (
    <section
      id="about"
      ref={sectionRef}
      className="relative w-full bg-cream"
      style={{
        paddingTop: "clamp(3.5rem, 7.7vw, 7rem)",
        paddingBottom: "clamp(3.5rem, 7.7vw, 7rem)",
        paddingLeft: "clamp(1.5rem, 11.67vw, 13rem)",
        paddingRight: "clamp(1.5rem, 11.67vw, 13rem)",
      }}
    >
      {/* Top Text Section */}
      <div className="flex flex-col lg:flex-row justify-between items-start">
        {/* Left Main Text — word-by-word reveal */}
        <div className="lg:w-[55%]">
          <p
            className="text-about-quote leading-[1.35] text-black m-0"
            style={{
              fontFamily: "var(--font-helv)",
              fontWeight: 300,
              letterSpacing: "-0.01em",
              margin: 0,
            }}
          >
            {quoteLines.map((line, i) => (
              <Fragment key={i}>
                {i > 0 && <br />}
                <Reveal>{line}</Reveal>
              </Fragment>
            ))}
          </p>
        </div>

        {/* Right Sub Text */}
        <div className="lg:w-[35%] lg:pr-[5vw] mt-8 lg:mt-0">
          <p
            className="reveal-text text-body text-black/80 m-0"
            style={{
              fontFamily: "var(--font-helv)",
              fontWeight: 300,
              fontSize: "clamp(1.052rem, 0.449vw + 0.898rem, 1.263rem)",
              lineHeight: 1.497,
              margin: 0,
            }}
          >
            {subParagraphLines.map((line, i) => (
              <Fragment key={i}>
                {i > 0 && <br />}
                {line}
              </Fragment>
            ))}
          </p>
          <div className="reveal-text mt-8 flex justify-center lg:justify-start items-center">
            <GlassButton as={Link} href="/about" aria-label="About me">
              About me
            </GlassButton>
          </div>
        </div>
      </div>

      {/* Middle Section: Recent Work */}
      <div className="reveal-bottom-trigger mt-20 lg:mt-[6vw] flex flex-col sm:flex-row items-end justify-start">
        <div className="lg:w-[55%] w-full mt-10 sm:mt-0">
          <p
            id="work"
            className="reveal-bottom pb-4 text-[13px] font-semibold uppercase tracking-[0.1em] text-[#8c8c8c] lg:pb-5"
          >
            Recent work
          </p>
        </div>
      </div>

      {/* Divider */}


      {/* Work rows — mirrors the /work index list view exactly */}
      <div ref={workRowsRef} className="work-rows-container mt-0 relative">
        <HoverPreviewCard
          items={previewItems}
          activeIndex={hoveredIndex}
          containerRef={workRowsRef}
          scale={1.0}
        />

        <div>
          {workRows.map((row, idx) => {
            // Below md this is a stacked card (image / title / meta); at md+ it
            // becomes the original two-column list row. One tree, toggled by
            // Tailwind rather than a matchMedia fork — see the mobile doctrine
            // note in globals.css.
            const rowClassName =
              "work-row group block cursor-pointer py-8 md:grid md:grid-cols-[1.8fr_1.4fr] md:items-center md:gap-4 md:border-b md:border-[#e5e5e5] md:py-14";
            const cardImage = row.hoverImage || row.image;
            const rowContent = (
              <>
                {/* Mobile-only thumbnail. The inset window mirrors the cursor
                    preview card's geometry (400x360 card, 352x220 window), so a
                    card is the same object as the desktop hover popout. */}
                <div
                  className="relative aspect-[400/360] w-full overflow-hidden rounded-[2px] md:hidden"
                  style={{ backgroundColor: row.hoverBg ?? row.bgColor ?? "#f1f1f1" }}
                >
                  <div className="absolute inset-x-[6%] inset-y-[19.44%] overflow-hidden rounded-[2px]">
                    {/* `cardImage` is `||`-folded upstream: an unset CMS image
                        resolves to "", which would render <img src=""> instead
                        of falling through to the colour block. */}
                    {cardImage && (
                      <Image
                        src={cardImage}
                        alt={row.name}
                        fill
                        sizes="100vw"
                        className="object-cover"
                      />
                    )}
                  </div>
                </div>
                <h2 className="mt-6 text-[34px] font-normal leading-none tracking-[-0.02em] text-[#1d1d1f] transition-transform duration-300 ease-out group-hover:translate-x-3 sm:text-[40px] md:mt-0 md:text-[46px]">
                  <span>{row.name}</span>
                  <sup className="ml-1 hidden text-[0.4em] leading-none md:inline">
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="inline-block opacity-60 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
                    >
                      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                      <polyline points="15 3 21 3 21 9" />
                      <line x1="10" y1="14" x2="21" y2="3" />
                    </svg>
                  </sup>
                </h2>
                <span className="hidden justify-self-end text-[17px] font-normal text-[#1d1d1f] md:inline">
                  {row.services || "Design & development"}
                </span>
                {/* Mobile-only specifications line: services left, year right. */}
                <div className="mt-4 flex items-center justify-between gap-4 border-t border-[#898989] pt-4 text-[14px] font-normal text-[#1d1d1f] md:hidden">
                  <span>{row.services || "Design & development"}</span>
                  <span>{row.year || "2026"}</span>
                </div>
              </>
            );

            return row.slug ? (
              <Link
                key={idx}
                href={`/work/${row.slug}`}
                className={rowClassName}
                onMouseEnter={() => handleRowEnter(idx)}
                onMouseLeave={handleRowLeave}
              >
                {rowContent}
              </Link>
            ) : (
              <div
                key={idx}
                className={rowClassName}
                onMouseEnter={() => handleRowEnter(idx)}
                onMouseLeave={handleRowLeave}
              >
                {rowContent}
              </div>
            );
          })}
        </div>
      </div>

      {/* More work button */}
      <div className="mt-12 lg:mt-[5vw] flex justify-center">
        <MoreWorkButton />
      </div>
    </section>
  );
}
