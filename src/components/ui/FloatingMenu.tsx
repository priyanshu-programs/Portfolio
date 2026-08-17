"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import gsap from "gsap";
import Link from "@/components/transition/SmartLink";
import { useSiteContent } from "@/components/ContentProvider";

const DEFAULT_NAME = "Priyanshu Roy";
const DEFAULT_EMAIL = "priyanshuroy.official19@gmail.com";

const MENU_LINKS = [
  { label: "Home", href: "/" },
  { label: "Work", href: "/work", image: "/images/menu-work.webp" },
  { label: "About", href: "/about", image: "/images/menu-about.webp" },
  { label: "Contact", href: "/contact", image: "/images/menu-contact.webp" },
];

const MENU_TAGS = ["Identity", "Visualisation", "Interactive"];

const RevealLine = ({ children }: { children: ReactNode }) => (
  <span className="block overflow-hidden pb-6 -mb-6">
    <span className="menu-reveal-line block will-change-transform">
      {children}
    </span>
  </span>
);

export default function FloatingMenu() {
  const content = useSiteContent();
  const settings = content?.settings;
  const fm = content?.floatingMenu;
  const name = settings?.name ?? DEFAULT_NAME;
  const email = settings?.email ?? DEFAULT_EMAIL;
  const tags = fm?.tags?.length ? fm.tags : MENU_TAGS;
  const menuImage = "/images/menu-home.webp";

  const [isVisible, setIsVisible] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [hoveredLabel, setHoveredLabel] = useState<string | null>(null);
  const hoveredLink = MENU_LINKS.find((item) => item.label === hoveredLabel);
  const activeImage = hoveredLink?.image ?? menuImage;

  const [imageQueue, setImageQueue] = useState<{ id: string; src: string }[]>([
    { id: activeImage, src: activeImage },
  ]);

  useEffect(() => {
    setImageQueue((prev) => {
      if (prev[prev.length - 1].src === activeImage) return prev;
      return [...prev, { id: activeImage + Date.now(), src: activeImage }];
    });
  }, [activeImage]);

  const handleAnimationEnd = useCallback((id: string) => {
    setImageQueue((prev) => {
      const index = prev.findIndex((img) => img.id === id);
      if (index > 0) return prev.slice(index);
      return prev;
    });
  }, []);
  const pathname = usePathname();
  const overlayRef = useRef<HTMLDivElement>(null);
  const overlayContentRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const isAnimatingRef = useRef(false);
  const previousPathnameRef = useRef(pathname);

  const getPageWrapper = () =>
    document.querySelector<HTMLElement>(".page-wrapper");

  const resetMenu = useCallback(() => {
    const lines =
      overlayContentRef.current?.querySelectorAll<HTMLElement>(
        ".menu-reveal-line"
      ) ?? [];

    gsap.set(overlayRef.current, {
      autoAlpha: 0,
      clipPath: "inset(0% 0% 100% 0%)",
    });
    gsap.set(overlayContentRef.current, { y: -56 });
    gsap.set(mediaRef.current, { opacity: 0, y: 36 });
    gsap.set(lines, { yPercent: -110, opacity: 0 });
  }, []);

  const closeMenu = useCallback(
    (immediate = false) => {
      timelineRef.current?.kill();
      setIsOpen(false);

      const pageWrapper = getPageWrapper();
      const lines =
        overlayContentRef.current?.querySelectorAll<HTMLElement>(
          ".menu-reveal-line"
        ) ?? [];

      if (immediate) {
        isAnimatingRef.current = false;
        gsap.set(pageWrapper, { clearProps: "transform" });
        resetMenu();
        window.__lenis?.start();
        return;
      }

      isAnimatingRef.current = true;

      timelineRef.current = gsap
        .timeline({
          defaults: { ease: "power3.inOut" },
          onComplete: () => {
            resetMenu();
            gsap.set(pageWrapper, { clearProps: "transform" });
            isAnimatingRef.current = false;
            window.__lenis?.start();
          },
        })
        .to(
          lines,
          {
            yPercent: -110,
            opacity: 0,
            duration: 0.38,
            stagger: 0.025,
          },
          0
        )
        .to(mediaRef.current, { opacity: 0, y: 24, duration: 0.34 }, 0)
        .to(pageWrapper, { y: 0, duration: 0.72 }, 0.08)
        .to(
          overlayContentRef.current,
          { y: -56, duration: 0.72 },
          0.08
        )
        .to(
          overlayRef.current,
          {
            clipPath: "inset(0% 0% 100% 0%)",
            duration: 0.72,
          },
          0.08
        );
    },
    [resetMenu]
  );

  const openMenu = useCallback(() => {
    if (isAnimatingRef.current) return;

    timelineRef.current?.kill();
    setIsOpen(true);
    setIsVisible(true);
    window.__lenis?.stop();

    const pageWrapper = getPageWrapper();
    const lines =
      overlayContentRef.current?.querySelectorAll<HTMLElement>(
        ".menu-reveal-line"
      ) ?? [];
    const pushDistance = window.matchMedia("(max-width: 767px)").matches
      ? 44
      : 76;

    isAnimatingRef.current = true;
    gsap.set(overlayRef.current, {
      autoAlpha: 1,
      clipPath: "inset(0% 0% 100% 0%)",
    });
    gsap.set(overlayContentRef.current, { y: -56 });
    gsap.set(mediaRef.current, { opacity: 0, y: 36 });
    gsap.set(lines, { yPercent: -110, opacity: 0 });

    timelineRef.current = gsap
      .timeline({
        defaults: { ease: "power3.inOut" },
        onComplete: () => {
          isAnimatingRef.current = false;
        },
      })
      .to(pageWrapper, { y: pushDistance, duration: 0.82 }, 0)
      .to(
        overlayRef.current,
        {
          clipPath: "inset(0% 0% 0% 0%)",
          duration: 0.82,
        },
        0
      )
      .to(overlayContentRef.current, { y: 0, duration: 0.82 }, 0)
      .to(
        mediaRef.current,
        {
          opacity: 1,
          y: 0,
          duration: 0.62,
          ease: "power3.out",
        },
        0.26
      )
      .to(
        lines,
        {
          yPercent: 0,
          opacity: 1,
          duration: 0.62,
          stagger: 0.045,
          ease: "power3.out",
        },
        0.24
      );
  }, []);

  const toggleMenu = () => {
    if (isAnimatingRef.current) return;
    if (isOpen) {
      closeMenu();
      return;
    }

    openMenu();
  };

  useEffect(() => {
    const handleScroll = () => {
      if (isOpen || window.scrollY > 100) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    // Check initial position
    handleScroll();

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isOpen, pathname]);

  useEffect(() => {
    resetMenu();

    return () => {
      timelineRef.current?.kill();
      gsap.set(getPageWrapper(), { clearProps: "transform" });
      window.__lenis?.start();
    };
  }, [resetMenu]);

  useEffect(() => {
    if (previousPathnameRef.current === pathname) return;

    previousPathnameRef.current = pathname;

    if (!isOpen) return;

    const frame = window.requestAnimationFrame(() => closeMenu(true));
    return () => window.cancelAnimationFrame(frame);
  }, [closeMenu, isOpen, pathname]);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeMenu();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [closeMenu, isOpen]);

  return (
    <>
      <div
        id="site-menu-overlay"
        ref={overlayRef}
        role="dialog"
        aria-modal={isOpen}
        aria-hidden={!isOpen}
        data-lenis-prevent
        className={`fixed inset-0 z-[10000] overflow-hidden bg-[#050505] text-white ${isOpen ? "pointer-events-auto" : "pointer-events-none"
          }`}
        style={{
          opacity: 0,
          visibility: "hidden",
          clipPath: "inset(0% 0% 100% 0%)",
        }}
      >
        <div
          ref={overlayContentRef}
          className="relative flex h-full w-full flex-col md:flex-row overflow-y-auto md:overflow-hidden"
        >
          {/* Left Column: Image */}
          <div
            ref={mediaRef}
            className="relative hidden md:block w-[45vw] h-full shrink-0 overflow-hidden"
          >
            {imageQueue.map((img, i) => (
              <Image
                key={img.id}
                src={img.src}
                alt="Priyanshu Roy working across identity and web"
                fill
                sizes="45vw"
                className={`object-cover ${
                  i === imageQueue.length - 1 && imageQueue.length > 1
                    ? "animate-menu-image-reveal"
                    : "z-[1]"
                }`}
                onAnimationEnd={() => handleAnimationEnd(img.id)}
              />
            ))}
            <div className="absolute left-10 top-[39.6px] text-[20px] font-light tracking-[-0.01em] text-white pointer-events-none mix-blend-difference z-[4]">
              {name}
            </div>
          </div>

          {/* Right Column: Content */}
          <div className="relative flex-1 flex flex-col justify-between px-6 pb-8 pt-[104px] sm:px-8 md:px-[8vw] md:pb-[32px] md:pt-[132px] md:overflow-y-auto">
            {/* Mobile Title */}
            <div className="pointer-events-none absolute left-6 top-[28.8px] text-[20px] font-light tracking-[-0.01em] text-white mix-blend-difference z-[4] md:hidden">
              {name}
            </div>

            <div className="flex flex-1 items-center w-full">
              <div className="flex w-full flex-col md:flex-row md:items-end justify-between gap-12 md:gap-8">
                <nav aria-label="Main menu">
                  <ul className="space-y-1">
                    {MENU_LINKS.map((item) => {
                      const isActive = item.label !== "Home" && (pathname === item.href || pathname === item.href.replace("/#", "#"));
                      return (
                        <li key={item.label}>
                          <RevealLine>
                            <Link
                              href={item.href}
                              onClick={() => closeMenu()}
                              onMouseEnter={() => setHoveredLabel(item.label)}
                              onMouseLeave={() => setHoveredLabel(null)}
                              className="relative group inline-block text-[clamp(46px,7vw,90px)] font-light leading-[1.05] tracking-normal"
                            >
                              {item.label}
                              <span className={`absolute left-0 bottom-[-4px] w-full h-[1.5px] bg-current origin-left transition-transform duration-300 ease-out ${isActive ? "scale-x-100" : "scale-x-0 group-hover:scale-x-100"
                                }`} />
                            </Link>
                          </RevealLine>
                        </li>
                      );
                    })}
                  </ul>
                </nav>

                <div className="self-start md:self-end md:mb-4">
                  <div className="space-y-[6px] text-[clamp(18px,1.8vw,24px)] font-light italic leading-tight text-white/80">
                    {tags.map((tag) => (
                      <RevealLine key={tag}>{tag}</RevealLine>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-5 pt-12 text-[15px] leading-[1.35] text-white/50 w-full">
              <div>
                <RevealLine>India</RevealLine>
              </div>
              <div className="sm:text-right">
                <RevealLine>Available worldwide</RevealLine>
                <RevealLine>
                  <a
                    href={`mailto:${email}`}
                    className="transition-colors hover:text-white"
                  >
                    {email}
                  </a>
                </RevealLine>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div
        className={`fixed right-6 top-[21.6px] z-[10020] flex items-center gap-4 transition-all duration-300 ease-in-out md:right-[40px] md:top-[39.6px] ${isVisible || isOpen
          ? "pointer-events-auto translate-y-0 opacity-100"
          : "pointer-events-none -translate-y-4 opacity-0"
          }`}
      >
        <div className={`hidden md:block transition-opacity duration-300 ${isOpen ? "opacity-100" : "opacity-0 pointer-events-none"}`}>
          <Link
            href="/contact"
            onClick={() => closeMenu()}
            className="flex h-[56px] md:h-[60px] items-center justify-center rounded-full border border-white/20 px-8 text-[15px] text-white transition-all hover:scale-105"
          >
            Get in touch
          </Link>
        </div>

        <button
          type="button"
          aria-label={isOpen ? "Close menu" : "Open menu"}
          aria-controls="site-menu-overlay"
          aria-expanded={isOpen}
          onClick={toggleMenu}
          className={`relative flex h-[56px] w-[56px] cursor-pointer items-center justify-center rounded-full shadow-md transition-all duration-300 active:scale-95 md:h-[60px] md:w-[60px] ${isOpen
            ? "bg-white text-black hover:scale-105"
            : "bg-[#1a1a1a] text-white hover:scale-105"
            }`}
        >
          <span
            className={`absolute h-[1.5px] w-5 rounded-full bg-current transition-transform duration-300 ${isOpen ? "translate-y-0 rotate-45" : "-translate-y-[4px]"
              }`}
          />
          <span
            className={`absolute h-[1.5px] w-5 rounded-full bg-current transition-transform duration-300 ${isOpen ? "translate-y-0 -rotate-45" : "translate-y-[4px]"
              }`}
          />
        </button>
      </div>
    </>
  );
}
