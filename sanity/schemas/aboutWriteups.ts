import { defineField, defineType } from "sanity";

export default defineType({
  name: "aboutWriteups",
  title: "About writeups",
  type: "document",
  fields: [
    defineField({ name: "heading", title: "Section heading", type: "string" }),
    defineField({ name: "intro", title: "Section intro", type: "text", rows: 3 }),
    defineField({
      name: "writeups",
      title: "Writeups",
      type: "array",
      of: [
        {
          type: "object",
          fields: [
            defineField({ name: "eyebrow", title: "Eyebrow", type: "string" }),
            defineField({ name: "title", title: "Title", type: "string" }),
            defineField({
              name: "body",
              title: "Body",
              type: "array",
              of: [{ type: "block" }],
            }),
          ],
          preview: {
            select: { title: "title", subtitle: "eyebrow" },
            prepare: ({ title, subtitle }) => ({ title: title || "Untitled writeup", subtitle }),
          },
        },
      ],
    }),
  ],
  preview: { select: { title: "heading" } },
});
