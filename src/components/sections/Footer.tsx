"use client";

import { useEffect, useRef, useState } from "react";
import Link from "@/components/transition/SmartLink";
import { useSiteContent } from "@/components/ContentProvider";
import ShaderSignatureText from "@/components/ui/ShaderSignatureText";

const NAV_LINKS = [
  { label: "Work", href: "/work" },
  { label: "About", href: "/about" },
  { label: "Services", href: "/#services" },
  { label: "Contact", href: "/contact" },
];

const SOCIALS = [
  { label: "Instagram", href: "#" },
  { label: "Twitter", href: "#" },
  { label: "Linkedin", href: "#" },
];

const DEFAULT_TIMEZONE = "IST — UTC +5:30";
const DEFAULT_EMAIL = "priyanshuroy.official19@gmail.com";
const DEFAULT_NAME = "Priyanshu Roy";

const SIGNATURE_BASE_SIZE = 100;
const SIGNATURE_SAFETY = 0.98;
const SIGNATURE_MIN_SIZE = 48;
const SIGNATURE_MAX_SIZE = 252;

export default function Footer() {
  const settings = useSiteContent()?.settings;
  const navLinks = (settings?.navLinks?.length ? settings.navLinks : NAV_LINKS).map(
    (link) =>
      link.label.trim().toLowerCase() === "contact"
        ? { ...link, href: "/contact" }
        : link,
  );
  const socials = settings?.socials?.length ? settings.socials : SOCIALS;
  const timezone = settings?.timezone ?? DEFAULT_TIMEZONE;
  const email = settings?.email ?? DEFAULT_EMAIL;
  const name = settings?.name ?? DEFAULT_NAME;

  const signatureAreaRef = useRef<HTMLDivElement>(null);
  const signatureMeasureRef = useRef<HTMLSpanElement>(null);
  const [signatureSize, setSignatureSize] = useState<number | null>(null);

  useEffect(() => {
    const area = signatureAreaRef.current;
    const measure = signatureMeasureRef.current;
    if (!area || !measure) return;

    const update = () => {
      const styles = window.getComputedStyle(area);
      const paddingX =
        Number.parseFloat(styles.paddingLeft) +
        Number.parseFloat(styles.paddingRight);
      const available = area.clientWidth - paddingX;
      const naturalWidth = measure.getBoundingClientRect().width;
      if (!available || !naturalWidth) return;

      const fitted =
        ((available * SIGNATURE_SAFETY) / naturalWidth) * SIGNATURE_BASE_SIZE;
      setSignatureSize(
        Math.min(SIGNATURE_MAX_SIZE, Math.max(SIGNATURE_MIN_SIZE, fitted)),
      );
    };

    update();

    const observer = new ResizeObserver(update);
    observer.observe(area);
    document.fonts?.ready.then(update);

    return () => observer.disconnect();
  }, [name]);

  return (
    <footer className="relative w-full bg-cream overflow-hidden min-h-[520px] lg:h-screen flex flex-col">
      {/* Dark card — sits at top, fixed padding matches hero nav spacing */}
      <div className="px-4 sm:px-6 lg:px-[26px] pt-[26px] shrink-0">
        <div className="bg-ink text-white rounded-sm w-full px-6 md:px-10 py-6 md:py-7 lg:h-[50vh] flex flex-col justify-between font-[150]">
          {/* Top section: Nav and Socials aligned to the left */}
          <div className="flex gap-x-20 sm:gap-x-32 text-[22px]">
            {/* Column 1: nav */}
            <ul className="space-y-1">
              {navLinks.map((l) => (
                <li key={l.label}>
                  <Link href={l.href} className="hover:opacity-70 transition-opacity">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>

            {/* Column 2: socials */}
            <ul className="space-y-1">
              {socials.map((l) => (
                <li key={l.label}>
                  <a
                    href={l.href}
                    target="_blank"
                    rel="noreferrer"
                    className="hover:opacity-70 transition-opacity"
                  >
                    {l.label}
                  </a>
                </li>
              ))}
            </ul>
          </div>

          {/* Bottom section: Timezone on the left, email on the right */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end mt-16 gap-y-6">
            <div className="text-left">
              <p className="text-[18px] text-muted uppercase tracking-wider mb-3">
                Timezone
              </p>
              <p className="text-[22px]">{timezone}</p>
            </div>
            <a
              href={`mailto:${email}`}
              className="text-[22px] hover:opacity-70 transition-opacity"
            >
              {email}
            </a>
          </div>
        </div>
      </div>

      {/* Script name — grows to fill remaining height. Horizontal padding
          matches the dark card wrapper above so the signature fits between
          the card's left/right margins at every viewport width. */}
      <div
        ref={signatureAreaRef}
        className="relative flex-1 no-overflow px-4 sm:px-6 lg:px-[26px]"
      >
        <ShaderSignatureText
          text={name}
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 whitespace-nowrap font-script leading-none select-none"
          style={{
            fontSize: signatureSize ?? "clamp(112px, 24vw, 252px)",
          }}
        />
        <span
          ref={signatureMeasureRef}
          aria-hidden
          className="pointer-events-none invisible absolute select-none whitespace-nowrap font-script leading-none"
          style={{ fontSize: SIGNATURE_BASE_SIZE }}
        >
          {name}
        </span>
      </div>
    </footer>
  );
}
