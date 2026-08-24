"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";
import type Lenis from "lenis";
import { beginRouteLoading } from "@/lib/routeLoading";

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

  /**
   * Announce the pending navigation so `RouteLoadingOverlay` can show the
   * progress bar if the route turns out to be slow.
   *
   * The handler stays on the standard Next link so React remains the only
   * owner of the route subtree during navigation.
   */
  const handleRouteClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onClick?.(event);
    if (event.defaultPrevented) return;
    // Modifier and middle clicks open a new tab; this page never navigates.
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    if (event.button !== 0) return;
    beginRouteLoading(targetPath || "/");
  };

  if (isSamePageHash) {
    return <NextLink href={href} onClick={handleHashClick} {...props} />;
  }

  if (isRouteChange) {
    return <NextLink href={href} onClick={handleRouteClick} {...props} />;
  }

  return <NextLink href={href} onClick={onClick} {...props} />;
}
