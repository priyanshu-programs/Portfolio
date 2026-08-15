/**
 * Reads content back from Sanity to confirm the seed landed and the public
 * read path works. Run: npm run sanity:verify
 *
 * Checks structural health, not seed-era counts — the dataset is edited in the
 * Studio after seeding, so "how many work projects exist" is the owner's
 * business. What matters is that whatever exists is complete enough to render:
 * a project with no slug is unreachable at /work/<slug>, and a case study with
 * no cover or empty gallery renders as a mostly-blank page.
 */
import { createClient } from "@sanity/client";

const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID!;
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET ?? "production";

const client = createClient({
  projectId,
  dataset,
  apiVersion: process.env.NEXT_PUBLIC_SANITY_API_VERSION ?? "2025-01-01",
  // Match the app's read path: published docs only, no CDN (which can lag just
  // after a write).
  perspective: "published",
  useCdn: false,
});

const data = await client.fetch(`{
  "hero": *[_type=="hero"][0]{ heading, "portrait": portrait.asset->url },
  "settings": *[_type=="siteSettings"][0]{ name, email },
  "about": *[_type=="about"][0]{
    title,
    "paragraphs": count(paragraphs),
    "slots": count(slots),
    "completeSlots": count(slots[defined(image.asset) && defined(blurb.text)])
  },
  "services": *[_type=="services"][0]{ "cards": count(cards) },
  "homeWork": count(*[_type=="workProject" && pinnedHome == true && visible != false]),
  "cta": *[_type=="ctaCollage"][0]{ "collage": count(collage) },
  "workProjects": count(*[_type=="workProject"]),
  "visibleProjects": count(*[_type=="workProject" && visible != false]),
  "tags": count(*[_type=="tag"]),
  "caseStudies": *[_type=="workProject"] | order(order asc){
    title,
    "slug": slug.current,
    "cover": cover.asset->url,
    "challenge": count(challenge),
    "approach": count(approach),
    "gallery": count(gallery),
    pageBg, textColor, navColor,
    "visible": visible != false
  }
}`);

console.log(JSON.stringify(data, null, 2));

/**
 * Unpublished drafts are the most common reason a Studio edit "doesn't show
 * up", but they're invisible to the query above (perspective: "published")
 * and unreadable anonymously. Check them separately when a token is available.
 */
async function countDrafts(): Promise<number | null> {
  if (!process.env.SANITY_API_TOKEN) return null;
  try {
    const authed = client.withConfig({
      token: process.env.SANITY_API_TOKEN,
      perspective: "raw",
    });
    return await authed.fetch<number>(`count(*[_id in path("drafts.**")])`);
  } catch {
    return null;
  }
}

const drafts = await countDrafts();

interface CaseStudyRow {
  title?: string;
  slug?: string;
  cover?: string;
  challenge?: number;
  approach?: number;
  gallery?: number;
  textColor?: string;
  navColor?: string;
  visible?: boolean;
}

const caseStudies: CaseStudyRow[] = data?.caseStudies ?? [];
const problems: string[] = [];
const warnings: string[] = [];

// --- Hard failures: the read path is broken or a page would render empty. ---

if (!data?.hero?.heading) problems.push("hero.heading is empty");
if (!data?.hero?.portrait?.includes("cdn.sanity.io"))
  problems.push("hero.portrait is not a Sanity asset URL");
if (!data?.settings?.name) problems.push("siteSettings.name is empty");

if (caseStudies.length === 0) {
  problems.push("no workProject documents — /work would be empty");
}

// Hidden projects are excluded from every read query, so an incomplete one is
// deliberate work-in-progress rather than a broken page. Only the visible set
// has to be render-ready.
const live = caseStudies.filter((p) => p.visible !== false);

if (caseStudies.length > 0 && live.length === 0) {
  problems.push(
    `all ${caseStudies.length} workProject documents are hidden ("Visible on site" off) — ` +
      `/work would be empty and the homepage work row would render nothing`
  );
}

const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

for (const p of live) {
  const label = p.title ?? "(untitled)";
  if (!p.slug) problems.push(`"${label}" has no slug — unreachable at /work/<slug>`);
  if (!p.cover?.includes("cdn.sanity.io"))
    problems.push(`"${label}" has no cover image`);
  if (!(p.challenge ?? 0)) problems.push(`"${label}" has an empty challenge`);
  if (!(p.approach ?? 0)) problems.push(`"${label}" has an empty approach`);
  if (!(p.gallery ?? 0)) problems.push(`"${label}" has an empty gallery`);
  // A malformed hex silently falls back to the derived colour, so the editor
  // sees "my colour didn't apply" with nothing explaining why.
  if (p.textColor && !HEX.test(p.textColor))
    warnings.push(`"${label}" textColor "${p.textColor}" is not a hex value — it will be ignored`);
  if (p.navColor && !HEX.test(p.navColor))
    warnings.push(`"${label}" navColor "${p.navColor}" is not a hex value — it will be ignored`);
}

// A duplicate slug means one of the two /work/<slug> pages is unreachable.
const slugs = live.map((p) => p.slug).filter(Boolean);
const dupes = slugs.filter((s, i) => slugs.indexOf(s) !== i);
if (dupes.length) problems.push(`duplicate slugs: ${[...new Set(dupes)].join(", ")}`);

// --- Warnings: renders, but not the way the layout was designed for. ---

// The /about route falls back to hardcoded copy for every field, so an
// incomplete About document degrades rather than breaks — warnings, not
// failures. A missing document entirely is still worth surfacing: it means the
// seed never ran, or the singleton was deleted.
if (!data?.about) {
  warnings.push(
    "no about document — /about renders entirely from its hardcoded fallbacks"
  );
} else {
  const slots = data.about.slots ?? 0;
  const completeSlots = data.about.completeSlots ?? 0;

  if (!data.about.paragraphs)
    warnings.push(
      "about has no paragraphs — the left column renders no body copy " +
        "(DEFAULT_PARAGRAPHS is empty)"
    );
  if (slots !== 3)
    warnings.push(`about has ${slots} photo slot(s); the layout expects 3`);
  if (completeSlots < slots)
    warnings.push(
      `${slots - completeSlots} about slot(s) missing an image or a blurb — ` +
        `slots without an image are dropped entirely`
    );
}

if (data?.services?.cards !== 3)
  warnings.push(`services has ${data?.services?.cards ?? 0} cards; the layout expects 3`);
if (data?.cta?.collage !== 6)
  warnings.push(`cta has ${data?.cta?.collage ?? 0} collage images; the layout expects 6`);
if (!data?.homeWork)
  warnings.push(
    "no visible workProject has pinnedHome — the homepage work row is empty"
  );
const hidden = caseStudies.length - live.length;
if (hidden > 0)
  warnings.push(
    `${hidden} workProject document(s) hidden ("Visible on site" off) — absent from the ` +
      `homepage and /work, and their /work/<slug> URLs return 404`
  );
if (!data?.tags)
  warnings.push("no tag documents — the /work filter pills will be empty");
if (drafts === null) {
  warnings.push(
    "SANITY_API_TOKEN not set — skipped the unpublished-drafts check"
  );
} else if (drafts > 0) {
  warnings.push(
    `${drafts} unpublished draft(s) — those edits are NOT live; hit Publish in the Studio ` +
      `(the site reads perspective: "published")`
  );
}

// --- Report ---

for (const w of warnings) console.warn(`⚠ ${w}`);
for (const p of problems) console.error(`✗ ${p}`);

if (problems.length) {
  console.log(`\n✗ Read path has ${problems.length} problem(s) — see above.`);
  process.exit(1);
}

console.log(
  warnings.length
    ? `\n✓ Read path verified (${warnings.length} warning(s)).`
    : "\n✓ Read path verified."
);
