import { defineType, defineField, defineArrayMember } from "sanity";

export const contact = defineType({
  name: "contact",
  title: "Contact Page",
  type: "document",
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "seo", title: "SEO" },
  ],
  fields: [
    defineField({
      name: "heading",
      title: "Heading",
      type: "string",
      group: "content",
      description: 'The large heading above the form. Defaults to "Let\'s start a project together".',
    }),
    defineField({
      name: "successHeading",
      title: "Success Heading",
      type: "string",
      group: "content",
      description:
        'Replaces the main page heading after a successful submission — it renders at full heading size, not as a subheading. Defaults to "Message sent.".',
    }),
    defineField({
      name: "successBody",
      title: "Success Body",
      type: "text",
      rows: 3,
      group: "content",
      description:
        'Shown under the success heading, above the Calendly embed. Defaults to "If you want to move faster, pick a time now. Otherwise I\'ll reply by email.".',
    }),
    defineField({
      name: "submitLabel",
      title: "Submit Button Label",
      type: "string",
      group: "content",
      description: 'Defaults to "Send it!".',
    }),
    defineField({
      name: "submitPendingLabel",
      title: "Submit Button Label (Sending)",
      type: "string",
      group: "content",
      description: 'Shown on the button while the form is submitting. Defaults to "Sending".',
    }),
    defineField({
      name: "profileImage",
      title: "Profile Image",
      type: "image",
      options: { hotspot: true },
      group: "content",
    }),
    defineField({
      name: "showBackgroundGradient",
      title: "Show Background Gradient",
      type: "boolean",
      group: "content",
      description:
        "Toggles the animated Bloom Field mesh-gradient behind the contact form. Off by default.",
      initialValue: false,
    }),
    defineField({
      name: "email",
      title: "Contact Email",
      type: "string",
      group: "content",
      description: "Falls back to the Site Settings email when empty.",
    }),
    defineField({
      name: "phone",
      title: "Phone Number",
      type: "string",
      group: "content",
      description: "Falls back to the Site Settings phone when empty.",
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
    defineField({ name: "seoTitle", title: "SEO Title", type: "string", group: "seo" }),
    defineField({
      name: "seoDescription",
      title: "SEO Description",
      type: "text",
      rows: 3,
      group: "seo",
    }),
  ],
  preview: { prepare: () => ({ title: "Contact Page" }) },
});
