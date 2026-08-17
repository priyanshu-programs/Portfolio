"use client";

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

export default function Footer() {
  const settings = useSiteContent()?.settings;
  const navLinks = settings?.navLinks?.length ? settings.navLinks : NAV_LINKS;
  const socials = settings?.socials?.length ? settings.socials : SOCIALS;
  const timezone = settings?.timezone ?? DEFAULT_TIMEZONE;
  const email = settings?.email ?? DEFAULT_EMAIL;
  const name = settings?.name ?? DEFAULT_NAME;

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

      {/* Script name — grows to fill remaining height */}
      <div className="relative flex-1 no-overflow">
        <ShaderSignatureText
          text={name}
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 whitespace-nowrap font-script leading-none select-none"
          style={{ fontSize: "clamp(112px, 24vw, 252px)" }}
        />
      </div>
    </footer>
  );
}
