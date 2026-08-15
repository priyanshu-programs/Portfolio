import { defineType, defineField, defineArrayMember } from "sanity";
import type { StringRule } from "sanity";

const MAX_PINNED_HOME = 4;

/** Accepts #rgb or #rrggbb, case-insensitive. */
const HEX = /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

/** A URL-safe slug: lowercase alphanumerics separated by single hyphens. */
const URL_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/**
 * Normalise anything typed or generated into a URL-safe slug. Applied by the
 * slug input itself, so a title like "Inoya Rouge" becomes "inoya-rouge" rather
 * than a value with a space that would encode as %20 in the route.
 */
function toUrlSlug(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 96);
}

/**
 * Warns rather than errors: a typo shouldn't block publishing, and every colour
 * read on the frontend already falls back when the value isn't a usable hex.
 */
const hexRule = (Rule: StringRule) =>
  Rule.regex(HEX, { name: "hex colour" }).warning(
    'Use a hex value such as "#1E1C28".'
  );

export const workProject = defineType({
  name: "workProject",
  title: "Work Project",
  type: "document",
  groups: [
    { name: "index", title: "Work Index", default: true },
    { name: "hover", title: "Hover Card" },
    { name: "caseStudy", title: "Case Study" },
    { name: "theme", title: "Theme" },
  ],
  fields: [
    defineField({
      name: "order",
      title: "Order",
      type: "number",
      description: "Lower numbers appear first.",
      group: "index",
    }),
    defineField({
      name: "visible",
      title: "Visible on site",
      type: "boolean",
      description:
        "Turn off to hide this project everywhere — the home page, the work index, and its own /work/<slug> URL, which will return a 404.",
      group: "index",
      initialValue: true,
    }),
    defineField({
      name: "pinnedHome",
      title: "Show in Recent Work (Home page)",
      type: "boolean",
      description: `Pin this project to the home page's Recent Work section. Maximum ${MAX_PINNED_HOME} across all projects; "order" controls their sequence there. The project must also be Visible on site to appear.`,
      group: "index",
      initialValue: false,
      validation: (Rule) =>
        Rule.custom(async (value, context) => {
          if (!value) return true;
          const client = context.getClient({ apiVersion: "2024-01-01" });
          const rawId = context.document?._id;
          const id = rawId?.replace(/^drafts\./, "");
          const count = await client.fetch(
            `count(*[_type == "workProject" && pinnedHome == true && !(_id in [$id, "drafts." + $id])])`,
            { id }
          );
          return count < MAX_PINNED_HOME
            ? true
            : `Only ${MAX_PINNED_HOME} projects can be pinned to the home page. Unpin another first.`;
        }),
    }),
    defineField({
      name: "id",
      title: "Display ID",
      type: "string",
      description: 'e.g. "01"',
      group: "index",
    }),
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      group: "index",
      validation: (Rule) => Rule.required(),
    }),
    defineField({
      name: "slug",
      title: "Slug",
      type: "slug",
      description:
        "Auto-generated from the title. Becomes the case-study URL: /work/<slug>. Without it the project won't be clickable on /work. Lowercase letters, numbers and hyphens only — a space would produce a broken URL like /work/my%20project.",
      options: { source: "title", maxLength: 96, slugify: toUrlSlug },
      group: "index",
      validation: (Rule) =>
        Rule.required().custom((value) => {
          const current = value?.current;
          if (!current) return "A slug is required — the page is unreachable without one.";
          return URL_SLUG.test(current)
            ? true
            : `Use lowercase letters, numbers and hyphens only (e.g. "${toUrlSlug(current)}").`;
        }),
    }),
    defineField({
      name: "category",
      title: "Category",
      type: "string",
      group: "index",
    }),
    defineField({
      name: "services",
      title: "Services",
      type: "string",
      description:
        'Shown in the /work list column and as the case-study SERVICE label, e.g. "Design + Development".',
      group: "index",
    }),
    defineField({ name: "year", title: "Year", type: "string", group: "index" }),
    defineField({
      name: "tags",
      title: "Tags",
      type: "array",
      of: [{ type: "reference", to: [{ type: "tag" }] }],
      description:
        "Drives the All / <Tag> filter pills on /work. Reference existing tags or create new ones inline.",
      group: "index",
    }),
    defineField({
      name: "thumbnail",
      title: "Thumbnail",
      type: "image",
      description:
        "Square image used in grid view. Also stands in for the Hover Image when that field is empty, and for the next-project preview shown at the foot of other case studies (falls back to Cover Image if left empty).",
      options: { hotspot: true },
      group: "index",
    }),

    // ── Hover card ────────────────────────────────────────────────
    // The card that follows the cursor on the /work list and the home page's
    // Recent Work rows: a 400×360 colour box framing a 352×220 image window.
    defineField({
      name: "hoverImage",
      title: "Hover Image",
      type: "image",
      description:
        "Landscape shot shown inside the hover card, on top of the background colour. The window is 352×220 (16:10) — upload around 1600×1000 for a crisp result. Falls back to the Thumbnail when empty.",
      options: { hotspot: true },
      group: "hover",
    }),
    defineField({
      name: "hoverBg",
      title: "Hover Card Background Colour",
      type: "color",
      description:
        "Colour of the 400×360 card framing the hover image. Falls back to the Thumbnail Background Colour, then #F0F0F0.",
      options: { disableAlpha: true },
      group: "hover",
    }),

    // ── Case study ────────────────────────────────────────────────
    defineField({
      name: "cover",
      title: "Cover Image",
      type: "image",
      description:
        "Wide hero shot under the project title on the case-study page.",
      options: { hotspot: true },
      group: "caseStudy",
    }),
    defineField({
      name: "summary",
      title: "Summary",
      type: "text",
      rows: 3,
      description:
        'The lead line in the overview, e.g. "Trackify — personal finance tracking built for clarity."',
      group: "caseStudy",
    }),
    defineField({
      name: "liveUrl",
      title: "Live URL",
      type: "url",
      description:
        'Shows the "View live" pill in the overview. Leave empty to hide it.',
      group: "caseStudy",
    }),
    defineField({
      name: "challenge",
      title: "Challenge",
      type: "array",
      of: [defineArrayMember({ type: "text", rows: 4 })],
      description: "One entry per paragraph.",
      group: "caseStudy",
    }),
    defineField({
      name: "approach",
      title: "Approach",
      type: "array",
      of: [defineArrayMember({ type: "text", rows: 4 })],
      description: "One entry per paragraph.",
      group: "caseStudy",
    }),
    defineField({
      name: "galleryHeading",
      title: "Gallery Heading",
      type: "string",
      description: 'Defaults to "Pixels with Purpose" when empty.',
      group: "caseStudy",
    }),
    defineField({
      name: "gallerySubheading",
      title: "Gallery Subheading",
      type: "string",
      group: "caseStudy",
    }),
    defineField({
      name: "gallery",
      title: "Gallery",
      type: "array",
      description:
        "Screens shown in the horizontally-dragged carousel. Two or more make the drag meaningful.",
      of: [
        defineArrayMember({
          type: "object",
          name: "gallerySlide",
          fields: [
            defineField({
              name: "image",
              title: "Image",
              type: "image",
              options: { hotspot: true },
              validation: (Rule) => Rule.required(),
            }),
            defineField({
              name: "caption",
              title: "Caption",
              type: "string",
            }),
          ],
          preview: { select: { title: "caption", media: "image" } },
        }),
      ],
      group: "caseStudy",
    }),

    // ── Theme ─────────────────────────────────────────────────────
    defineField({
      name: "bgColor",
      title: "Thumbnail Background Colour",
      type: "string",
      description:
        'Hex colour behind the thumbnail in grid view and on the "next project" card, e.g. "#E0D9D1". Also the fallback for the Hover Card Background Colour.',
      group: "theme",
      validation: hexRule,
    }),
    defineField({
      name: "pageBg",
      title: "Case Study Background Colour",
      type: "string",
      description:
        'Hex background for this project\'s case-study page, e.g. "#1E1C28" for dark or "#F4EFEA" for warm light. Text, rules and the arrow badge switch between dark and light automatically based on this colour. Leave empty to use the default cream (#FFFCFA).',
      group: "theme",
      validation: hexRule,
    }),
    defineField({
      name: "galleryBg",
      title: "Gallery Section Background Colour",
      type: "string",
      description:
        'Hex background for just the "Pixels with Purpose" image gallery section, e.g. "#1E1C28". Leave empty to match the page background.',
      group: "theme",
      validation: hexRule,
    }),
    defineField({
      name: "accent",
      title: "Case Study Accent Colour",
      type: "string",
      description:
        'Hex accent for the small-caps labels and the "View live" pill, e.g. "#7BE0AD". Leave empty to derive it from the text colour.',
      group: "theme",
      validation: hexRule,
    }),
    defineField({
      name: "textColor",
      title: "Case Study Text Colour",
      type: "string",
      description:
        'Hex colour for the body copy on this project\'s case-study page, e.g. "#F5F5F5". Hairline rules and secondary copy are derived from it. Leave empty to pick it automatically from the background colour above.',
      group: "theme",
      validation: hexRule,
    }),
    defineField({
      name: "navColor",
      title: "Case Study Navigation Text Colour",
      type: "string",
      description:
        "Hex colour for the top navigation on this project's case-study page. Leave empty to follow the text colour.",
      group: "theme",
      validation: hexRule,
    }),
  ],
  orderings: [
    {
      title: "Order",
      name: "orderAsc",
      by: [{ field: "order", direction: "asc" }],
    },
  ],
  preview: {
    select: {
      title: "title",
      category: "category",
      media: "thumbnail",
      visible: "visible",
    },
    // Documents created before the `visible` field existed have it undefined,
    // which reads as visible everywhere else — mirror that here.
    prepare: ({ title, category, media, visible }) => ({
      title: visible === false ? `${title} — hidden` : title,
      subtitle: category,
      media,
    }),
  },
});
