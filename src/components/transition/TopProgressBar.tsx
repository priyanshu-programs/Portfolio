"use client";

import { useEffect, useImperativeHandle, useRef, useSyncExternalStore } from "react";
import gsap from "gsap";

const REDUCED_MOTION_QUERY = "(prefers-reduced-motion: reduce)";

const subscribeReducedMotion = (onChange: () => void) => {
  const mq = window.matchMedia(REDUCED_MOTION_QUERY);
  mq.addEventListener("change", onChange);
  return () => mq.removeEventListener("change", onChange);
};

const getReducedMotion = () => window.matchMedia(REDUCED_MOTION_QUERY).matches;

/** The bar approaches but never reaches this while a route is pending. */
const CEILING_PCT = 88;
/** Time constant of the first-order lag toward the ceiling, in seconds. */
const CREEP_TAU = 0.9;
/** Duration of the ceiling → 100% run once the route commits. */
const FINISH_DUR = 0.25;

export type TopProgressBarHandle = {
  /**
   * Run the bar from wherever it sits to 100% and resolve once it lands.
   * Resolves immediately if the bar never started animating.
   */
  finish: () => Promise<void>;
};

/**
 * Slim progress bar pinned to the top of the viewport — the conventional
 * "page is loading" indicator seen on most sites.
 *
 * Purely presentational — it knows nothing about routing. `RouteLoadingOverlay`
 * drives it for slow navigations.
 */
export default function TopProgressBar({
  className = "",
  handleRef,
}: {
  className?: string;
  handleRef?: React.RefObject<TopProgressBarHandle | null>;
}) {
  const barRef = useRef<HTMLDivElement>(null);
  const pctRef = useRef(0);
  const tickRef = useRef<((time: number, delta: number) => void) | null>(null);

  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotion,
    () => false,
  );

  useImperativeHandle(
    handleRef,
    () => ({
      finish: () =>
        new Promise<void>((resolve) => {
          const el = barRef.current;
          if (!el) {
            resolve();
            return;
          }
          if (tickRef.current) {
            gsap.ticker.remove(tickRef.current);
            tickRef.current = null;
          }
          const proxy = { v: pctRef.current };
          gsap.to(proxy, {
            v: 100,
            duration: reducedMotion ? 0 : FINISH_DUR,
            ease: "power2.out",
            onUpdate: () => {
              el.style.width = `${proxy.v}%`;
            },
            onComplete: () => {
              el.style.width = "100%";
              resolve();
            },
          });
        }),
    }),
    [reducedMotion],
  );

  useEffect(() => {
    const bar = barRef.current;
    if (!bar) return;

    pctRef.current = 0;
    bar.style.width = "0%";

    // Reduced motion still shows a bar — it's a status indicator — but jumps
    // straight to a fixed, non-animating fill instead of creeping.
    if (reducedMotion) {
      bar.style.width = `${CEILING_PCT}%`;
      return;
    }

    // A ticker callback, not a tween: a tween needs a known duration, which is
    // exactly what a pending navigation does not have. First-order lag toward
    // the ceiling, framerate-independent.
    const tick = (_time: number, deltaMs: number) => {
      const dt = Math.min(deltaMs, 100) / 1000;
      pctRef.current += (CEILING_PCT - pctRef.current) * (1 - Math.exp(-dt / CREEP_TAU));
      bar.style.width = `${pctRef.current}%`;
    };
    tickRef.current = tick;
    gsap.ticker.add(tick);

    return () => {
      if (tickRef.current) {
        gsap.ticker.remove(tickRef.current);
        tickRef.current = null;
      }
    };
  }, [reducedMotion]);

  return (
    <div className={`route-progress-track ${className}`.trim()}>
      <div ref={barRef} className="route-progress-bar" />
    </div>
  );
}
