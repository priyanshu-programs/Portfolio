import { getSiteContent } from "@/lib/sanity/getSiteContent";
import { absoluteUrl } from "@/lib/siteUrl";

/**
 * `/llms.txt` — a plain-text map of the site for language models.
 *
 * A community convention (llmstxt.org), not a standard. Google Search ignores
 * it; Lighthouse's agentic category checks it, and agents that do read it get
 * the whole site as a short list instead of inferring it from heavily animated
 * markup. The homepage in particular extracts to ~273 characters of body text
 * because its headings are split into per-word spans, so a flat summary is
 * worth more here than on an ordinary site.
 *
 * Generated rather than committed as a static file so it cannot drift from
 * Sanity. Same source and same publishable filter as the sitemap: a project
 * that is hidden or coming-soon has no readable page, so it must not be listed.
 *
 * The format rules the Lighthouse audit checks for: an H1, a `>` blockquote
 * summary, and Markdown links.
 */

/** Matches the root layout and the sitemap, so all three stay in step. */
export const revalidate = 60;

const DEFAULT_NAME = "Priyanshu Roy";
const DEFAULT_SUMMARY =
  "Freelance website designer and web developer. Brand identity, interaction " +
  "design and front-end development for small teams and independent businesses.";

export async function GET() {
  const content = await getSiteContent();
  const settings = content?.settings;
  const name = settings?.name?.trim() || DEFAULT_NAME;
  const summary = settings?.seoDescription?.trim() || DEFAULT_SUMMARY;

  const caseStudies = (content?.workProjects ?? []).filter(
    (project) => project.slug && !project.comingSoon
  );

  const lines = [
    `# ${name}`,
    "",
    `> ${summary}`,
    "",
    "## Pages",
    "",
    `- [Home](${absoluteUrl("/")}): ${name} — website design and development.`,
    `- [Work](${absoluteUrl("/work")}): Selected projects, with a case study for each.`,
    `- [About](${absoluteUrl("/about")}): Background, approach and the practice behind the work.`,
    `- [Contact](${absoluteUrl("/contact")}): Start a project or book a call.`,
  ];

  if (caseStudies.length) {
    lines.push("", "## Case studies", "");
    for (const project of caseStudies) {
      // `category` and `services` are the two lines the work index itself
      // shows for a project, so they are the most honest one-line description
      // available without duplicating the case-study body.
      const detail = [project.category, project.services]
        .map((value) => value?.trim())
        .filter(Boolean)
        .join(" · ");
      const label = project.title?.trim() || project.slug;
      lines.push(
        `- [${label}](${absoluteUrl(`/work/${project.slug}`)})${
          detail ? `: ${detail}` : ""
        }`
      );
    }
  }

  if (settings?.email?.trim()) {
    lines.push("", "## Contact", "", `- Email: ${settings.email.trim()}`);
  }

  lines.push("");

  return new Response(lines.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      // Same 60s window as the content it is built from.
      "Cache-Control": "public, max-age=0, s-maxage=60, stale-while-revalidate=300",
    },
  });
}
