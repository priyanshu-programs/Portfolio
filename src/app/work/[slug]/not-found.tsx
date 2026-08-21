import Link from "next/link";

/**
 * 404 boundary for a case-study slug that does not resolve.
 *
 * The root `not-found.tsx` only catches URLs matching no route at all. A
 * `notFound()` thrown *inside* this segment (page.tsx, when Sanity has no
 * project for the slug) resolves against the nearest boundary in its own
 * segment, so without this file Next serves its built-in minimal 404 rather
 * than climbing to the root.
 *
 * -- Why this is static, unlike the root 404 --------------------------------
 * Rendering ANY client component from this boundary makes the segment's
 * `notFound()` surface as an unhandled NEXT_HTTP_ERROR_FALLBACK;404 instead of
 * rendering here -- verified on Next 16.2.6 in both dev and production, and
 * with a component as trivial as a `"use client"` div, so it is not something
 * in NotFoundStage specifically. That rules out the animated stage (GSAP needs
 * the client), TopNav, and SmartLink (it calls usePathname), hence the plain
 * next/link and the absent nav.
 *
 * The result is the same composition as the animated 404 -- same ghosted
 * numeral, same ink, same cream, same voice -- held at its rest state. The
 * `.nf-*` classes are shared with NotFoundStage so the two stay in visual sync;
 * only the entrance and the ambient drift are absent. Those classes carry armed
 * start states for the animated page, so everything here is returned to rest
 * with `.nf-static`.
 */
export default function CaseStudyNotFound() {
  return (
    <div className="page-wrapper">
      <main className="page">
        <section className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-hidden bg-[#FFFCFA] px-6">
          <div className="nf-backdrop nf-static" aria-hidden>
            404
          </div>

          <h1 className="sr-only">404 - project not found</h1>

          <p className="nf-label relative z-10 text-hero-label leading-[1.25]">
            (Out of Frame)
          </p>

          <div className="relative z-10 mt-16 w-full max-w-[34ch] md:absolute md:bottom-[12vh] md:right-[40px] md:mt-0 md:w-auto">
            <p className="nf-sub nf-static text-body font-light leading-[1.45] text-[#1d1d1f]">
              This project slipped out of frame.
              <br />
              It may have been renamed or taken down.
            </p>

            <div className="nf-cta nf-static mt-6 flex flex-wrap items-center gap-6">
              <Link
                href="/work"
                className="nf-back text-body font-light text-[#1d1d1f]"
              >
                See all work
              </Link>
              <Link
                href="/"
                className="nf-back text-body font-light text-subtle"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
