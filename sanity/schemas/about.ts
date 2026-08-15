import { defineType, defineField, defineArrayMember } from "sanity";

/**
 * Stated once and reused, so the two places that accept accent phrases describe
 * the same literal-matching rule in the same words.
 */
const ACCENTS_DESCRIPTION =
  "Substrings of the text above to render in italic script. Must match the text exactly, including case.";

export const about = defineType({
  name: "about",
  title: "About Page",
  type: "document",
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "slots", title: "Photo Slots" },
    { name: "seo", title: "SEO" },
  ],
  fields: [
    defineField({
      name: "title",
      title: "Title",
      type: "string",
      group: "content",
      description: 'The oversized word that flies in from the right. Defaults to "About".',
    }),
    defineField({
      name: "paragraphs",
      title: "Paragraphs (up to 2)",
      type: "array",
      group: "content",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            defineField({ name: "text", title: "Text", type: "text", rows: 4 }),
            defineField({
              name: "accents",
              title: "Accent Phrases",
              type: "array",
              of: [{ type: "string" }],
              description: ACCENTS_DESCRIPTION,
            }),
          ],
          preview: { select: { title: "text" } },
        }),
      ],
      validation: (Rule) => Rule.max(2),
      description:
        "Order matters: the first reveals beside the title, the second lower on the stage.",
    }),
    defineField({
      name: "slots",
      title: "Photo Slots (ordered, up to 3)",
      type: "array",
      group: "slots",
      of: [
        defineArrayMember({
          type: "object",
          name: "aboutSlot",
          title: "Slot",
          fields: [
            defineField({
              name: "image",
              title: "Image",
              type: "image",
              options: { hotspot: true },
            }),
            defineField({
              name: "alt",
              title: "Alt Text",
              type: "string",
              description:
                "Describes the image for screen readers. Leave empty only if the image is purely decorative.",
            }),
            defineField({
              name: "blurb",
              title: "Blurb",
              type: "object",
              description: "The short line of copy set beside this photo.",
              fields: [
                defineField({ name: "text", title: "Text", type: "text", rows: 3 }),
                defineField({
                  name: "accents",
                  title: "Accent Phrases",
                  type: "array",
                  of: [{ type: "string" }],
                  description: ACCENTS_DESCRIPTION,
                }),
              ],
            }),
          ],
          preview: { select: { title: "blurb.text", subtitle: "alt", media: "image" } },
        }),
      ],
      validation: (Rule) => Rule.max(3),
      description:
        "Each slot pairs one photo with the blurb beside it. Positions and sizes are fixed by the layout: slot 1 sits right with its blurb to the left, slot 2 sits left with its blurb to the right, slot 3 repeats slot 1.",
    }),
    defineField({
      name: "socials",
      title: "Social Links",
      type: "array",
      group: "content",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            defineField({ name: "label", title: "Label", type: "string" }),
            defineField({ name: "href", title: "URL", type: "url" }),
          ],
          preview: { select: { title: "label", subtitle: "href" } },
        }),
      ],
      description: "Falls back to the Site Settings socials when empty.",
    }),
    defineField({
      name: "email",
      title: "Contact Email",
      type: "string",
      group: "content",
      description: "Falls back to the Site Settings email when empty.",
    }),
    defineField({ name: "seoTitle", title: "SEO Title", type: "string", group: "seo" }),
    defineField({
      name: "seoDescription",
      title: "SEO Description",
      type: "text",
      rows: 3,
      group: "seo",
    }),
  ],
  preview: { prepare: () => ({ title: "About Page" }) },
});
