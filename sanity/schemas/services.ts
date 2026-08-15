import { defineType, defineField, defineArrayMember } from "sanity";

export const services = defineType({
  name: "services",
  title: "Services Section",
  type: "document",
  fields: [
    defineField({ name: "heading", title: "Heading", type: "text", rows: 3 }),
    defineField({
      name: "ornament",
      title: "Ornament Image",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "landscape",
      title: "Landscape Background Image",
      type: "image",
      options: { hotspot: true },
    }),
    defineField({
      name: "cards",
      title: "Service Cards",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            defineField({ name: "title", title: "Title", type: "string" }),
            defineField({ name: "copy", title: "Copy", type: "text", rows: 2 }),
            defineField({
              name: "iconKey",
              title: "Icon",
              type: "string",
              options: {
                list: [
                  { title: "Trend", value: "trend" },
                  { title: "Nodes", value: "nodes" },
                  { title: "Wand", value: "wand" },
                ],
                layout: "radio",
              },
            }),
          ],
          preview: { select: { title: "title", subtitle: "copy" } },
        }),
      ],
    }),
  ],
  preview: { prepare: () => ({ title: "Services Section" }) },
});
