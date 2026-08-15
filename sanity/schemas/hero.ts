import { defineType, defineField } from "sanity";

export const hero = defineType({
  name: "hero",
  title: "Hero",
  type: "document",
  fields: [
    defineField({
      name: "pillLabel",
      title: "Pill Label",
      type: "string",
      description: 'The small "Open to projects" badge.',
    }),
    defineField({ name: "heading", title: "Heading (H1)", type: "text", rows: 2 }),
    defineField({
      name: "paragraph",
      title: "Intro Paragraph",
      type: "text",
      rows: 3,
    }),
    defineField({
      name: "marqueeText",
      title: "Marquee Text",
      type: "string",
      description: "The scrolling name/text band.",
    }),
    defineField({
      name: "loaderText",
      title: "Loader Ring Text",
      type: "string",
      description: 'e.g. "LET\'S TALK • "',
    }),
    defineField({
      name: "portrait",
      title: "Portrait Image",
      type: "image",
      options: { hotspot: true },
    }),
  ],
  preview: { prepare: () => ({ title: "Hero" }) },
});
