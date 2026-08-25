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
  const contact = content?.contact;
  const name = content?.settings?.name;

  // contact.seoTitle/seoDescription are authored in the Studio and were already
  // being fetched here, but the previous version discarded both — hardcoding
  // the description and deriving the title from settings.name. Editors could
  // fill those fields and watch nothing change. /about honours its equivalents;
  // this now matches.
  const title = contact?.seoTitle ?? (name ? `Contact — ${name}` : DEFAULT_TITLE);
  const description = contact?.seoDescription ?? DEFAULT_DESCRIPTION;

  return {
    title,
    description,
    alternates: { canonical: "/contact" },
    // See the note in about/layout.tsx: nested metadata replaces the parent's
    // rather than merging, so the image has to be restated to survive.
    openGraph: {
      title,
      description,
      url: "/contact",
      type: "website",
      images: ["/opengraph-image"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ["/opengraph-image"],
    },
  };
}

export default function ContactLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
