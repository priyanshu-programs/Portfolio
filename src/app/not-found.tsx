"use client";

import PageWrapper from "@/components/transition/PageWrapper";
import TopNav from "@/components/ui/TopNav";
import NotFoundStage from "@/components/sections/NotFoundStage";
import { useSiteContent } from "@/components/ContentProvider";

const DEFAULT_NAME = "Priyanshu Roy";

/**
 * Root 404. Catches unknown routes and missing case-study slugs alike — the
 * latter via `notFound()` in `work/[slug]/page.tsx`.
 *
 * Rendered inside the root layout, so Lenis, FollowCursor, FloatingMenu and
 * RouteLoadingOverlay all mount for free. Only SiteFooter needs suppressing,
 * which NotFoundStage handles by raising `html.is-404`.
 *
 * ── REACHED BY A FULL DOCUMENT LOAD, NOT A SOFT NAVIGATION ───────────────
 * Next's client router fetches the RSC payload for the unknown route, sees the
 * non-200, and bails to an MPA navigation — `location.assign`, verified in
 * next/dist/client/components/router-reducer/fetch-server-response.js and
 * app-router.js. Three consequences worth knowing before editing this page:
 *
 *   - `pr-page-reveal` does NOT run on arrival here from a typed URL. The view
 *     transition only wraps client-router navigations. NotFoundStage's 0.1s
 *     entrance offset is clearing an animation that isn't there on that path;
 *     it still earns its keep when this renders for a `notFound()` reached
 *     through a SmartLink, which IS a soft navigation.
 *   - Pressing Back from here is a cross-document traversal, so nothing in
 *     React unmounts and NotFoundStage's `html.is-404` cleanup never runs. That
 *     is harmless — the class lives on the 404's own document, which is gone.
 *   - The page returned to comes back via bfcache, where no effect re-runs.
 *     `useMediaQuery` re-syncs on `pageshow` for exactly this reason; without
 *     it the restored homepage forks its layout on a stale breakpoint value.
 *
 * The nav is composed here rather than inside the stage, matching how /about
 * and /contact host theirs. The stage is cream at every breakpoint, so a
 * difference blend would invert against nothing — flat ink is what stays
 * legible.
 *
 * PageWrapper is not optional: FloatingMenu queries `.page-wrapper` directly to
 * translate the page when the menu opens, and silently does nothing without it.
 *
 * No sibling `loading.tsx` — RouteLoadingOverlay records why route-level loading
 * files were removed: committing to a Suspense fallback lands the 0.9s
 * `pr-page-reveal` on the loader instead of the page.
 */
export default function NotFound() {
  const content = useSiteContent();
  const name = content?.settings?.name ?? DEFAULT_NAME;

  return (
    <PageWrapper>
      <main className="page relative">
        <div className="absolute inset-x-0 top-0 z-40 text-nav-ink mix-blend-normal">
          <TopNav name={name} variant="simple" blend={false} />
        </div>

        <NotFoundStage />
      </main>
    </PageWrapper>
  );
}
