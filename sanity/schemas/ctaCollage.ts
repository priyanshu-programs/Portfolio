import { defineType, defineField } from "sanity";

export const ctaCollage = defineType({
  name: "ctaCollage",
  title: "CTA / Collage Section",
  type: "document",
  fields: [
    defineField({ name: "headline", title: "Headline", type: "string" }),
    defineField({
      name: "revealHeadline",
      title: "Reveal Headline",
      type: "text",
      rows: 2,
    }),
    defineField({
      name: "linkText",
      title: "Link Text",
      type: "string",
      description: 'e.g. "Let\'s have one."',
    }),
    defineField({
      name: "collage",
      title: "Collage Images (ordered, up to 6)",
      type: "array",
      of: [{ type: "image", options: { hotspot: true } }],
      description:
        "Order matters — positions and sizes are fixed by the layout; these fill slots 1–6.",
    }),
    defineField({
      name: "handLeft",
      title: "Left Hand Image",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "handRight",
      title: "Right Hand Image",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "twoHands",
      title: "Two Hands (contact) Image",
      type: "image",
      options: { hotspot: true },
    }),
  ],
  preview: { prepare: () => ({ title: "CTA / Collage Section" }) },
});
