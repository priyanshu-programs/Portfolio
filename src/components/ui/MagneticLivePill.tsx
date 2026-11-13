"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";

/** Diameter of the native arrow's footprint: the fill is born at this size so
 *  it reads as the cursor itself turning into the fill. */
const CURSOR_SIZE = 10;
/** How far the pill leans toward the pointer, as a share of its offset. */
const PULL = 0.3;
/** Extra lean for the label + arrow, for a touch of parallax depth. */
const CONTENT_PULL = 0.15;

const Arrow = () => (
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

/**
 * The case study's "View live" pill. On a fine pointer, the cursor disappears
 * and becomes the pill's fill: a cursor-sized disc is born where the pointer
 * entered and floods the pill, the pill leans toward the pointer, and on leave
 * the disc shrinks back to cursor size at the exit point as the native arrow
 * returns. Touch, reduced motion and keyboard focus get a plain CSS fill
 * (`.live-pill` in globals.css), keyed off the absence of `data-magnetic`.
 *
 * Inner nodes are found by `data-*` attribute, not per-node refs: the repo's
 * react-hooks lint rejects ref-callback factories.
 */
export default function MagneticLivePill({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  const pillRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const pill = pillRef.current;
    if (!pill) return;
    const mq = window.matchMedia(
      "(pointer: fine) and (prefers-reduced-motion: no-preference)"
    );
    if (!mq.matches) return;

    const fill = pill.querySelector<HTMLElement>("[data-fill]");
    const content = pill.querySelector<HTMLElement>("[data-content]");
    const arrowOut = pill.querySelector<HTMLElement>("[data-arrow-out]");
    const arrowIn = pill.querySelector<HTMLElement>("[data-arrow-in]");
    if (!fill || !content || !arrowOut || !arrowIn) return;

    pill.dataset.magnetic = "";

    // The disc covers the pill from any point inside it at scale 1, so its
    // diameter is twice the pill's diagonal.
    let diameter = 0;
    const sizeFill = () => {
      diameter = Math.ceil(Math.hypot(pill.offsetWidth, pill.offsetHeight) * 2);
      gsap.set(fill, { width: diameter, height: diameter });
    };
    sizeFill();
    gsap.set(fill, { xPercent: -50, yPercent: -50, scale: 0, opacity: 0 });
    gsap.set(arrowIn, { xPercent: -100, yPercent: 100 });

    const pillX = gsap.quickTo(pill, "x", { duration: 0.4, ease: "power3.out" });
    const pillY = gsap.quickTo(pill, "y", { duration: 0.4, ease: "power3.out" });
    const contentX = gsap.quickTo(content, "x", { duration: 0.4, ease: "power3.out" });
    const contentY = gsap.quickTo(content, "y", { duration: 0.4, ease: "power3.out" });
    const fillX = gsap.quickTo(fill, "x", { duration: 0.5, ease: "power3.out" });
    const fillY = gsap.quickTo(fill, "y", { duration: 0.5, ease: "power3.out" });

    /** Pointer position in the pill's own (untransformed) box, plus its offset
     *  from the pill's resting centre. The rect includes the magnetic
     *  translate, so that is subtracted back out to avoid a feedback loop. */
    const locate = (e: PointerEvent) => {
      const rect = pill.getBoundingClientRect();
      const tx = Number(gsap.getProperty(pill, "x")) || 0;
      const ty = Number(gsap.getProperty(pill, "y")) || 0;
      const left = rect.left - tx;
      const top = rect.top - ty;
      const lx = e.clientX - left;
      const ly = e.clientY - top;
      return {
        lx,
        ly,
        dx: lx - rect.width / 2,
        dy: ly - rect.height / 2,
      };
    };

    const onEnter = (e: PointerEvent) => {
      const { lx, ly } = locate(e);
      pill.classList.add("cursor-none");
      pill.dataset.active = "";
      gsap.killTweensOf(fill, "scale,opacity");
      gsap.set(fill, { x: lx, y: ly, scale: CURSOR_SIZE / diameter, opacity: 1 });
      gsap.to(fill, { scale: 1, duration: 0.6, ease: "expo.out" });
      gsap.to(arrowOut, { xPercent: 100, yPercent: -100, duration: 0.35, ease: "power3.in" });
      gsap.fromTo(
        arrowIn,
        { xPercent: -100, yPercent: 100 },
        { xPercent: 0, yPercent: 0, duration: 0.45, delay: 0.12, ease: "power3.out" }
      );
    };

    const onMove = (e: PointerEvent) => {
      const { lx, ly, dx, dy } = locate(e);
      pillX(dx * PULL);
      pillY(dy * PULL);
      contentX(dx * CONTENT_PULL);
      contentY(dy * CONTENT_PULL);
      fillX(lx);
      fillY(ly);
    };

    const onLeave = (e: PointerEvent) => {
      const { lx, ly } = locate(e);
      delete pill.dataset.active;
      pill.classList.remove("cursor-none");
      gsap.killTweensOf(fill);
      // Collapse back to cursor size at the exit point, then vanish.
      gsap.to(fill, {
        x: lx,
        y: ly,
        scale: CURSOR_SIZE / diameter,
        duration: 0.45,
        ease: "power3.inOut",
      });
      gsap.to(fill, { opacity: 0, duration: 0.15, delay: 0.35 });
      gsap.to([pill, content], { x: 0, y: 0, duration: 0.8, ease: "elastic.out(1, 0.4)" });
      gsap.to(arrowIn, { xPercent: 100, yPercent: -100, duration: 0.3, ease: "power3.in" });
      gsap.fromTo(
        arrowOut,
        { xPercent: -100, yPercent: 100 },
        { xPercent: 0, yPercent: 0, duration: 0.45, delay: 0.1, ease: "power3.out" }
      );
    };

    const ro = new ResizeObserver(sizeFill);
    ro.observe(pill);
    pill.addEventListener("pointerenter", onEnter);
    pill.addEventListener("pointermove", onMove);
    pill.addEventListener("pointerleave", onLeave);

    return () => {
      ro.disconnect();
      pill.removeEventListener("pointerenter", onEnter);
      pill.removeEventListener("pointermove", onMove);
      pill.removeEventListener("pointerleave", onLeave);
      gsap.killTweensOf([pill, content, fill, arrowOut, arrowIn]);
      gsap.set([pill, content], { clearProps: "transform" });
      pill.classList.remove("cursor-none");
      delete pill.dataset.magnetic;
      delete pill.dataset.active;
    };
  }, []);

  return (
    <a
      ref={pillRef}
      href={href}
      target="_blank"
      rel="noreferrer"
      className="live-pill relative mt-8 inline-flex isolate overflow-hidden rounded-full border px-5 py-2.5 text-[0.875rem]"
      style={{ borderColor: "var(--cs-line)", color: "var(--cs-ink)" }}
    >
      <span
        data-fill
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 -z-10 rounded-full"
        style={{ backgroundColor: "var(--cs-ink)", opacity: 0 }}
      />
      <span data-content className="live-pill__content inline-flex items-center gap-2">
        {children}
        <span className="relative inline-block h-4 w-4 overflow-hidden">
          <span data-arrow-out className="absolute inset-0">
            <Arrow />
          </span>
          <span data-arrow-in className="absolute inset-0">
            <Arrow />
          </span>
        </span>
      </span>
    </a>
  );
}
