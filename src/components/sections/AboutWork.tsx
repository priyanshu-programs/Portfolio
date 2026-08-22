"use client";

import React, { Fragment, useEffect, useMemo, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Link from "@/components/transition/SmartLink";
import { useSiteContent } from "@/components/ContentProvider";
import HoverPreviewCard from "@/components/ui/HoverPreviewCard";

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

/* ─── Glassmorphic About Me Button ───────────────────────── */
const AboutMeButton = () => {
  const buttonRef = useRef<HTMLAnchorElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLAnchorElement, MouseEvent>) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    buttonRef.current.style.setProperty('--mouse-x', `${x}px`);
    buttonRef.current.style.setProperty('--mouse-y', `${y}px`);
  };

  return (
    <>
      <style>{`
        .about-btn-box {
          --w: 224px;
          --h: 76px;
          --r: 9999px;
          position: relative;
          width: var(--w);
          height: var(--h);
          display: flex;
          justify-content: center;
          align-items: center;
          border-radius: var(--r);
          border: 1px solid rgba(51,51,51,0.06);
          box-shadow:
            inset 2px -2px 1px -1px rgba(255,255,255,1),
            inset -2px 2px 1px -1px rgba(255,255,255,1),
            inset 6px -6px 1px -6px rgba(255,255,255,0.75),
            inset -6px 6px 1px -6px rgba(255,255,255,0.75),
            inset 0 1px 1px rgba(255,255,255,0.9),
            inset 0 -3px 4px -2px rgba(255,255,255,0.6),
            inset 0 0 2px rgba(0,0,0,0.8),
            0 8px 12px -4px rgba(50,40,35,0.35),
            0 3px 5px -2px rgba(50,40,35,0.22),
            0 1px 1px rgba(255,255,255,0.6);
          background: rgba(0,0,0,0.02);
          backdrop-filter: blur(2px);
          cursor: pointer;
          padding: 0 0.7rem 0 1.4rem;
          gap: 1.25rem;
          transition: transform 0.25s cubic-bezier(0.25,0.46,0.45,0.94), background 0.25s;
          text-decoration: none;
          overflow: hidden;
        }

        .about-btn-box::before {
          content: "";
          position: absolute;
          inset: 0;
          background:
            radial-gradient(
              120% 90% at 18% 8%,
              rgba(255,255,255,0.95) 0%,
              rgba(255,255,255,0.4) 26%,
              transparent 52%
            ),
            linear-gradient(
              135deg,
              rgba(255,255,255,0.5) 0%,
              rgba(255,255,255,0.1) 30%,
              transparent 55%
            );
          pointer-events: none;
          z-index: 1;
        }

        .about-btn-box::after {
          content: "";
          position: absolute;
          left: 4%;
          width: 38%;
          top: 10%;
          height: 26%;
          border-radius: 9999px;
          background: radial-gradient(
            ellipse at center,
            rgba(255,255,255,1) 0%,
            rgba(255,255,255,0.6) 55%,
            rgba(255,255,255,0) 100%
          );
          filter: blur(2px);
          pointer-events: none;
          z-index: 1;
        }

        /* Live specular reflection — follows the cursor like real glass */
        .about-btn-live-spec {
          position: absolute;
          inset: 0;
          border-radius: var(--r);
          pointer-events: none;
          z-index: 2;
          opacity: 0;
          transition: opacity 0.35s ease;
          background: radial-gradient(
            circle 90px at var(--mouse-x, 50%) var(--mouse-y, 50%),
            rgba(255,255,255,1) 0%,
            rgba(255,255,255,0.5) 40%,
            transparent 75%
          );
          mix-blend-mode: overlay;
        }
        .about-btn-box:hover .about-btn-live-spec {
          opacity: 1;
        }

        .about-btn-box:hover {
          background: rgba(0,0,0,0.01);
          transform: translateY(-3px) scale(1.03);
        }
        .about-btn-box:hover .about-btn-icon {
          transform: scale(1.1);
        }
        .about-btn-box:active {
          transform: scale(0.94);
        }
        .about-btn-box:active .about-btn-text {
          color: #000;
        }
        .about-btn-box:active .about-btn-icon {
          transform: scale(0.94);
        }
        .about-btn-circle-overlay {
          position: absolute;
          width: calc(var(--w) - 9px);
          height: calc(var(--h) - 9px);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 9999px;
          filter: blur(1px);
          pointer-events: none;
        }
        .about-btn-text {
          font-size: 19px;
          font-family: system-ui, sans-serif;
          color: #3e3e3e;
          letter-spacing: -0.01em;
          filter: drop-shadow(0 25px 3px rgba(102,102,102,0.15));
          position: relative;
          z-index: 10;
          white-space: nowrap;
        }
        .about-btn-icon {
          width: 42px;
          height: 42px;
          display: flex;
          justify-content: center;
          align-items: center;
          background: #232323;
          border-radius: 50%;
          box-shadow:
            0 6px 10px -2px rgba(0,0,0,0.4),
            0 2px 4px rgba(0,0,0,0.3),
            inset 0 1px 1px rgba(255,255,255,0.15);
          transition: transform 0.25s cubic-bezier(0.25,0.46,0.45,0.94);
          position: relative;
          z-index: 10;
          flex-shrink: 0;
        }
        .about-btn-svg {
          width: 16px;
          fill: #f5f5f5;
          filter: drop-shadow(0 25px 3px rgba(102,102,102,0.2));
        }
      `}</style>

      <Link
        href="/about"
        className="about-btn-box"
        aria-label="About me"
        ref={buttonRef}
        onMouseMove={handleMouseMove}
      >
        <div className="about-btn-live-spec" />
        <span className="about-btn-text">About me</span>
        <div className="about-btn-icon">
          <svg
            className="about-btn-svg"
            viewBox="0 0 1024 1024"
            version="1.1"
            xmlns="http://www.w3.org/2000/svg"
            aria-hidden
          >
            <path d="M779.180132 473.232045 322.354755 16.406668c-21.413706-21.413706-56.121182-21.413706-77.534887 0-21.413706 21.413706-21.413706 56.122205 0 77.534887l418.057421 418.057421L244.819868 930.057421c-21.413706 21.413706-21.413706 56.122205 0 77.534887 10.706853 10.706853 24.759917 16.059767 38.767955 16.059767s28.061103-5.353938 38.767955-16.059767L779.180132 550.767955C800.593837 529.35425 800.593837 494.64575 779.180132 473.232045z" />
          </svg>
        </div>
        <div className="about-btn-circle-overlay" />
      </Link>
    </>
  );
};

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
  image: string;
  slug?: string;
  bgColor?: string;
  /** Hover-card overrides; each falls back to `image` / `bgColor`. */
  hoverImage?: string;
  hoverBg?: string;
};

const WORK_ROWS: WorkRow[] = [
  { name: "TWICE", services: "Interaction & Development", image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=640&auto=format&fit=crop" },
  { name: "TWICE", services: "Interaction & Development", image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?q=80&w=640&auto=format&fit=crop" },
  { name: "TWICE", services: "Interaction & Development", image: "https://images.unsplash.com/photo-1634017839464-5c339afa60f0?q=80&w=640&auto=format&fit=crop" },
  { name: "TWICE", services: "Interaction & Development", image: "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=640&auto=format&fit=crop" },
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
          <div className="reveal-text mt-8 flex justify-start items-center">
            <AboutMeButton />
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
            const rowClassName =
              "work-row group grid cursor-pointer grid-cols-[1fr_auto] items-center gap-4 border-b border-[#e5e5e5] py-14 md:grid-cols-[1.8fr_1.4fr]";
            const rowContent = (
              <>
                <h2 className="text-[34px] font-normal leading-none tracking-[-0.02em] text-[#1d1d1f] transition-transform duration-300 ease-out group-hover:translate-x-3 sm:text-[40px] md:text-[46px]">
                  <span>{row.name}</span>
                  <sup className="ml-1 text-[0.4em] leading-none">
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
