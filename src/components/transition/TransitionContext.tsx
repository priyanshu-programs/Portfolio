"use client";

import gsap from "gsap";
import type Lenis from "lenis";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { flushSync } from "react-dom";
import { usePathname, useRouter } from "next/navigation";

export const PAGE_REVEAL_EVENT = "page-transition:reveal";
export const LANDING_INTRO_STORAGE_KEY = "pr-home-landing-intro-seen";

declare global {
  interface Window {
    __pendingTransitionHref?: string;
    __runTransitionNavigate?: (href: string) => void;
    __transitionClickGuard?: boolean;
    __lenis?: Lenis;
  }
}

interface TransitionContextValue {
  navigateTo: (href: string) => void;
  isAnimating: boolean;
  isLandingIntroActive: boolean;
  registerPageRef: (el: HTMLDivElement | null) => void;
  registerStageRef: (el: HTMLDivElement | null) => void;
  registerSnapshotRef: (el: HTMLDivElement | null) => void;
  registerSheetRef: (el: HTMLDivElement | null) => void;
  registerTopCurtainRef: (el: HTMLDivElement | null) => void;
  registerBandRef: (el: HTMLDivElement | null) => void;
  registerBottomCurtainRef: (el: HTMLDivElement | null) => void;
  registerCounterRef: (el: HTMLDivElement | null) => void;
  registerCounterTextRef: (el: HTMLParagraphElement | null) => void;
}

const noop = () => { };

const TransitionCtx = createContext<TransitionContextValue>({
  navigateTo: noop,
  isAnimating: false,
  isLandingIntroActive: false,
  registerPageRef: noop,
  registerStageRef: noop,
  registerSnapshotRef: noop,
  registerSheetRef: noop,
  registerTopCurtainRef: noop,
  registerBandRef: noop,
  registerBottomCurtainRef: noop,
  registerCounterRef: noop,
  registerCounterTextRef: noop,
});

type StageMetrics = {
  viewportWidth: number;
  viewportHeight: number;
  clip: number;
};

type WipeFrame = {
  top: number;
  side: number;
  height: number;
};

const TRANSITION_DURATION = 2.2;
const ROUTE_SWAP_TIME = 0.18;
const TRANSITION_STAGE_Z_INDEX = 11000;
const INCOMING_PAGE_Z_INDEX = TRANSITION_STAGE_Z_INDEX + 1;
const REFERENCE_WIDTH = 1920;
const REFERENCE_CLIP = 90;
const TRANSITION_SCROLL_KEYS = new Set([
  " ",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "End",
  "Home",
  "PageDown",
  "PageUp",
]);

const clamp01 = (value: number) => Math.min(1, Math.max(0, value));
const lerp = (from: number, to: number, progress: number) =>
  from + (to - from) * progress;

const cubicBezier = (x1: number, y1: number, x2: number, y2: number) => {
  const sample = (a1: number, a2: number, t: number) => {
    const inverse = 1 - t;
    return (
      3 * inverse * inverse * t * a1 +
      3 * inverse * t * t * a2 +
      t * t * t
    );
  };

  return (progress: number) => {
    const x = clamp01(progress);
    let lower = 0;
    let upper = 1;
    let t = x;

    for (let i = 0; i < 24; i++) {
      t = (lower + upper) / 2;
      if (sample(x1, x2, t) < x) {
        lower = t;
      } else {
        upper = t;
      }
    }

    return sample(y1, y2, t);
  };
};

const zajnoIo6 = cubicBezier(0.16, 1, 0.3, 1);

const getStageMetrics = (): StageMetrics => {
  const viewportWidth = document.documentElement.clientWidth || window.innerWidth;
  const viewportHeight = window.innerHeight;
  const clip = (REFERENCE_CLIP * viewportWidth) / REFERENCE_WIDTH;

  return {
    viewportWidth,
    viewportHeight,
    clip,
  };
};

const getWipeFrame = (metrics: StageMetrics, rawProgress: number): WipeFrame => {
  const progress = clamp01(rawProgress);
  const grow = zajnoIo6(progress / 0.8);
  const travel = zajnoIo6((progress - 0.2) / 0.8);
  const startInset = metrics.clip * 2;
  const side =
    lerp(startInset, metrics.clip, grow) + lerp(0, -metrics.clip, travel);
  const top =
    lerp(metrics.viewportHeight - startInset, metrics.clip, grow) +
    lerp(0, -metrics.clip, travel);
  const closingBottom = lerp(metrics.clip, metrics.viewportHeight, travel);
  const bottom = Math.max(closingBottom, side);

  return {
    top: Math.max(0, top),
    side: Math.max(0, side),
    height: Math.max(0, metrics.viewportHeight - top - bottom),
  };
};

const getRevealFrame = (
  metrics: StageMetrics,
  wipeFrame: WipeFrame,
  progress: number
) => {
  const revealTop =
    progress > 0.985
      ? 0
      : Math.min(
        metrics.viewportHeight,
        Math.max(0, wipeFrame.top + wipeFrame.height)
      );
  const side = progress > 0.985 ? 0 : Math.max(0, wipeFrame.side);

  return {
    top: revealTop,
    side,
    width: Math.max(0, metrics.viewportWidth - side * 2),
    height: Math.max(0, metrics.viewportHeight - revealTop),
  };
};

const scrollToHash = (hash: string) => {
  if (!hash) return;

  const id = hash.slice(1);
  const target = document.getElementById(id);

  if (!target) return;

  window.history.pushState(
    null,
    "",
    `${window.location.pathname}${window.location.search}${hash}`
  );
  target.scrollIntoView({ behavior: "smooth", block: "start" });
};

const preventTransitionScroll = (event: Event) => {
  event.preventDefault();
};

const preventTransitionKeyScroll = (event: KeyboardEvent) => {
  if (TRANSITION_SCROLL_KEYS.has(event.key)) {
    event.preventDefault();
  }
};

export const useTransition = () => useContext(TransitionCtx);

export default function TransitionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAnimating, setIsAnimating] = useState(false);
  const [isLandingIntroActive, setIsLandingIntroActive] = useState(false);

  const pageRef = useRef<HTMLDivElement | null>(null);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const snapshotRef = useRef<HTMLDivElement | null>(null);
  const sheetRef = useRef<HTMLDivElement | null>(null);
  const topCurtainRef = useRef<HTMLDivElement | null>(null);
  const bandRef = useRef<HTMLDivElement | null>(null);
  const bottomCurtainRef = useRef<HTMLDivElement | null>(null);
  const counterRef = useRef<HTMLDivElement | null>(null);
  const counterTextRef = useRef<HTMLParagraphElement | null>(null);

  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const awaitingRevealRef = useRef(false);
  const incomingPageReadyRef = useRef(false);
  const pendingHashRef = useRef("");
  const targetPathRef = useRef(pathname);
  const initialPathnameRef = useRef(pathname);
  const latestRevealFrameRef = useRef<{
    metrics: StageMetrics;
    frame: WipeFrame;
    progress: number;
  } | null>(null);

  const killTimeline = useCallback(() => {
    timelineRef.current?.kill();
    timelineRef.current = null;
  }, []);

  const lockViewport = useCallback(() => {
    window.addEventListener("wheel", preventTransitionScroll, {
      passive: false,
    });
    window.addEventListener("touchmove", preventTransitionScroll, {
      passive: false,
    });
    window.addEventListener(
      "keydown",
      preventTransitionKeyScroll as EventListener
    );
    document.documentElement.classList.add("is-transitioning");
    document.body.classList.add("is-transitioning");
  }, []);

  const unlockViewport = useCallback(() => {
    document.documentElement.classList.remove("is-transitioning");
    document.body.classList.remove("is-transitioning");
    window.removeEventListener("wheel", preventTransitionScroll);
    window.removeEventListener("touchmove", preventTransitionScroll);
    window.removeEventListener(
      "keydown",
      preventTransitionKeyScroll as EventListener
    );
  }, []);

  const clearOutgoingSnapshot = useCallback(() => {
    snapshotRef.current?.replaceChildren();
  }, []);

  const captureOutgoingSnapshot = useCallback(() => {
    const snapshot = snapshotRef.current;
    const page = pageRef.current;

    if (!snapshot || !page) {
      return;
    }

    snapshot.replaceChildren();

    const clone = page.cloneNode(true) as HTMLElement;
    clone.setAttribute("aria-hidden", "true");
    clone.classList.add("page-transition-snapshot-page");

    const scrollX = window.scrollX;
    const scrollY = window.scrollY;
    const pageHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body.scrollHeight,
      page.scrollHeight,
      window.innerHeight
    );

    Object.assign(clone.style, {
      position: "absolute",
      left: `${-scrollX}px`,
      top: `${-scrollY}px`,
      width: `${document.documentElement.clientWidth}px`,
      minHeight: `${pageHeight}px`,
      pointerEvents: "none",
      transform: "translate3d(0, 0, 0)",
    });

    snapshot.appendChild(clone);
  }, []);

  const setBandFrame = useCallback(
    (metrics: StageMetrics, frame: WipeFrame, progress: number) => {
      if (!bandRef.current) {
        return;
      }

      const hairline =
        progress < 0.025
          ? Math.max(2, Math.round(metrics.viewportHeight * 0.003))
          : 0;
      const height = Math.max(frame.height, hairline);
      const width = Math.max(0, metrics.viewportWidth - frame.side * 2);

      gsap.set(bandRef.current, {
        x: frame.side,
        y: frame.top,
        scaleX: width / metrics.viewportWidth,
        scaleY: height / metrics.viewportHeight,
        transformOrigin: "top left",
      });
    },
    []
  );

  const setIncomingPageFrame = useCallback(
    (
      page: HTMLDivElement,
      metrics: StageMetrics,
      frame: WipeFrame,
      progress: number
    ) => {
      const reveal = getRevealFrame(metrics, frame, progress);

      gsap.set(page, {
        autoAlpha: 1,
        clipPath: `inset(${reveal.top}px ${reveal.side}px 0px ${reveal.side}px)`,
        inset: 0,
        minHeight: "100vh",
        pointerEvents: "none",
        position: "fixed",
        transform: "translate3d(0, 0, 0)",
        width: `${metrics.viewportWidth}px`,
        maxWidth: `${metrics.viewportWidth}px`,
        willChange: "clip-path",
        zIndex: INCOMING_PAGE_Z_INDEX,
      });
    },
    []
  );

  const setRevealFrame = useCallback(
    (metrics: StageMetrics, frame: WipeFrame, progress: number) => {
      const reveal = getRevealFrame(metrics, frame, progress);

      if (sheetRef.current) {
        gsap.set(sheetRef.current, {
          x: reveal.side,
          y: reveal.top,
          scaleX: reveal.width / metrics.viewportWidth,
          scaleY: reveal.height / metrics.viewportHeight,
          transformOrigin: "top left",
        });
      }

      if (incomingPageReadyRef.current && pageRef.current) {
        setIncomingPageFrame(pageRef.current, metrics, frame, progress);
      }
    },
    [setIncomingPageFrame]
  );

  const hideStage = useCallback(() => {
    incomingPageReadyRef.current = false;
    latestRevealFrameRef.current = null;
    clearOutgoingSnapshot();

    if (stageRef.current) {
      gsap.set(stageRef.current, { autoAlpha: 0, pointerEvents: "none" });
    }

    if (topCurtainRef.current) {
      gsap.set(topCurtainRef.current, {
        clearProps: "transform,transformOrigin",
      });
    }

    if (bandRef.current) {
      gsap.set(bandRef.current, { clearProps: "transform,transformOrigin" });
    }

    if (sheetRef.current) {
      gsap.set(sheetRef.current, { clearProps: "transform,transformOrigin" });
    }

    if (bottomCurtainRef.current) {
      gsap.set(bottomCurtainRef.current, {
        clearProps: "transform,transformOrigin",
      });
    }

    if (counterRef.current) {
      gsap.set(counterRef.current, { autoAlpha: 0 });
    }

    if (counterTextRef.current) {
      counterTextRef.current.textContent = "100";
      gsap.set(counterTextRef.current, { clearProps: "yPercent,opacity" });
    }
  }, [clearOutgoingSnapshot]);

  const finishTransition = useCallback(() => {
    killTimeline();

    const page = pageRef.current;

    // 1. Fully open the clip-path so the page is 100% visible while still fixed
    if (page) {
      gsap.set(page, {
        clipPath: "inset(0px 0px 0px 0px)",
        willChange: "auto",
      });
    }

    // 2. Hide the transition stage overlay (band, sheet, curtains, etc.)
    //    The fixed page is now the only visible layer.
    hideStage();

    // 3. Reset scroll to top (both Lenis and native)
    if (window.__lenis) {
      window.__lenis.scrollTo(0, { immediate: true });
    }
    window.scrollTo(0, 0);

    // 4. Wait for the browser to paint the scroll-reset, then un-fix the page.
    //    Double rAF ensures the compositor has flushed the scroll change.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (page) {
          gsap.set(page, {
            clearProps:
              "clipPath,opacity,position,inset,top,right,bottom,left,visibility,zIndex,transform,transformOrigin,willChange,width,height,minHeight,maxWidth,maxHeight,pointerEvents,overflow",
          });
        }

        unlockViewport();
        awaitingRevealRef.current = false;

        const pendingHash = pendingHashRef.current;
        pendingHashRef.current = "";

        setIsAnimating(false);

        requestAnimationFrame(() => {
          window.dispatchEvent(new Event("resize"));
        });

        if (pendingHash) {
          window.setTimeout(() => scrollToHash(pendingHash), 60);
        }
      });
    });
  }, [hideStage, killTimeline, unlockViewport]);

  const revealIncomingPage = useCallback(() => {
    awaitingRevealRef.current = false;

    window.dispatchEvent(
      new CustomEvent(PAGE_REVEAL_EVENT, {
        detail: { path: targetPathRef.current },
      })
    );
  }, []);

  const revealHomePage = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent(PAGE_REVEAL_EVENT, {
        detail: { path: "/" },
      })
    );
  }, []);

  const beginNavigation = useCallback(
    (href: string) => {
      const shouldScroll = !href.includes("#");
      const stage = stageRef.current;
      const topCurtain = topCurtainRef.current;
      const band = bandRef.current;
      const sheet = sheetRef.current;
      const bottomCurtain = bottomCurtainRef.current;
      const counter = counterRef.current;
      const counterText = counterTextRef.current;
      const reduceMotion = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      const targetUrl = new URL(href, window.location.origin);
      const targetPath = targetUrl.pathname;

      targetPathRef.current = targetPath;

      if (!stage || !band || !sheet || reduceMotion) {
        awaitingRevealRef.current = true;
        router.push(href, { scroll: shouldScroll });
        window.setTimeout(finishTransition, 0);
        return;
      }

      const metrics = getStageMetrics();
      const nextPath = `${targetPath}${targetUrl.search}`;
      const progress = { value: 0 };
      let hasPushed = false;

      const renderFrame = () => {
        const frame = getWipeFrame(metrics, progress.value);
        latestRevealFrameRef.current = {
          metrics,
          frame,
          progress: progress.value,
        };
        setBandFrame(metrics, frame, progress.value);
        setRevealFrame(metrics, frame, progress.value);
      };

      const pushRoute = () => {
        if (hasPushed) {
          return;
        }

        hasPushed = true;
        awaitingRevealRef.current = true;
        router.push(href, { scroll: shouldScroll });
      };

      killTimeline();
      incomingPageReadyRef.current = false;
      latestRevealFrameRef.current = null;
      captureOutgoingSnapshot();
      lockViewport();
      void router.prefetch(nextPath);

      gsap.set(stage, { autoAlpha: 1, pointerEvents: "auto" });
      gsap.set(topCurtain, { scaleY: 0, transformOrigin: "top left" });
      gsap.set(bottomCurtain, { scaleY: 0, transformOrigin: "top left" });
      gsap.set(sheet, { transformOrigin: "top left" });
      gsap.set(counter, { autoAlpha: 0 });

      if (counterText) {
        counterText.textContent = "100";
        gsap.set(counterText, {
          yPercent: 0,
          opacity: 0,
        });
      }

      renderFrame();

      const tl = gsap.timeline({
        onComplete: finishTransition,
      });

      tl.to(progress, {
        value: 1,
        duration: TRANSITION_DURATION,
        ease: "none",
        onUpdate: renderFrame,
      }).call(pushRoute, [], ROUTE_SWAP_TIME);

      timelineRef.current = tl;
    },
    [
      captureOutgoingSnapshot,
      finishTransition,
      killTimeline,
      lockViewport,
      router,
      setBandFrame,
      setRevealFrame,
    ]
  );

  const navigateTo = useCallback(
    (href: string) => {
      if (href.startsWith("http")) {
        window.location.href = href;
        return;
      }

      const targetUrl = new URL(href, window.location.origin);
      const nextPath = `${targetUrl.pathname}${targetUrl.search}`;
      const currentPath = `${window.location.pathname}${window.location.search}`;

      if (nextPath === currentPath && targetUrl.hash) {
        scrollToHash(targetUrl.hash);
        return;
      }

      if (nextPath === currentPath && !targetUrl.hash) {
        return;
      }

      if (isAnimating) {
        return;
      }

      pendingHashRef.current = targetUrl.hash;

      flushSync(() => {
        setIsAnimating(true);
      });

      beginNavigation(`${nextPath}${targetUrl.hash}`);
    },
    [beginNavigation, isAnimating]
  );

  useEffect(() => {
    window.__runTransitionNavigate = navigateTo;

    const pendingHref = window.__pendingTransitionHref;
    if (pendingHref) {
      window.__pendingTransitionHref = "";
      navigateTo(pendingHref);
    }

    return () => {
      if (window.__runTransitionNavigate === navigateTo) {
        window.__runTransitionNavigate = undefined;
      }
    };
  }, [navigateTo]);

  useEffect(() => {
    if (pathname !== "/" || initialPathnameRef.current !== "/") {
      return;
    }

    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    try {
      if (window.sessionStorage.getItem(LANDING_INTRO_STORAGE_KEY) === "true") {
        return;
      }
    } catch {
      return;
    }

    if (reduceMotion) {
      try {
        window.sessionStorage.setItem(LANDING_INTRO_STORAGE_KEY, "true");
      } catch { }

      revealHomePage();
      return;
    }

    let cancelled = false;
    let frameRequest = 0;

    const finishLandingIntro = () => {
      killTimeline();
      hideStage();
      unlockViewport();
      setIsAnimating(false);
      setIsLandingIntroActive(false);

      requestAnimationFrame(() => {
        window.dispatchEvent(new Event("resize"));
      });
    };

    const startLandingIntro = () => {
      if (cancelled) {
        return;
      }

      const stage = stageRef.current;
      const sheet = sheetRef.current;
      const band = bandRef.current;
      const counter = counterRef.current;
      const counterText = counterTextRef.current;

      if (!stage || !sheet || !band || !counter || !counterText) {
        frameRequest = requestAnimationFrame(startLandingIntro);
        return;
      }

      try {
        window.sessionStorage.setItem(LANDING_INTRO_STORAGE_KEY, "true");
      } catch { }

      const metrics = getStageMetrics();
      const count = { value: 0 };
      const wipe = { value: 0 };
      let didRevealHero = false;

      const revealHeroOnce = () => {
        if (didRevealHero) {
          return;
        }

        didRevealHero = true;
        revealHomePage();
      };

      const renderLandingWipe = () => {
        const frame = getWipeFrame(metrics, wipe.value);
        const reveal = getRevealFrame(metrics, frame, wipe.value);

        setBandFrame(metrics, frame, wipe.value);

        gsap.set(sheet, {
          x: 0,
          y: 0,
          scaleX: 1,
          scaleY: reveal.top / metrics.viewportHeight,
          transformOrigin: "top left",
        });
      };

      lockViewport();
      killTimeline();
      clearOutgoingSnapshot();
      setIsAnimating(true);
      setIsLandingIntroActive(true);

      gsap.set(stage, { autoAlpha: 1, pointerEvents: "auto" });
      gsap.set(sheet, {
        x: 0,
        y: 0,
        scaleX: 1,
        scaleY: 1,
        transformOrigin: "top left",
      });
      gsap.set(band, { scaleX: 0, scaleY: 0, transformOrigin: "top left" });
      gsap.set(counter, { autoAlpha: 1 });
      gsap.set(counterText, { yPercent: 0, opacity: 1 });
      counterText.textContent = "0";

      const tl = gsap.timeline({
        onComplete: finishLandingIntro,
      });

      tl.to(count, {
        value: 100,
        duration: 1.08,
        ease: "power2.out",
        snap: { value: 1 },
        onUpdate: () => {
          counterText.textContent = Math.round(count.value).toString();
        },
      })
        .to(counterText, {
          yPercent: -115,
          opacity: 0,
          duration: 0.42,
          ease: "power3.in",
        })
        .call(revealHeroOnce, [], "<0.12")
        .to(
          wipe,
          {
            value: 1,
            duration: 1.55,
            ease: "none",
            onStart: revealHeroOnce,
            onUpdate: renderLandingWipe,
          },
          "<"
        );

      timelineRef.current = tl;
    };

    frameRequest = requestAnimationFrame(startLandingIntro);

    return () => {
      cancelled = true;
      cancelAnimationFrame(frameRequest);
    };
  }, [
    clearOutgoingSnapshot,
    hideStage,
    killTimeline,
    lockViewport,
    pathname,
    revealHomePage,
    setBandFrame,
    unlockViewport,
  ]);

  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }

      const target = event.target;

      if (!(target instanceof Element)) {
        return;
      }

      const anchor = target.closest<HTMLAnchorElement>(
        "a[data-transition-link='true']"
      );

      if (
        !anchor ||
        anchor.hasAttribute("download") ||
        (anchor.target && anchor.target !== "_self")
      ) {
        return;
      }

      const url = new URL(anchor.href, window.location.href);

      if (url.origin !== window.location.origin) {
        return;
      }

      event.preventDefault();
      navigateTo(`${url.pathname}${url.search}${url.hash}`);
    };

    document.addEventListener("click", handleDocumentClick, true);

    return () => {
      document.removeEventListener("click", handleDocumentClick, true);
    };
  }, [navigateTo]);

  const registerPageRef = useCallback(
    (el: HTMLDivElement | null) => {
      pageRef.current = el;

      if (el && awaitingRevealRef.current) {
        incomingPageReadyRef.current = true;

        const latestRevealFrame = latestRevealFrameRef.current;

        if (latestRevealFrame) {
          setIncomingPageFrame(
            el,
            latestRevealFrame.metrics,
            latestRevealFrame.frame,
            latestRevealFrame.progress
          );
        }

        requestAnimationFrame(() => {
          if (awaitingRevealRef.current && pageRef.current === el) {
            revealIncomingPage();
          }
        });
      }
    },
    [revealIncomingPage, setIncomingPageFrame]
  );

  const registerStageRef = useCallback((el: HTMLDivElement | null) => {
    stageRef.current = el;
  }, []);

  const registerSnapshotRef = useCallback((el: HTMLDivElement | null) => {
    snapshotRef.current = el;
  }, []);

  const registerSheetRef = useCallback((el: HTMLDivElement | null) => {
    sheetRef.current = el;
  }, []);

  const registerTopCurtainRef = useCallback((el: HTMLDivElement | null) => {
    topCurtainRef.current = el;
  }, []);

  const registerBandRef = useCallback((el: HTMLDivElement | null) => {
    bandRef.current = el;
  }, []);

  const registerBottomCurtainRef = useCallback((el: HTMLDivElement | null) => {
    bottomCurtainRef.current = el;
  }, []);

  const registerCounterRef = useCallback((el: HTMLDivElement | null) => {
    counterRef.current = el;
  }, []);

  const registerCounterTextRef = useCallback(
    (el: HTMLParagraphElement | null) => {
      counterTextRef.current = el;
    },
    []
  );

  useEffect(() => {
    if (!isAnimating || !awaitingRevealRef.current || !pageRef.current) {
      return;
    }

    requestAnimationFrame(() => {
      if (awaitingRevealRef.current && pageRef.current) {
        revealIncomingPage();
      }
    });
  }, [isAnimating, pathname, revealIncomingPage]);

  useEffect(
    () => () => {
      killTimeline();
      unlockViewport();
    },
    [killTimeline, unlockViewport]
  );

  return (
    <TransitionCtx.Provider
      value={{
        navigateTo,
        isAnimating,
        isLandingIntroActive,
        registerPageRef,
        registerStageRef,
        registerSnapshotRef,
        registerSheetRef,
        registerTopCurtainRef,
        registerBandRef,
        registerBottomCurtainRef,
        registerCounterRef,
        registerCounterTextRef,
      }}
    >
      {children}
    </TransitionCtx.Provider>
  );
}
