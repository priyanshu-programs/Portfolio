import { notFound } from "next/navigation";
import type { Metadata } from "next";
import CaseStudy from "@/components/work/CaseStudy";
import { getCaseStudy, getWorkSlugs } from "@/lib/sanity/getCaseStudy";
import { getSiteContent } from "@/lib/sanity/getSiteContent";
import { absoluteUrl } from "@/lib/siteUrl";
import JsonLd from "@/components/JsonLd";

interface PageProps {
  params: Promise<{ slug: string }>;
}

/** Matches the root layout's window so a case study can't outlive its content. */
export const revalidate = 60;

/**
 * generateStaticParams only knows the slugs that existed at build time, so a
 * project added in the Studio afterwards would 404 until the next deploy —
 * a CMS-shaped page failing in the one way a CMS is supposed to prevent.
 * Leaving this true renders unknown slugs on demand; getCaseStudy still
 * returns null for a genuinely missing project, so notFound() below keeps
 * handling real 404s.
 */
export const dynamicParams = true;

/** Prerender every case study that has a slug. */
export async function generateStaticParams() {
  const slugs = await getWorkSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const project = await getCaseStudy(slug);
  if (!project) return { title: "Project not found" };

  // getSiteContent is React.cache'd and already fetched by the root layout in
  // this request, so reading the site name here costs nothing.
  const content = await getSiteContent();
  const name = content?.settings?.name ?? "Priyanshu Roy";

  const title = `${project.title ?? "Project"} — ${name}`;
  const description =
    project.summary ||
    [project.category, project.services].filter(Boolean).join(" · ") ||
    undefined;

  // Explicit dimensions and alt: scrapers that won't fetch the image to measure
  // it (X and Slack among them) need og:image:width/height present to render a
  // large card instead of a thumbnail. buildImageUrl requested 2000px wide, and
  // the covers are 16/10, so 2000x1250 describes the asset being served.
  const images = project.cover
    ? [
        {
          url: project.cover,
          width: 2000,
          height: 1250,
          alt: project.title ? `${project.title} — cover` : "Project cover",
        },
      ]
    : undefined;

  return {
    title,
    description,
    alternates: { canonical: `/work/${slug}` },
    openGraph: {
      title,
      description,
      type: "article",
      url: `/work/${slug}`,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: project.cover ? [project.cover] : undefined,
    },
  };
}

export default async function CaseStudyPage({ params }: PageProps) {
  const { slug } = await params;
  const project = await getCaseStudy(slug);

  if (!project) notFound();

  const content = await getSiteContent();
  const authorName = content?.settings?.name ?? "Priyanshu Roy";

  /**
   * CreativeWork describes the project itself; BreadcrumbList gives Google the
   * Home → Work → Project trail it uses to render breadcrumbs in results
   * instead of a bare URL. `creator` points at the Person @id minted in the
   * root layout, so the case study attaches to the same identity graph.
   */
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CreativeWork",
        "@id": absoluteUrl(`/work/${slug}#work`),
        name: project.title,
        url: absoluteUrl(`/work/${slug}`),
        ...(project.summary ? { abstract: project.summary } : {}),
        ...(project.cover ? { image: project.cover } : {}),
        ...(project.year ? { dateCreated: project.year } : {}),
        // Recency is a strong signal for both ranking and AI-answer citation,
        // and `year` alone ("2026") is too coarse to serve as one. These come
        // from Sanity's own document timestamps, so editing a project in the
        // Studio updates dateModified without anyone maintaining a date field.
        ...(project.createdAt ? { datePublished: project.createdAt } : {}),
        ...(project.updatedAt ? { dateModified: project.updatedAt } : {}),
        ...(project.category ? { genre: project.category } : {}),
        creator: { "@id": absoluteUrl("/#person") },
        author: { "@type": "Person", name: authorName },
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: absoluteUrl("/") },
          { "@type": "ListItem", position: 2, name: "Work", item: absoluteUrl("/work") },
          {
            "@type": "ListItem",
            position: 3,
            name: project.title ?? "Project",
            item: absoluteUrl(`/work/${slug}`),
          },
        ],
      },
    ],
  };

  return (
    <>
      <JsonLd data={structuredData} />
      <CaseStudy project={project} />
    </>
  );
}
