import { defineType, defineField } from "sanity";

export const aboutWork = defineType({
  name: "aboutWork",
  title: "About / Work Section",
  type: "document",
  fields: [
    defineField({ name: "quote", title: "Main Quote", type: "text", rows: 3 }),
    defineField({
      name: "subParagraph",
      title: "Sub Paragraph",
      type: "text",
      rows: 3,
    }),
  ],
  preview: { prepare: () => ({ title: "About / Work Section" }) },
});
