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
  const title = about?.seoTitle ?? DEFAULT_TITLE;
  const description = about?.seoDescription ?? DEFAULT_DESCRIPTION;

  // `images` is repeated from the root layout on purpose. Nested metadata
  // objects REPLACE the parent's rather than merging into it, so declaring
  // `openGraph` here without images strips the site-wide card and this route
  // unfurls as a bare text link. Same reason `card` is restated under twitter.
  return {
    title,
    description,
    alternates: { canonical: "/about" },
    openGraph: {
      title,
      description,
      url: "/about",
      type: "profile",
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

export default function AboutLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
