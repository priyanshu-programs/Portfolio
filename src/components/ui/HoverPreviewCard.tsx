"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

export type HoverPreviewItem = {
  key: string;
  image?: string;
  bgColor?: string;
};

type HoverPreviewCardProps = {
  items: HoverPreviewItem[];
  /** Index of the hovered row, or null when the pointer is off the list. */
  activeIndex: number | null;
  /** Pointer source — the element wrapping the rows. */
  containerRef: React.RefObject<HTMLElement | null>;
  /** Call sites with more than one view (e.g. /work grid) opt out here. */
  enabled?: boolean;
  /** Size multiplier on the base 400×360 box — /work runs at 0.8. */
  scale?: number;
};

/* Card geometry at scale 1, in CSS px: a 400×360 colour box framing a 352×220
   (16:10) image window, leaving 24px of colour left/right and 70px top/bottom.
   `hoverImage` assets should be 16:10, around 1600×1000. Every other size is
   derived from these, so a `scale` keeps the proportions exact. */
const BASE_CARD_W = 400;
const BASE_CARD_H = 360;
const BASE_IMG_W = 352;
const BASE_IMG_H = 220;
/** Gap between the cursor and the near edge of the card. */
const GAP = 28;
/** Keeps the card off the viewport edges when it flips or clamps. */
const MARGIN = 16;
const DEFAULT_BG = "#f0f0f0";

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

/**
 * The card sits to the right of the cursor rather than under it, so the row
 * text stays readable. Near the right edge there is no room for that, so it
 * flips to the left of the cursor instead of clipping. Vertically it centres on
 * the cursor, clamped to the viewport — the top and bottom rows of a long list
 * would otherwise push it half off screen.
 */
function positionFor(
  clientX: number,
  clientY: number,
  cardW: number,
  cardH: number
) {
  let x = clientX + GAP;
  if (x + cardW > window.innerWidth - MARGIN) x = clientX - GAP - cardW;

  const y = clamp(
    clientY,
    cardH / 2 + MARGIN,
    window.innerHeight - cardH / 2 - MARGIN
  );

  return { x, y };
}

/**
 * Cursor-following preview shared by the /work list and the homepage "Recent
 * work" rows: a flat colour card (per-project, from the CMS) framing an inset
 * landscape thumbnail. Thumbnails are stacked and slid in the direction the
 * pointer travels through the list.
 */
export default function HoverPreviewCard({
  items,
  activeIndex,
  containerRef,
  enabled = true,
  scale = 1,
}: HoverPreviewCardProps) {
  const cardW = Math.round(BASE_CARD_W * scale);
  const cardH = Math.round(BASE_CARD_H * scale);
  const imgW = Math.round(BASE_IMG_W * scale);
  const imgH = Math.round(BASE_IMG_H * scale);
  // Centre the window rather than carrying separate padding constants, so
  // rounding at fractional scales can't leave the frame lopsided.
  const padX = Math.round((cardW - imgW) / 2);
  const padY = Math.round((cardH - imgH) / 2);

  const popoutRef = useRef<HTMLDivElement>(null);
  const imageRefs = useRef<(HTMLElement | null)[]>([]);
  const prevActiveIndexRef = useRef<number | null>(null);
  const xToRef = useRef<gsap.QuickToFunc | null>(null);
  const yToRef = useRef<gsap.QuickToFunc | null>(null);
  const reduceMotionRef = useRef(false);

  const isVisible = enabled && activeIndex !== null;
  const activeBg =
    (activeIndex !== null ? items[activeIndex]?.bgColor : undefined) ??
    DEFAULT_BG;

  // Park every thumbnail below the window. Ref callbacks only ever assign, so
  // the array keeps entries for rows that have since unmounted — truncate
  // before touching it or GSAP animates detached nodes. React also detaches
  // refs before passive effects run, so entries are null on the render that
  // disables the card; GSAP throws on a null target, hence the filter.
  useEffect(() => {
    const images = imageRefs.current;
    images.length = items.length;
    const live = images.filter((img): img is HTMLElement => img !== null);
    if (!live.length) return;
    gsap.set(live, { yPercent: 100, zIndex: 0 });
    return () => {
      gsap.killTweensOf(live);
    };
    // `enabled` unmounts the whole card, so re-park the freshly mounted nodes.
  }, [items, enabled]);

  // Slide the incoming thumbnail in from the side the pointer came from.
  useEffect(() => {
    const newIdx = enabled ? activeIndex : null;
    const oldIdx = prevActiveIndexRef.current;

    if (newIdx !== null) {
      const newImg = imageRefs.current[newIdx];
      const oldImg = oldIdx !== null ? imageRefs.current[oldIdx] : null;

      gsap.killTweensOf(imageRefs.current.filter(Boolean));

      const isMovingUpList = oldIdx !== null && newIdx < oldIdx;
      const newStartY = isMovingUpList ? -100 : 100;
      const oldEndY = isMovingUpList ? 100 : -100;

      if (newImg) {
        gsap.set(newImg, { yPercent: newStartY, zIndex: 2 });
        gsap.to(newImg, { yPercent: 0, duration: 0.6, ease: "power3.inOut" });
      }

      if (oldImg && oldIdx !== newIdx) {
        gsap.set(oldImg, { zIndex: 1 });
        gsap.to(oldImg, { yPercent: oldEndY, duration: 0.6, ease: "power3.inOut" });
      }

      imageRefs.current.forEach((img, idx) => {
        if (idx !== newIdx && idx !== oldIdx && img) {
          gsap.set(img, { yPercent: 100, zIndex: 0 });
        }
      });
    } else if (oldIdx !== null) {
      const oldImg = imageRefs.current[oldIdx];
      if (oldImg) {
        gsap.killTweensOf(oldImg);
        gsap.to(oldImg, { yPercent: 100, duration: 0.6, ease: "power3.inOut" });
      }
    }

    prevActiveIndexRef.current = newIdx;
  }, [activeIndex, enabled]);

  // Cursor follow. quickTo runs on GSAP's shared ticker and writes straight to
  // the node, so there is no bespoke rAF loop and React never re-renders on
  // pointer move.
  useEffect(() => {
    const node = popoutRef.current;
    const container = containerRef.current;
    if (!enabled || !node || !container) return;

    reduceMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    // x is the card's left edge (the offset is applied in positionFor);
    // y stays centred on the cursor.
    gsap.set(node, { xPercent: 0, yPercent: -50 });
    xToRef.current = gsap.quickTo(node, "x", { duration: 0.55, ease: "power3" });
    yToRef.current = gsap.quickTo(node, "y", { duration: 0.55, ease: "power3" });

    const handleMove = (e: PointerEvent) => {
      const { x, y } = positionFor(e.clientX, e.clientY, cardW, cardH);
      if (reduceMotionRef.current) {
        gsap.set(node, { x, y });
        return;
      }
      xToRef.current?.(x);
      yToRef.current?.(y);
    };

    container.addEventListener("pointermove", handleMove);

    return () => {
      container.removeEventListener("pointermove", handleMove);
      gsap.killTweensOf(node);
      // Drop the quickTo closures so a stray move can't write to a node that
      // has already been removed.
      xToRef.current = null;
      yToRef.current = null;
    };
  }, [containerRef, enabled, cardW, cardH]);

  if (!enabled) return null;

  return (
    <div
      ref={popoutRef}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-50 hidden md:block"
    >
      {/* Entrance lives on this inner node so it never collides with the GSAP
          transform on the positioned outer node. */}
      <div
        className="relative overflow-hidden rounded-[2px] transition-[opacity,transform,background-color] duration-500 ease-out"
        style={{
          width: cardW,
          height: cardH,
          backgroundColor: activeBg,
          opacity: isVisible ? 1 : 0,
          transform: `scale(${isVisible ? 1 : 0.85})`,
        }}
      >
        {/* Inset landscape window — the card colour frames it on all sides. */}
        <div
          className="absolute overflow-hidden rounded-[2px]"
          style={{ left: padX, top: padY, width: imgW, height: imgH }}
        >
          {items.map((item, index) =>
            item.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={item.key}
                ref={(el) => {
                  imageRefs.current[index] = el;
                }}
                src={item.image}
                alt=""
                className="absolute inset-0 h-full w-full object-cover will-change-transform"
              />
            ) : (
              <div
                key={item.key}
                ref={(el) => {
                  imageRefs.current[index] = el;
                }}
                className="absolute inset-0 h-full w-full will-change-transform"
                style={{ backgroundColor: item.bgColor ?? "#f1f1f1" }}
              />
            )
          )}
        </div>
      </div>
    </div>
  );
}
