import type { Metadata } from "next";
import { getSiteContent } from "@/lib/sanity/getSiteContent";
import JsonLd from "@/components/JsonLd";
import { graph, webPageNode } from "@/lib/schema";

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

/**
 * ProfilePage rather than plain WebPage: this route is about a person, which is
 * exactly what the type is for, and `openGraph.type` above already says
 * `profile`. The `about -> #person` edge in webPageNode then makes the subject
 * explicit instead of leaving crawlers to infer it from the copy.
 *
 * Safe to emit from this layout because it wraps only /about. The work layout
 * deliberately does not do the same — it also wraps /work/[slug], so a node
 * here would claim every case study was the /work index.
 */
export default async function AboutLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const content = await getSiteContent();
  const about = content?.about;

  return (
    <>
      <JsonLd
        data={graph([
          webPageNode({
            path: "/about",
            name: about?.seoTitle?.trim() || DEFAULT_TITLE,
            description: about?.seoDescription?.trim() || DEFAULT_DESCRIPTION,
            type: "ProfilePage",
          }),
        ])}
      />
      {children}
    </>
  );
}
