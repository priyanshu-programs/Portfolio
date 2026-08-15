"use client";

import { usePathname } from "next/navigation";
import Footer from "@/components/sections/Footer";

/**
 * Renders the global footer everywhere except individual case studies.
 *
 * A case study ends in the scroll-past-the-end handoff to the next project
 * (see NextProject), so a footer underneath would sit between the reader and
 * that gesture — and give the page a second, competing "end". The /work index
 * keeps its footer; only /work/<slug> drops it.
 */
export default function SiteFooter() {
  const pathname = usePathname();
  const isCaseStudy = /^\/work\/[^/]+$/.test(pathname ?? "");

  if (isCaseStudy) return null;
  return <Footer />;
}
