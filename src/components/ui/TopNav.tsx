"use client";

import { forwardRef } from "react";
import Link from "@/components/transition/SmartLink";
import { NAV_LINKS } from "@/lib/nav";

type TopNavProps = {
  name: string;
  variant: "hero" | "simple";
  className?: string;
  /**
   * Explicit ink. Ignored while `blend` is on, since difference blend derives
   * the colour from the backdrop. Omitted with `blend` off, the nav inherits
   * `currentColor` from its container — which is how case studies pass
   * `--cs-ink` down without threading a value through.
   */
  color?: string;
  /**
   * Invert the backdrop rather than paint a colour. On by default: over the
   * hero imagery that is the only thing that stays legible. Case studies turn
   * it off so the nav matches the ink the editor picked.
   */
  blend?: boolean;
};

const TopNav = forwardRef<HTMLElement, TopNavProps>(function TopNav(
  { name, variant, className, color, blend = true },
  ref
) {
  const inkClass = blend ? "text-white mix-blend-difference" : "";
  const inkStyle = blend ? undefined : { color: color ?? "currentColor" };

  if (variant === "hero") {
    return (
      <nav
        ref={ref}
        className={`relative z-30 flex items-center justify-between px-6 md:px-[40px] pt-[28.8px] md:pt-[39.6px] text-[19.36px] ${inkClass} ${className ?? ""}`}
        style={{ fontWeight: 363, letterSpacing: "-0.01em", ...inkStyle }}
      >
        <span style={{ fontWeight: 363, letterSpacing: "-0.01em" }}>
          © {name}
        </span>
        <ul
          className="flex items-center gap-8 md:gap-[76px]"
          style={{ fontWeight: 363, letterSpacing: "-0.01em" }}
        >
          {NAV_LINKS.map((item) => (
            <li key={item.label}>
              <Link
                href={item.href}
                className="magnetic-hover inline-block py-1 transition-opacity duration-300 hover:opacity-70"
                style={{ fontWeight: 363, letterSpacing: "-0.01em" }}
              >
                {item.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    );
  }

  return (
    <header
      ref={ref}
      className={`relative z-30 flex w-full items-center justify-between px-6 md:px-[40px] pt-[28.8px] md:pt-[39.6px] ${inkClass} ${className ?? ""}`}
      style={inkStyle}
    >
      <Link
        href="/"
        className="inline-block py-1 text-[19.36px] transition-opacity duration-300 hover:opacity-70"
        style={{ fontWeight: 363, letterSpacing: "-0.01em" }}
      >
        © {name}
      </Link>

      <nav
        className="flex items-center gap-8 md:gap-[76px] text-[19.36px]"
        style={{ fontWeight: 363, letterSpacing: "-0.01em" }}
      >
        {NAV_LINKS.map(({ label, href }) => (
          <Link
            key={label}
            href={href}
            className="py-1 transition-opacity duration-300 hover:opacity-70"
          >
            {label}
          </Link>
        ))}
      </nav>
    </header>
  );
});

export default TopNav;
