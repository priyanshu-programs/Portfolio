import type { StructureResolver } from "sanity/structure";

const SINGLETONS: { id: string; title: string }[] = [
  { id: "siteSettings", title: "Site Settings" },
  { id: "hero", title: "Hero" },
  { id: "aboutWork", title: "About / Work Section" },
  { id: "about", title: "About Page" },
  { id: "services", title: "Services Section" },
  { id: "ctaCollage", title: "CTA / Collage Section" },
  { id: "floatingMenu", title: "Floating Menu" },
];

export const structure: StructureResolver = (S) =>
  S.list()
    .title("Content")
    .items([
      ...SINGLETONS.map((s) =>
        S.listItem()
          .title(s.title)
          .id(s.id)
          .child(S.document().schemaType(s.id).documentId(s.id))
      ),
      S.divider(),
      S.documentTypeListItem("tag").title("Tags"),
      S.documentTypeListItem("workProject").title("Work Projects"),
    ]);
