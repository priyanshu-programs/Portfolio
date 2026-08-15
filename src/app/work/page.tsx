"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import PageWrapper from "@/components/transition/PageWrapper";
import TopNav from "@/components/ui/TopNav";
import WorkIndex from "@/components/work/WorkIndex";
import { useSiteContent } from "@/components/ContentProvider";
import { resolveNavAppearance } from "@/lib/nav";

const DEFAULT_NAME = "Priyanshu Roy";

export default function WorkPage() {
  const content = useSiteContent();
  const name = content?.settings?.name ?? DEFAULT_NAME;
  // Sanity is the only source of projects. There is deliberately no hardcoded
  // fallback set: invented rows link to /work/<slug> for documents that don't
  // exist, which is a guaranteed 404. WorkIndex renders its own empty state.
  const projects = content?.workProjects ?? [];
  const tags = content?.tags ?? [];
  // This page's background is a fixed near-white, so unlike the hero there's no
  // imagery for the blend to cope with — default to a flat colour and let the
  // CMS say otherwise.
  const { blend: navBlend, color: navColor } = resolveNavAppearance(
    content?.settings,
    false
  );

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".fade-in-up",
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: "power3.out", stagger: 0.1 }
      );
      // The headline reveals line by line from behind its own clip mask.
      gsap.fromTo(
        ".headline-line",
        { yPercent: 110 },
        {
          yPercent: 0,
          duration: 1.1,
          ease: "power4.out",
          stagger: 0.08,
          delay: 0.1,
        }
      );
    }, containerRef);
    return () => ctx.revert();
  }, []);

  return (
    <PageWrapper>
      <main
        ref={containerRef}
        className="relative flex min-h-screen flex-col bg-[#FFFCFA] text-[#1d1d1f]"
        style={{
          paddingBottom: "clamp(1.75rem, 4vw, 3.5rem)",
        }}
      >
        {/* Nav. The page is a fixed near-white, so difference blend has always
            resolved to near-black here — an explicit colour is the same result
            stated outright, and lets the CMS override it. */}
        <TopNav
          name={name}
          variant="simple"
          className="fade-in-up"
          blend={navBlend}
          color={navColor}
        />

        <div
          className="mx-auto flex w-full max-w-none flex-1 flex-col"
          style={{
            paddingLeft: "clamp(1.5rem, 10vw, 12.5rem)",
            paddingRight: "clamp(1.5rem, 10vw, 12.5rem)",
          }}
        >
          {/* Headline */}
          <section className="w-full pt-[clamp(3.5rem,8vw,6rem)]">
            <h1
              className="tracking-[-0.04em] font-medium text-[#1d1d1f]"
              style={{ fontSize: "clamp(3.9rem, 6.6vw, 7.2rem)", lineHeight: 1.03 }}
            >
              {["Good work takes time.", "These took mine."].map((line) => (
                <span key={line} className="block overflow-hidden pb-1">
                  <span className="headline-line block will-change-transform">
                    {line}
                  </span>
                </span>
              ))}
            </h1>
          </section>

          {/* Filters + project index */}
          <section
            className="pt-[clamp(2rem,4vw,3.5rem)]"
            style={{ paddingBottom: "clamp(5rem, 10vw, 8rem)" }}
          >
            <WorkIndex projects={projects} tags={tags} />
          </section>
        </div>
      </main>
    </PageWrapper>
  );
}
