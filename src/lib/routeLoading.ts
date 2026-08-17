/**
 * Navigation-pending pub/sub, shared between `SmartLink` (publisher) and
 * `RouteLoadingOverlay` (subscriber).
 */

/**
 * Module scope rather than React state, for the same reason the timers in
 * `caseStudyAdvance.ts` live at module scope: the component that publishes a
 * pending navigation is unmounted by the navigation it just started.
 */

type Listener = (href: string | null) => void;

let pendingHref: string | null = null;
let pendingStartedAt = 0;
const listeners = new Set<Listener>();

export function beginRouteLoading(href: string): void {
  pendingHref = href;
  pendingStartedAt = typeof performance !== "undefined" ? performance.now() : Date.now();
  listeners.forEach((listener) => listener(href));
}

/** Idempotent — several independent safety nets may call this for one navigation. */
export function endRouteLoading(): void {
  if (pendingHref === null) return;
  pendingHref = null;
  listeners.forEach((listener) => listener(null));
}

export function getPendingHref(): string | null {
  return pendingHref;
}

export function getPendingStartedAt(): number {
  return pendingStartedAt;
}

export function subscribeRouteLoading(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
