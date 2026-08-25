import type { Metadata } from "next";
import { getSiteContent } from "@/lib/sanity/getSiteContent";

const DEFAULT_TITLE = "Work — Priyanshu Roy";
const DEFAULT_DESCRIPTION =
  "Selected projects in brand identity, interaction, and web development.";

/**
 * Same pattern as the about and contact layouts: /work/page.tsx is a client
 * component (it owns the filter state and a GSAP grid transition), so it can't
 * export metadata and this thin server layout supplies it.
 *
 * Without this the route inherited the root layout's metadata wholesale, and
 * the work index shipped with the home page's title and description — the one
 * page most likely to be linked directly was describing a different page.
 *
 * Note this wraps /work/[slug] too, but each case study sets its own title,
 * description and canonical in generateMetadata, so nothing here leaks into
 * them.
 */
export async function generateMetadata(): Promise<Metadata> {
  const content = await getSiteContent();
  const name = content?.settings?.name;
  const title = name ? `Work — ${name}` : DEFAULT_TITLE;

  return {
    title,
    description: DEFAULT_DESCRIPTION,
    alternates: { canonical: "/work" },
    // See the note in about/layout.tsx: nested metadata replaces the parent's
    // rather than merging, so the image has to be restated to survive.
    // Case studies override all of this with their own cover.
    openGraph: {
      title,
      description: DEFAULT_DESCRIPTION,
      url: "/work",
      type: "website",
      images: ["/opengraph-image"],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description: DEFAULT_DESCRIPTION,
      images: ["/opengraph-image"],
    },
  };
}

export default function WorkLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
