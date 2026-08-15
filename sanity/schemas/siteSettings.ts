import { defineType, defineField, defineArrayMember } from "sanity";

export const siteSettings = defineType({
  name: "siteSettings",
  title: "Site Settings",
  type: "document",
  fields: [
    defineField({ name: "name", title: "Name", type: "string" }),
    defineField({ name: "email", title: "Contact Email", type: "string" }),
    defineField({
      name: "timezone",
      title: "Timezone Label",
      type: "string",
      description: 'e.g. "IST — UTC +5:30"',
    }),
    defineField({
      name: "socials",
      title: "Social Links",
      type: "array",
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
    }),
    defineField({
      name: "navLinks",
      title: "Navigation Links",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            defineField({ name: "label", title: "Label", type: "string" }),
            defineField({ name: "href", title: "Path", type: "string" }),
          ],
          preview: { select: { title: "label", subtitle: "href" } },
        }),
      ],
    }),
    defineField({
      name: "navColor",
      title: "Navigation Text Colour",
      type: "string",
      description:
        'Hex colour for the top navigation on the home page and the work index, e.g. "#1D1D1F". Only used when "Blend navigation with background" is off. Case studies set their own colour.',
      validation: (Rule) =>
        Rule.regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, {
          name: "hex colour",
        }).warning('Use a hex value such as "#1D1D1F".'),
    }),
    defineField({
      name: "navBlend",
      title: "Blend navigation with background",
      type: "boolean",
      description:
        "On: the navigation inverts whatever sits behind it, staying legible over the hero imagery. Off: it uses the Navigation Text Colour above. Case-study pages always use their own colour and ignore this.",
      initialValue: true,
    }),
    defineField({ name: "seoTitle", title: "SEO Title", type: "string" }),
    defineField({
      name: "seoDescription",
      title: "SEO Description",
      type: "text",
      rows: 3,
    }),
  ],
  preview: { prepare: () => ({ title: "Site Settings" }) },
});
