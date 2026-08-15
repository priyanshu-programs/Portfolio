import { defineType, defineField } from "sanity";

export const floatingMenu = defineType({
  name: "floatingMenu",
  title: "Floating Menu",
  type: "document",
  fields: [
    defineField({
      name: "tags",
      title: "Tags",
      type: "array",
      of: [{ type: "string" }],
      description: 'e.g. "Identity", "Visualisation", "Interactive"',
    }),
    defineField({
      name: "image",
      title: "Left Column Image",
      type: "image",
      options: { hotspot: true },
    }),
  ],
  preview: { prepare: () => ({ title: "Floating Menu" }) },
});
