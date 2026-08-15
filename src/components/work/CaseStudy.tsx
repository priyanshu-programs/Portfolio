"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import gsap from "gsap";
import PageWrapper from "@/components/transition/PageWrapper";
import TopNav from "@/components/ui/TopNav";
import CaseStudyGallery from "@/components/work/CaseStudyGallery";
import NextProject from "@/components/work/NextProject";
import { useSiteContent } from "@/components/ContentProvider";
import { caseStudyTheme } from "@/lib/color";
import { FLATTEN_CLASS } from "@/lib/caseStudyAdvance";
import ViewLiveCursor from "@/components/ui/ViewLiveCursor";
import type { CaseStudyContent } from "@/lib/sanity/types";

const DEFAULT_NAME = "Priyanshu Roy";

/** Matches /work's text column so the two pages line up. */
const GUTTER = "clamp(1.5rem, 10vw, 12.5rem)";

const ArrowUpRight = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <line x1="6" y1="18" x2="18" y2="6" />
    <polyline points="9 6 18 6 18 15" />
  </svg>
);

export default function CaseStudy({ project }: { project: CaseStudyContent }) {
  const content = useSiteContent();
  const name = content?.settings?.name ?? DEFAULT_NAME;
  const theme = caseStudyTheme(
    project.pageBg,
    project.accent,
    project.textColor,
    project.navColor
  );

  const containerRef = useRef<HTMLElement>(null);
  const coverRef = useRef<HTMLDivElement>(null);

  // Same intro idiom as /work: stagger .fade-in-up, clip-reveal .headline-line.
  useEffect(() => {
    // Arriving by the foot-of-page scroll gesture instead of a click. Under
    // FLATTEN_CLASS the swap is a short crossfade from a stage that already
    // mirrors this page's top, and scroll position already carries the reader
    // here, so an intro on top of that would pop into an already-settled
    // scroll — skip it and let the project arrive composed. It would also fight
    // the crossfade directly, animating opacity on content being faded through.
    // Nothing else is needed to undo the animation —
    // .fade-in-up and .headline-line have no resting opacity or transform in
    // the stylesheet, so untouched markup is already at what would have been
    // the tween's end state.
    //
    // Tested against the flatten flag rather than the `cs-cover` scroll lock:
    // both are set by the same call, but the lock is released on the route
    // change that mounts this component, which puts the probe a hair from an
    // ordering dependency. The flatten flag outlives the whole swap.
    const root = document.documentElement;
    if (root.classList.contains(FLATTEN_CLASS)) {
      return;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".fade-in-up",
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: "power3.out", stagger: 0.1 }
      );
      gsap.fromTo(
        ".headline-line",
        { yPercent: 110 },
        { yPercent: 0, duration: 1.1, ease: "power4.out", delay: 0.1 }
      );
    }, containerRef);
    return () => ctx.revert();
  }, []);

  // <main> is min-h-screen so it normally covers the page, but a rubber-band
  // overscroll can expose the root behind it. Owning the root colour here also
  // means NextProject's blend can hand off to the next page cleanly: whatever
  // it left behind is replaced when the incoming case study mounts.
  useEffect(() => {
    const root = document.documentElement;
    root.style.backgroundColor = theme.bg;
    return () => {
      root.style.removeProperty("background-color");
    };
  }, [theme.bg]);

  const hasOverview =
    Boolean(project.summary) ||
    Boolean(project.challenge?.length) ||
    Boolean(project.approach?.length);

  return (
    <PageWrapper>
      <main
        ref={containerRef}
        className="relative flex min-h-screen flex-col"
        style={
          {
            // Every child reads its colours from these, so one component set
            // works on any editor-chosen background.
            "--cs-bg": theme.bg,
            "--cs-ink": theme.ink,
            "--cs-accent": theme.accent,
            "--cs-line": theme.line,
            "--cs-muted": theme.muted,
            "--cs-nav-ink": theme.navInk,
            "--cs-gutter": GUTTER,
            backgroundColor: "var(--cs-bg)",
            color: "var(--cs-ink)",
            // Only when the page ends on content. NextProject's own sneak-peek
            // card already supplies bottom spacing when a next project exists.
            paddingBottom: project.next
              ? undefined
              : "clamp(1.75rem, 4vw, 3.5rem)",
            // Softens the one ink flip that happens mid-blend when the next
            // project's background crosses the light/dark line. The background
            // itself is deliberately untransitioned — it's driven per frame by
            // NextProject, and easing it would lag the gesture.
            transition: "color 400ms ease",
          } as React.CSSProperties
        }
      >
        {/* Reads the custom property rather than theme.navInk directly so the
            per-frame next-project blend carries the nav with it. */}
        <TopNav
          name={name}
          variant="simple"
          className="fade-in-up"
          blend={false}
          color="var(--cs-nav-ink)"
        />

        <div
          className="mx-auto flex w-full flex-1 flex-col"
          style={{ paddingInline: "var(--cs-gutter)" }}
        >
          {/* Title + service label */}
          <header className="pt-[clamp(3.5rem,8vw,6.5rem)] text-center">
            <h1
              className="font-medium tracking-[-0.04em]"
              style={{ fontSize: "clamp(3.25rem, 11vw, 6.75rem)", lineHeight: 0.95 }}
            >
              <span className="block overflow-hidden pb-2">
                <span className="headline-line block will-change-transform">
                  {project.title}
                </span>
              </span>
            </h1>

            {project.services && (
              <div className="fade-in-up mt-[clamp(1.5rem,8vw,6.625rem)]">
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
                  {project.services}
                </span>
              </div>
            )}
          </header>

          {/* Cover */}
          {project.cover && (() => {
            const CoverContent = (
              <div
                ref={coverRef}
                className="relative aspect-[16/10] w-full overflow-hidden cursor-none"
                style={{ backgroundColor: "var(--cs-line)" }}
              >
                <Image
                  src={project.cover}
                  alt={project.title ? `${project.title} cover` : ""}
                  fill
                  priority
                  sizes="(max-width: 768px) 100vw, 80vw"
                  className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.02]"
                />
                <ViewLiveCursor containerRef={coverRef} />
              </div>
            );

            return project.liveUrl ? (
              <a
                href={project.liveUrl}
                target="_blank"
                rel="noreferrer"
                className="fade-in-up relative mt-[clamp(1.25rem,1.5vw,1.375rem)] group block"
              >
                {CoverContent}
              </a>
            ) : (
              <div className="fade-in-up relative mt-[clamp(1.25rem,1.5vw,1.375rem)] group">
                {CoverContent}
              </div>
            );
          })()}

          {/* Rule strip */}
          <div
            className="fade-in-up mt-6 flex justify-between lg:grid lg:grid-cols-2 lg:gap-[clamp(2.5rem,5vw,5rem)] items-center border-t pt-[0.9rem] text-[0.9rem] uppercase tracking-normal"
            style={{ borderColor: "var(--cs-ink)", color: "var(--cs-ink)" }}
          >
            <span className="text-left font-medium" style={{ fontFamily: "'Helvetica Neue 65 Medium', sans-serif" }}>{project.title}</span>
            <span className="text-right lg:text-left font-medium" style={{ fontFamily: "'Helvetica Neue 65 Medium', sans-serif" }}>/ Overview</span>
          </div>

          {/* Overview */}
          {hasOverview && (
            <section className="grid gap-[clamp(2.5rem,5vw,5rem)] pt-[clamp(3.5rem,7vw,7rem)] lg:grid-cols-2">
              <div className="fade-in-up">
                {project.summary && (
                  <h2
                    className="max-w-[22ch] font-medium tracking-[-0.03em]"
                    style={{
                      fontSize: "clamp(1.75rem, 2.8vw, 2.6rem)",
                      lineHeight: 1.15,
                    }}
                  >
                    {project.summary}
                  </h2>
                )}

                {project.liveUrl && (
                  <a
                    href={project.liveUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-8 inline-flex items-center gap-2 rounded-full border px-5 py-2.5 text-[0.875rem] transition-colors duration-300"
                    style={{
                      borderColor: "var(--cs-line)",
                      color: "var(--cs-ink)",
                    }}
                  >
                    View live
                    <ArrowUpRight />
                  </a>
                )}
              </div>

              <div className="fade-in-up space-y-[clamp(2rem,3vw,3rem)]">
                {(
                  [
                    ["Challenge", project.challenge],
                    ["Approach", project.approach],
                  ] as const
                ).map(([label, paragraphs]) =>
                  paragraphs?.length ? (
                    <div key={label}>
                      <h3 className="text-[clamp(1.125rem,1.5vw,1.375rem)] font-medium tracking-[-0.01em]">
                        {label}
                      </h3>
                      <div className="mt-5 space-y-5">
                        {paragraphs.map((paragraph, i) => (
                          <p
                            key={i}
                            className="max-w-[62ch] text-[clamp(0.9375rem,1.1vw,1.0625rem)] leading-[1.7]"
                            style={{ color: "var(--cs-muted)" }}
                          >
                            {paragraph}
                          </p>
                        ))}
                      </div>
                    </div>
                  ) : null
                )}
              </div>
            </section>
          )}

          <CaseStudyGallery
            items={project.gallery ?? []}
            heading={project.galleryHeading}
            subheading={project.gallerySubheading}
            bg={project.galleryBg}
          />
        </div>

        {/* Outside the gutter column: the reveal panel is pinned and has to
            span the full viewport, so it can't sit inside a padded wrapper. It
            reads --cs-gutter itself for the chrome that should stay aligned. */}
        {project.next && (
          <NextProject
            project={project.next}
            theme={theme}
            currentTitle={project.title}
          />
        )}
      </main>
    </PageWrapper>
  );
}
