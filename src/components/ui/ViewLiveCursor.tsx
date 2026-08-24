"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import gsap from "gsap";

export default function ViewLiveCursor({
  containerRef,
}: {
  containerRef: React.RefObject<HTMLElement | null>;
}) {
  const cursorRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    
    const node = cursorRef.current;
    const container = containerRef.current;
    if (!node || !container) return;

    // Fixed positioning relative to the viewport, centered on coordinates
    gsap.set(node, { xPercent: -50, yPercent: -50, scale: 0, opacity: 0 });

    const xTo = gsap.quickTo(node, "x", { duration: 0.2, ease: "power3.out" });
    const yTo = gsap.quickTo(node, "y", { duration: 0.2, ease: "power3.out" });

    let isHovered = false;
    let isActive = true;
    let lastX = 0;
    let lastY = 0;

    const updateCursor = (clientX: number, clientY: number) => {
      const rect = container.getBoundingClientRect();
      const inside = 
        clientX >= rect.left && 
        clientX <= rect.right && 
        clientY >= rect.top && 
        clientY <= rect.bottom;
      
      if (inside) {
        xTo(clientX);
        yTo(clientY);
        
        if (!isHovered) {
          isHovered = true;
          gsap.to(node, { scale: 1, opacity: 1, duration: 0.3, ease: "power3.out" });
        }
      } else {
        if (isHovered) {
          isHovered = false;
          gsap.to(node, { scale: 0, opacity: 0, duration: 0.3, ease: "power3.out" });
        }
      }
    };

    const handleMove = (e: PointerEvent) => {
      if (!isActive) return;
      lastX = e.clientX;
      lastY = e.clientY;
      updateCursor(lastX, lastY);
    };

    const handleScroll = () => {
      if (!isActive) return;
      // When the page scrolls, the image moves but the mouse stays in the same screen coordinate.
      // We re-evaluate if the mouse is still inside the bounding rect of the image.
      updateCursor(lastX, lastY);
    };

    window.addEventListener("pointermove", handleMove);
    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      isActive = false;
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("scroll", handleScroll);
      gsap.killTweensOf(node);
    };
  }, [containerRef, mounted]);

  if (!mounted) return null;

  const overlayRoot = document.getElementById("app-overlay-root");
  if (!overlayRoot) return null;

  return createPortal(
    <div
      ref={cursorRef}
      className="pointer-events-none fixed left-0 top-0 z-[9999] flex items-center justify-center w-[112px] h-[112px] rounded-full mix-blend-difference text-white"
      style={{ fontFamily: "var(--font-sans)", fontWeight: 300 }}
    >
      {/* The SVG Text Layer */}
      <div className="absolute inset-0 flex items-center justify-center z-20">
        <svg
          viewBox="0 0 100 100"
          width="100%"
          height="100%"
          className="overflow-visible animate-[spin_6s_linear_infinite]"
        >
          <defs>
            <path
              id="circlePathViewLive"
              d="M 50, 50 m -36, 0 a 36,36 0 1,1 72,0 a 36,36 0 1,1 -72,0"
            />
          </defs>
          <text
            fontSize="10.5"
            fontWeight="600"
            fill="currentColor"
            letterSpacing="1.2"
          >
            <textPath
              href="#circlePathViewLive"
              startOffset="0%"
              textLength="226"
              lengthAdjust="spacing"
            >
              VIEW LIVE • VIEW LIVE • VIEW LIVE •{" "}
            </textPath>
          </text>
        </svg>
      </div>

      {/* The Center Icon */}
      <div className="relative z-30 flex items-center justify-center scale-150">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          width="24"
          height="24"
        >
          <path
            d="M6 18L18 6M18 6H8M18 6V16"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
        </svg>
      </div>
    </div>,
    overlayRoot
  );
}
