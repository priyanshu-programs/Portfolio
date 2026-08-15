"use client";

import NextLink from "next/link";
import { Link as ViewTransitionLink } from "next-view-transitions";
import { usePathname } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";
import type Lenis from "lenis";

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

type LinkProps = ComponentProps<typeof NextLink>;

/**
 * Drop-in replacement for `next/link` that plays the view-transition reveal
 * only for real route changes. Same-page hash/anchor clicks (e.g. `/#contact`
 * while already on `/`) scroll to the target via Lenis instead of routing —
 * Lenis virtualizes scroll, so a native/`next/link` anchor jump never actually
 * moves the page.
 *
 * Props (including `ref`, `onMouseMove`, `className`, `style`) pass straight
 * through to the underlying link.
 */
export default function SmartLink({ href, onClick, ...props }: LinkProps) {
  const pathname = usePathname();
  const hrefStr = typeof href === "string" ? href : "";
  const [targetPath, hash] = hrefStr.split("#");
  const isRouteChange = hrefStr.startsWith("/") && (targetPath || "/") !== pathname;
  const isSamePageHash = !isRouteChange && !!hash;

  const handleHashClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;

    const target = document.getElementById(hash);
    if (!target) return;

    event.preventDefault();
    window.history.pushState(null, "", `${window.location.pathname}${window.location.search}#${hash}`);

    if (window.__lenis) {
      window.__lenis.scrollTo(target, { offset: 0 });
    } else {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  if (isSamePageHash) {
    return <NextLink href={href} onClick={handleHashClick} {...props} />;
  }

  const Cmp = isRouteChange ? ViewTransitionLink : NextLink;

  return <Cmp href={href} onClick={onClick} {...props} />;
}
