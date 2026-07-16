"use client";

import TransitionLink from "@/components/transition/TransitionLink";

const NAV_LINKS = [
  { label: "Work", href: "/work" },
  { label: "About", href: "/#about" },
  { label: "Services", href: "/#services" },
  { label: "Contact", href: "/#contact" },
];

const SOCIALS = [
  { label: "Instagram", href: "#" },
  { label: "Twitter", href: "#" },
  { label: "Linkedin", href: "#" },
];

export default function Footer() {
  return (
    <footer className="relative w-full bg-cream overflow-hidden min-h-[520px] lg:h-screen flex flex-col">
      {/* Dark card — sits at top, fixed padding matches hero nav spacing */}
      <div className="px-4 sm:px-6 lg:px-[26px] pt-[26px] shrink-0">
        <div className="bg-ink text-white rounded-sm w-full px-6 md:px-10 py-6 md:py-7 lg:h-[50vh] flex flex-col justify-between font-[150]">
          {/* Top section: Nav and Socials aligned to the left */}
          <div className="flex gap-x-20 sm:gap-x-32 text-[22px]">
            {/* Column 1: nav */}
            <ul className="space-y-1">
              {NAV_LINKS.map((l) => (
                <li key={l.label}>
                  <TransitionLink href={l.href} className="hover:opacity-70 transition-opacity">
                    {l.label}
                  </TransitionLink>
                </li>
              ))}
            </ul>

            {/* Column 2: socials */}
            <ul className="space-y-1">
              {SOCIALS.map((l) => (
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
              <p className="text-[22px]">IST — UTC +5:30</p>
            </div>
            <a
              href="mailto:priyanshuroy.official19@gmail.com"
              className="text-[22px] hover:opacity-70 transition-opacity"
            >
              priyanshuroy.official19@gmail.com
            </a>
          </div>
        </div>
      </div>

      {/* Script name — grows to fill remaining height */}
      <div className="relative flex-1 no-overflow">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 whitespace-nowrap font-script text-white mix-blend-difference leading-none select-none"
          style={{ fontSize: "clamp(112px, 24vw, 252px)" }}
        >
          Priyanshu Roy
        </div>
      </div>
    </footer>
  );
}
