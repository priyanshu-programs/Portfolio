"use client";

import NextLink from "next/link";
import { usePathname } from "next/navigation";
import type { ComponentProps, MouseEvent } from "react";
import type Lenis from "lenis";
import { beginRouteLoading } from "@/lib/routeLoading";
import { playSound, type SoundName } from "@/lib/soundBus";

declare global {
  interface Window {
    __lenis?: Lenis;
  }
}

type LinkProps = ComponentProps<typeof NextLink> & {
  /**
   * Which clip this link plays when it navigates. Defaults to the generic
   * `nav-click`; callers override it where the destination deserves its own
   * voice — work cards use `projects-click`. Stripped before the props reach
   * `next/link`, which would otherwise pass it through to the DOM as an
   * unknown attribute.
   */
  sound?: SoundName;
};

/**
 * Drop-in replacement for `next/link` with two behaviours of its own.
 *
 * Same-page hash/anchor clicks (e.g. `/#contact` while already on `/`) scroll
 * to the target via Lenis instead of routing — Lenis virtualizes scroll, so a
 * native/`next/link` anchor jump never actually moves the page.
 *
 * Real route changes announce themselves to `RouteLoadingOverlay` before
 * navigating, so a slow route gets a progress bar. That announcement is the
 * only thing separating them from the plain fallthrough case — keep the two
 * branches distinct even though they now render the same component.
 *
 * Props (including `ref`, `onMouseMove`, `className`, `style`) pass straight
 * through to the underlying link.
 */
export default function SmartLink({
  href,
  onClick,
  sound = "nav-click",
  ...props
}: LinkProps) {
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

    // After the `!target` bail: a hash pointing at nothing scrolls nowhere, and
    // a click that does nothing must not sound like it did something.
    playSound(sound);

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
   * progress bar if the route turns out to be slow, and sound the click.
   *
   * `onNavigate` rather than `onClick`, because both effects must fire only when
   * a client-side navigation actually happens. Next runs this handler solely for
   * same-origin SPA navigations, which is exactly the condition we want and
   * strictly wider than the modifier/button checks this used to hand-roll:
   * Cmd/Ctrl-click (opens a new tab), external URLs and `download` links all
   * skip it natively. Under the old `onClick` those last two still fired, so a
   * download link would sound a navigation and raise a loading bar for a page
   * change that never came.
   *
   * `preventDefault()` on the passed event cancels the navigation, so a caller
   * that cancels via `onClick` still lands ahead of this — Next checks the click
   * event first and never reaches `onNavigate`.
   *
   * One call covers every internal link on the site: the menu's nav links, its
   * "Get in touch" pill, the homepage work rows and the /work cards all render
   * through this component.
   */
  const handleNavigate = () => {
    playSound(sound);
    beginRouteLoading(targetPath || "/");
  };

  if (isSamePageHash) {
    return <NextLink href={href} onClick={handleHashClick} {...props} />;
  }

  if (isRouteChange) {
    return (
      <NextLink
        href={href}
        onClick={onClick}
        onNavigate={handleNavigate}
        {...props}
      />
    );
  }

  return <NextLink href={href} onClick={onClick} {...props} />;
}
