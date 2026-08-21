"use client";

import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";
import Footer from "@/components/sections/Footer";
import { NOT_FOUND_CLASS } from "@/components/sections/NotFoundStage";

/**
 * Renders the global footer everywhere except individual case studies and the
 * 404 page.
 *
 * A case study ends in the scroll-past-the-end handoff to the next project
 * (see NextProject), so a footer underneath would sit between the reader and
 * that gesture — and give the page a second, competing "end". The /work index
 * keeps its footer; only /work/<slug> drops it.
 *
 * The 404 cannot be detected the same way: `usePathname()` returns whatever bad
 * URL the visitor typed, so there is no path to match on. NotFoundStage raises
 * `html.is-404` on mount instead and this observes the class, which keeps the
 * dependency one-directional — the 404 knows nothing about the footer.
 */

const subscribeNotFound = (onChange: () => void) => {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["class"],
  });
  return () => observer.disconnect();
};

const getNotFound = () =>
  document.documentElement.classList.contains(NOT_FOUND_CLASS);

/* The server never renders the 404 flag, so the footer must be present in the
   server HTML to avoid a hydration mismatch; the observer removes it on the
   client during NotFoundStage's layout effect, before paint. */
const getServerNotFound = () => false;

export default function SiteFooter() {
  const pathname = usePathname();
  const isCaseStudy = /^\/work\/[^/]+$/.test(pathname ?? "");
  const isNotFound = useSyncExternalStore(
    subscribeNotFound,
    getNotFound,
    getServerNotFound
  );

  if (isCaseStudy || isNotFound) return null;
  return <Footer />;
}
