"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import TransitionLink from "@/components/transition/TransitionLink";
import PageWrapper from "@/components/transition/PageWrapper";

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

export default function WorkPage() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const ctx = gsap.context(() => {
      // Staggered fade in up for sections
      gsap.fromTo(
        ".fade-in-up",
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: "power3.out", stagger: 0.1 }
      );
    }, containerRef);
    return () => ctx.revert();
  }, []);

  const projects = [
    { id: "01", title: "TWICE", category: "Interaction & Development", year: "2026" },
    { id: "02", title: "AETHER", category: "Brand Identity & Web", year: "2025" },
    { id: "03", title: "NURA HEALTH", category: "Fullstack Architecture", year: "2025" },
  ];

  return (
    <PageWrapper>
      <main
        ref={containerRef}
        className="min-h-screen bg-cream text-ink relative overflow-hidden flex flex-col justify-between"
        style={{
          padding: "clamp(2rem, 5vw, 5rem)",
        }}
      >
        <NoiseOverlay />

        {/* Header */}
        <header
          className="fade-in-up w-full flex justify-between items-center z-10"
          style={{
            fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', system-ui, sans-serif",
            fontWeight: 300,
            letterSpacing: "-0.01em"
          }}
        >
          <TransitionLink
            href="/"
            className="relative group inline-block text-[20px] tracking-widest py-1"
            style={{
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', system-ui, sans-serif",
              fontWeight: 300,
              letterSpacing: "-0.01em"
            }}
          >
            © PRIYANSHU ROY
            <span className="absolute left-0 bottom-0 w-full h-[1px] bg-current origin-left scale-x-0 transition-transform duration-300 ease-out group-hover:scale-x-100" />
          </TransitionLink>
          <TransitionLink
            href="/"
            className="group relative px-6 py-2 rounded-full border border-ink/20 text-caption overflow-hidden flex items-center justify-center transition-all duration-300 hover:border-ink/50"
            style={{
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', system-ui, sans-serif",
              fontWeight: 300,
              letterSpacing: "-0.01em"
            }}
          >
            <span
              className="relative z-10 transition-transform duration-300 group-hover:-translate-x-1"
              style={{
                fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', system-ui, sans-serif",
                fontWeight: 300,
                letterSpacing: "-0.01em"
              }}
            >
              ← BACK TO HOME
            </span>
          </TransitionLink>
        </header>

        {/* Content */}
        <section className="my-auto py-16 z-10 max-w-[1200px] w-full mx-auto">
          <h1
            className="fade-in-up font-oswald text-[12vw] sm:text-[8vw] leading-[0.9] tracking-tight uppercase mb-16 text-ink/90"
          >
            Selected <br />
            <span className="font-script text-wine italic lowercase font-normal leading-none pr-4">work</span>
            archive
          </h1>

          <div className="fade-in-up space-y-0 border-t border-divider">
            {projects.map((proj) => (
              <div
                key={proj.id}
                className="group grid grid-cols-[auto_1fr_auto] sm:grid-cols-[60px_1fr_auto_auto] items-center py-8 border-b border-divider hover:border-ink/30 gap-4 group cursor-pointer transition-all"
              >
                <span className="font-mono text-caption text-ink/40 group-hover:text-wine transition-colors">
                  {proj.id}
                </span>
                <h2
                  className="text-[28px] sm:text-[38px] tracking-tight group-hover:pl-4 transition-all duration-300"
                  style={{
                    fontFamily: "var(--font-inter), sans-serif",
                    fontWeight: 300,
                  }}
                >
                  {proj.title}
                </h2>
                <span className="hidden sm:inline text-caption text-ink/60 font-light group-hover:text-ink/90 transition-colors">
                  {proj.category}
                </span>
                <span className="font-mono text-caption text-ink/40 group-hover:text-ink/80 transition-colors justify-self-end">
                  {proj.year}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* Footer */}
        <footer className="fade-in-up w-full flex flex-col sm:flex-row justify-between items-start sm:items-center text-caption text-ink/40 border-t border-divider pt-8 mt-16 z-10">
          <p>SYSTEM OPERATIONAL • 2026</p>
          <a
            href="mailto:priyanshuroy.official19@gmail.com"
            className="hover:text-ink transition-colors mt-2 sm:mt-0"
          >
            priyanshuroy.official19@gmail.com
          </a>
        </footer>
      </main>
    </PageWrapper>
  );
}

