import { notFound } from "next/navigation";
import type { Metadata } from "next";
import CaseStudy from "@/components/work/CaseStudy";
import { getCaseStudy, getWorkSlugs } from "@/lib/sanity/getCaseStudy";
import { getSiteContent } from "@/lib/sanity/getSiteContent";

interface PageProps {
  params: Promise<{ slug: string }>;
}

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

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      images: project.cover ? [{ url: project.cover }] : undefined,
    },
  };
}

export default async function CaseStudyPage({ params }: PageProps) {
  const { slug } = await params;
  const project = await getCaseStudy(slug);

  if (!project) notFound();

  return <CaseStudy project={project} />;
}
