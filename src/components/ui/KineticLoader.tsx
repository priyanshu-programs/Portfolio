import React from "react";

const DEFAULT_LOADER_TEXT = "LET'S TALK • LET'S TALK • LET'S TALK • ";

export default function KineticLoader({ text = DEFAULT_LOADER_TEXT }: { text?: string }) {
  return (
    <div
      className="relative inline-flex items-center justify-center size-[76px] rounded-full bg-white shrink-0 text-ink"
      style={{ fontFamily: "var(--font-sans)", fontWeight: 300 }}
    >
      {/* The solid background that expands on hover */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-full bg-[radial-gradient(ellipse_at_center,_#60a5fa_0%,_var(--color-border-deep)_50%,_#818cf8_100%)] animate-flow-gradient rounded-full scale-0 transition-transform duration-[600ms] ease-[cubic-bezier(0.85,0,0.15,1)] z-10 group-hover:scale-100" />

      {/* The SVG Text Layer */}
      <div className="absolute inset-0 flex items-center justify-center z-20 transition-colors duration-400 group-hover:text-[#f4f4f4]">
        <svg viewBox="0 0 100 100" width="100%" height="100%" className="overflow-visible animate-[spin_10s_linear_infinite] group-hover:animate-[spin_3s_linear_infinite]">
          <defs>
            <path id="circlePath" d="M 50, 50 m -36, 0 a 36,36 0 1,1 72,0 a 36,36 0 1,1 -72,0" />
          </defs>
          <text fontSize="10.5" fontWeight="600" fill="currentColor" letterSpacing="1.2">
            <textPath href="#circlePath" startOffset="0%" textLength="226" lengthAdjust="spacing">
              {text}
            </textPath>
          </text>
        </svg>
      </div>

      {/* The Center Icon */}
      <div className="relative z-30 flex items-center justify-center transition-all duration-[600ms] ease-[cubic-bezier(0.85,0,0.15,1)] group-hover:rotate-45 group-hover:scale-125 group-hover:text-[#f4f4f4]">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="24" height="24">
          <path d="M6 18L18 6M18 6H8M18 6V16" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        </svg>
      </div>
    </div>
  );
}
