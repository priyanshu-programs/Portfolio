"use client";

import React, { useEffect, useRef, useState } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import TransitionLink from "@/components/transition/TransitionLink";

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
        .about-btn-fx {
          filter: contrast(3);
        }
        .about-btn-box {
          --w: 200px;
          --h: 64px;
          --r: 9999px;
          --tr: 18%;
          position: relative;
          width: var(--w);
          height: var(--h);
          display: flex;
          justify-content: center;
          align-items: center;
          border-radius: var(--r);
          border: 1px double rgba(51,51,51,0.08);
          box-shadow:
            inset 2px -2px 1px -1px rgba(255,255,255,0.9),
            inset -2px 2px 1px -1px rgba(255,255,255,0.9),
            inset 6px -6px 1px -6px rgba(255,255,255,0.55),
            inset -6px 6px 1px -6px rgba(255,255,255,0.55),
            inset 0 0 2px rgba(0,0,0,0.8),
            0 4px 8px rgba(0,0,0,0.2);
          background: rgba(0,0,0,0.02);
          backdrop-filter: blur(2px);
          cursor: pointer;
          filter: brightness(0.9);
          padding: 0 0.8rem;
          gap: 0.875rem;
          transition: transform 0.25s cubic-bezier(0.25,0.46,0.45,0.94), background 0.25s;
          text-decoration: none;
        }


        /* The Fluid Spotlight Layer */
        .about-btn-spotlight {
          position: absolute;
          inset: 0;
          border-radius: var(--r);
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          z-index: 0;
          overflow: hidden;
          -webkit-mask-image: radial-gradient(
            circle 140px at var(--mouse-x, 50%) var(--mouse-y, 50%),
            black 0%,
            transparent 100%
          );
          mask-image: radial-gradient(
            circle 140px at var(--mouse-x, 50%) var(--mouse-y, 50%),
            black 0%,
            transparent 100%
          );
        }

        .about-btn-spotlight::before {
          content: "";
          position: absolute;
          inset: -100%;
          background: conic-gradient(
            from 0deg at 50% 50%,
            rgba(96, 165, 250, 0.4) 0deg,
            rgba(129, 140, 248, 0.3) 72deg,
            rgba(59, 130, 246, 0.2) 144deg,
            rgba(129, 140, 248, 0.4) 216deg,
            rgba(96, 165, 250, 0.2) 288deg,
            rgba(96, 165, 250, 0.4) 360deg
          );
          animation: spinWave 5s linear infinite;
          filter: blur(20px);
        }

        @keyframes spinWave {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        .about-btn-box:hover .about-btn-spotlight {
          opacity: 1;
        }

        .about-btn-box::before {
          content: "";
          position: absolute;
          z-index: 1;
          top: 35%;
          left: 50%;
          transform: translateX(-50%);
          width: calc(var(--w) - 16px);
          height: calc(var(--h) - 16px);
          border-radius: var(--r);
          border: 1px solid rgba(0,0,0,0.9);
          filter: blur(8px);
          pointer-events: none;
        }
        .about-btn-box::after {
          z-index: 501;
          content: "";
          position: absolute;
          width: var(--w);
          height: var(--h);
          border-radius: var(--r);
          filter: blur(7px);
          background: linear-gradient(
            45deg,
            rgba(255,255,255,0.8) 0%,
            transparent var(--tr),
            transparent calc(100% - var(--tr)),
            rgba(255,255,255,0.8) 100%
          );
          pointer-events: none;
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
          font-size: 18px;
          font-family: system-ui, sans-serif;
          color: #3e3e3e;
          letter-spacing: -0.01em;
          filter: drop-shadow(0 25px 3px rgba(102,102,102,0.15));
          position: relative;
          z-index: 10;
          white-space: nowrap;
        }
        .about-btn-icon {
          width: 34px;
          height: 34px;
          display: flex;
          justify-content: center;
          align-items: center;
          background: #3e3e3e;
          border-radius: 50%;
          box-shadow: 0 0 6px rgba(0,0,0,0.3);
          transition: transform 0.25s cubic-bezier(0.25,0.46,0.45,0.94);
          position: relative;
          z-index: 10;
          flex-shrink: 0;
        }
        .about-btn-svg {
          width: 14px;
          fill: #f5f5f5;
          filter: drop-shadow(0 25px 3px rgba(102,102,102,0.2));
        }
      `}</style>

      <div className="about-btn-fx">
        <a
          href="#about-details"
          className="about-btn-box"
          aria-label="About me"
          ref={buttonRef}
          onMouseMove={handleMouseMove}
        >
          <div className="about-btn-spotlight" />
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
        </a>
      </div>
    </>
  );
};

const MoreWorkButton = () => {
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
        .pearl-btn {
          --white: #ffe7ff;
          --bg: #080808;
          --radius: 100px;
          outline: none;
          cursor: pointer;
          border: 0;
          position: relative;
          border-radius: var(--radius);
          background-color: var(--bg);
          transition: all 0.2s ease;
          box-shadow:
            inset 0 0.3rem 0.9rem rgba(255, 255, 255, 0.28),
            inset 0 -0.1rem 0.3rem rgba(0, 0, 0, 0.7),
            inset 0 -0.4rem 0.9rem rgba(255, 255, 255, 0.48),
            0 4px 8px rgba(0, 0, 0, 0.2);
          padding: 0;
          display: inline-block;
          overflow: hidden;
        }
        .pearl-btn-spotlight {
          position: absolute;
          inset: 0;
          border-radius: var(--radius);
          pointer-events: none;
          opacity: 0;
          transition: opacity 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          z-index: 0;
          overflow: hidden;
          -webkit-mask-image: radial-gradient(
            circle 140px at var(--mouse-x, 50%) var(--mouse-y, 50%),
            black 0%,
            transparent 100%
          );
          mask-image: radial-gradient(
            circle 140px at var(--mouse-x, 50%) var(--mouse-y, 50%),
            black 0%,
            transparent 100%
          );
        }
        .pearl-btn-spotlight::before {
          content: "";
          position: absolute;
          inset: -100%;
          background: conic-gradient(
            from 0deg at 50% 50%,
            rgba(96, 165, 250, 0.4) 0deg,
            rgba(129, 140, 248, 0.3) 72deg,
            rgba(59, 130, 246, 0.2) 144deg,
            rgba(129, 140, 248, 0.4) 216deg,
            rgba(96, 165, 250, 0.2) 288deg,
            rgba(96, 165, 250, 0.4) 360deg
          );
          animation: spinWavePearl 5s linear infinite;
          filter: blur(20px);
        }
        @keyframes spinWavePearl {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .pearl-btn:hover .pearl-btn-spotlight {
          opacity: 1;
        }
        .pearl-btn .wrap {
          font-size: 1.125rem;
          font-family: system-ui, sans-serif;
          font-weight: 300;
          color: rgba(255, 255, 255, 0.9);
          padding: 16px 36px;
          border-radius: inherit;
          position: relative;
          overflow: hidden;
          display: block;
          z-index: 1;
        }
        .pearl-btn .wrap p {
          margin: 0;
          transition: all 0.2s ease;
          transform: translateY(2%);
          -webkit-mask-image: linear-gradient(to bottom, white 70%, transparent);
          mask-image: linear-gradient(to bottom, white 70%, transparent);
        }
        .pearl-btn .wrap::before,
        .pearl-btn .wrap::after {
          content: "";
          position: absolute;
          transition: all 0.3s ease;
        }
        .pearl-btn .wrap::before {
          left: -15%;
          right: -15%;
          bottom: 25%;
          top: -100%;
          border-radius: 50%;
          background-color: rgba(255, 255, 255, 0.10);
        }
        .pearl-btn .wrap::after {
          left: 6%;
          right: 6%;
          top: 12%;
          bottom: 40%;
          border-radius: 22px 22px 0 0;
          box-shadow: inset 0 10px 8px -10px rgba(255, 255, 255, 0.78);
          background: linear-gradient(
            180deg,
            rgba(255, 255, 255, 0.28) 0%,
            rgba(0, 0, 0, 0) 50%,
            rgba(0, 0, 0, 0) 100%
          );
        }
        .pearl-btn:hover {
          box-shadow:
            inset 0 0.3rem 0.5rem rgba(255, 255, 255, 0.38),
            inset 0 -0.1rem 0.3rem rgba(0, 0, 0, 0.7),
            inset 0 -0.4rem 0.9rem rgba(255, 255, 255, 0.68),
            0 4px 8px rgba(0, 0, 0, 0.2);
        }
        .pearl-btn:hover .wrap::before {
          transform: translateY(-5%);
        }
        .pearl-btn:hover .wrap::after {
          opacity: 0.4;
          transform: translateY(5%);
        }
        .pearl-btn:hover .wrap p {
          transform: translateY(-4%);
        }
        .pearl-btn:active {
          transform: translateY(4px);
          box-shadow:
            inset 0 0.3rem 0.5rem rgba(255, 255, 255, 0.48),
            inset 0 -0.1rem 0.3rem rgba(0, 0, 0, 0.8),
            inset 0 -0.4rem 0.9rem rgba(255, 255, 255, 0.38),
            0 4px 8px rgba(0, 0, 0, 0.2);
        }
      `}</style>
      <TransitionLink
        href="/work"
        className="pearl-btn block"
        ref={buttonRef}
        onMouseMove={handleMouseMove}
      >
        <div className="pearl-btn-spotlight" />
        <div className="wrap">
          <p>
            More work <sup className="text-[0.6em] -translate-y-[0.3em]">11</sup>
          </p>
        </div>
      </TransitionLink>
    </>
  );
};

const WORK_ROWS = [
  { name: "TWICE", tag: "Interaction & Development", image: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop" },
  { name: "TWICE", tag: "Interaction & Development", image: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?q=80&w=2532&auto=format&fit=crop" },
  { name: "TWICE", tag: "Interaction & Development", image: "https://images.unsplash.com/photo-1634017839464-5c339afa60f0?q=80&w=2535&auto=format&fit=crop" },
  { name: "TWICE", tag: "Interaction & Development", image: "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=2670&auto=format&fit=crop" },
];

export default function AboutWork() {
  const sectionRef = useRef<HTMLElement>(null);
  const workContainerRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [smoothPosition, setSmoothPosition] = useState({ x: 0, y: 0 });
  const [isVisible, setIsVisible] = useState(false);
  const animationRef = useRef<number | null>(null);

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

  /* ── Hover image popout: smooth lerp animation ────────── */
  useEffect(() => {
    const lerp = (start: number, end: number, factor: number) => {
      return start + (end - start) * factor;
    };

    const animate = () => {
      setSmoothPosition((prev) => ({
        x: lerp(prev.x, mousePosition.x, 0.12),
        y: lerp(prev.y, mousePosition.y, 0.12),
      }));
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [mousePosition]);

  const handleWorkMouseMove = (e: React.MouseEvent) => {
    if (workContainerRef.current) {
      const rect = workContainerRef.current.getBoundingClientRect();
      setMousePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }
  };

  const handleRowEnter = (index: number) => {
    setHoveredIndex(index);
    setIsVisible(true);
  };

  const handleRowLeave = () => {
    setHoveredIndex(null);
    setIsVisible(false);
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
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', system-ui, sans-serif",
              fontWeight: 300,
              letterSpacing: "-0.01em",
              margin: 0,
            }}
          >
            <Reveal>A website is the sharpest version of</Reveal>
            <br />
            <Reveal>a brand or it&apos;s a missed opportunity.</Reveal>
            <br />
            <Reveal>There&apos;s not much in between.</Reveal>
          </p>
        </div>

        {/* Right Sub Text */}
        <div className="lg:w-[35%] lg:pr-[5vw] mt-8 lg:mt-0">
          <p
            className="reveal-text text-body text-black/80 m-0"
            style={{
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', system-ui, sans-serif",
              fontWeight: 300,
              fontSize: "clamp(1.052rem, 0.449vw + 0.898rem, 1.263rem)",
              lineHeight: 1.497,
              margin: 0,
            }}
          >
            Identity without execution is just a mood board. Execution<br />without identity is just a website.<br />I work at the point where they become the same thing.
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
            className="reveal-bottom uppercase text-black/70 pb-4 lg:pb-5"
            style={{
              fontFamily: "-apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', system-ui, sans-serif",
              fontWeight: 300,
              fontSize: "clamp(0.65625rem, 0.12vw + 0.675rem, 0.84375rem)",
              letterSpacing: "normal",
            }}
          >
            Recent work
          </p>
        </div>
      </div>

      {/* Divider */}
      

      {/* Work rows */}
      <div
        ref={workContainerRef}
        onMouseMove={handleWorkMouseMove}
        className="work-rows-container mt-0 relative"
      >
        {/* Floating image popout */}
        <div
          className="pointer-events-none fixed z-50 overflow-hidden rounded-xl shadow-2xl"
          style={{
            left: workContainerRef.current?.getBoundingClientRect().left ?? 0,
            top: workContainerRef.current?.getBoundingClientRect().top ?? 0,
            transform: `translate3d(${smoothPosition.x + 24}px, ${smoothPosition.y - 110}px, 0)`,
            opacity: isVisible ? 1 : 0,
            scale: isVisible ? 1 : 0.8,
            transition: "opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1), scale 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
          }}
        >
          <div className="relative w-[300px] h-[200px] bg-[#f0f0f0] rounded-xl overflow-hidden">
            {WORK_ROWS.map((row, index) => (
              <img
                key={index}
                src={row.image}
                alt={row.name}
                className="absolute inset-0 w-full h-full object-cover transition-all duration-500 ease-out"
                style={{
                  opacity: hoveredIndex === index ? 1 : 0,
                  scale: hoveredIndex === index ? 1 : 1.1,
                  filter: hoveredIndex === index ? "none" : "blur(10px)",
                }}
              />
            ))}
            {/* Subtle gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
          </div>
        </div>

        {WORK_ROWS.map((row, idx) => (
          <div
            key={idx}
            className="work-row grid grid-cols-[1fr_auto] items-center py-8 lg:py-[3.5vw] gap-4 group cursor-pointer"
            style={{ borderBottom: "0.5px solid rgba(0, 0, 0, 0.12)" }}
            onMouseEnter={() => handleRowEnter(idx)}
            onMouseLeave={handleRowLeave}
          >
            <h3
              className="text-[40px] sm:text-[48px] lg:text-[5.2vw] leading-none tracking-tight group-hover:pl-4 transition-all duration-300"
              style={{
                fontFamily: "var(--font-inter), -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Helvetica Neue', system-ui, sans-serif",
                fontWeight: 300,
              }}
            >
              {row.name}
            </h3>
            <span
              className="font-light text-black/70 group-hover:-translate-x-2 transition-transform duration-300"
              style={{
                fontSize: "clamp(1.051875rem, 0.306vw + 0.9486rem, 1.243125rem)",
              }}
            >
              {row.tag}
            </span>
          </div>
        ))}
      </div>

      {/* More work button */}
      <div className="mt-12 lg:mt-[5vw] flex justify-center">
        <MoreWorkButton />
      </div>
    </section>
  );
}
