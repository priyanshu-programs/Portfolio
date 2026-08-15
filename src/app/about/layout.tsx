import type { Metadata } from "next";
import { getSiteContent } from "@/lib/sanity/getSiteContent";

const DEFAULT_TITLE = "About — Priyanshu Roy";
const DEFAULT_DESCRIPTION =
  "Brand identity and web development, made together.";

/**
 * The page itself is a client component (it owns a GSAP timeline), so it can't
 * export metadata. This thin server layout supplies it instead.
 */
export async function generateMetadata(): Promise<Metadata> {
  const content = await getSiteContent();
  const about = content?.about;
  return {
    title: about?.seoTitle ?? DEFAULT_TITLE,
    description: about?.seoDescription ?? DEFAULT_DESCRIPTION,
  };
}

export default function AboutLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
