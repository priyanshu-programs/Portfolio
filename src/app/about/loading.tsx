import KineticLoader from "@/components/ui/KineticLoader";

/**
 * Suspense fallback for /about.
 *
 * Without a loading boundary the view transition has nothing to swap to, so
 * `startViewTransition` holds a frozen snapshot of the *outgoing* page until
 * the route commits — which reads as the browser hanging rather than as a
 * page loading. This gives the transition a real frame to reveal.
 *
 * Cream, because AboutStage is cream at every breakpoint; a white fallback
 * would flash before the page paints.
 */
export default function AboutLoading() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-cream">
      <KineticLoader text="LOADING • LOADING • LOADING • " />
      <span className="sr-only" role="status">
        Loading
      </span>
    </div>
  );
}
