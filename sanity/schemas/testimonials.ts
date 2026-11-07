import { defineType, defineField, defineArrayMember } from "sanity";

/**
 * Home-page Testimonials section. One ordered list: drag to reorder, add or
 * delete entries, or tick "Hide" to take one off the site without losing it.
 * With no visible entries the section doesn't render at all.
 */
export const testimonials = defineType({
  name: "testimonials",
  title: "Testimonials Section",
  type: "document",
  fields: [
    defineField({
      name: "items",
      title: "Testimonials",
      type: "array",
      description: "Shown in this order. Drag to reorder.",
      of: [
        defineArrayMember({
          type: "object",
          name: "testimonial",
          fields: [
            defineField({
              name: "name",
              title: "Name",
              type: "string",
              validation: (r) => r.required(),
            }),
            defineField({ name: "role", title: "Role", type: "string" }),
            defineField({
              name: "company",
              title: "Company",
              type: "string",
              description: "Shown as the wordmark at the top of the card.",
            }),
            defineField({
              name: "quote",
              title: "Quote",
              type: "text",
              rows: 3,
              description: "Keep it short: one or two lines on the card.",
              validation: (r) => r.required(),
            }),
            defineField({
              name: "photo",
              title: "Photo",
              type: "image",
              options: { hotspot: true },
              description:
                "Portrait. Shown in a duotone tint, so any colour photo works. Also the video's poster.",
              validation: (r) => r.required(),
            }),
            defineField({
              name: "video",
              title: "Video (optional)",
              type: "file",
              options: { accept: "video/*" },
              description:
                'Upload an MP4 to make "Watch video" and the play button work on this card.',
            }),
            defineField({
              name: "hidden",
              title: "Hide",
              type: "boolean",
              description: "Hide from the site without deleting.",
              initialValue: false,
            }),
          ],
          preview: {
            select: {
              title: "name",
              company: "company",
              media: "photo",
              hidden: "hidden",
            },
            prepare: ({ title, company, media, hidden }) => ({
              title: hidden ? `${title} (hidden)` : title,
              subtitle: company,
              media,
            }),
          },
        }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: "Testimonials Section" }) },
});
