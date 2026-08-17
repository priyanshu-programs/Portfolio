import type { Metadata } from "next";
import { getSiteContent } from "@/lib/sanity/getSiteContent";

const DEFAULT_TITLE = "Contact — Priyanshu Roy";
const DEFAULT_DESCRIPTION =
  "Start a project, or book a time to talk it through.";

/**
 * The page itself is a client component (it owns the form state and a GSAP
 * entrance), so it can't export metadata. This thin server layout supplies it.
 */
export async function generateMetadata(): Promise<Metadata> {
  const content = await getSiteContent();
  const name = content?.settings?.name;
  return {
    title: name ? `Contact — ${name}` : DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
  };
}

export default function ContactLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
