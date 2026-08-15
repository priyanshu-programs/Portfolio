import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";
import { visionTool } from "@sanity/vision";
import { colorInput } from "@sanity/color-input";
import { schemaTypes, singletonTypes } from "./sanity/schemas";
import { structure } from "./sanity/structure";

// Hardcoded (not read from process.env): the Studio bundle bakes these in at
// build time, and env vars don't reliably survive into `sanity deploy`'s
// build step. Project ID is public info, not a secret, so this is safe.
const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || "i0fv16h3";
const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";

export default defineConfig({
  name: "portfolio-studio",
  title: "Priyanshu Roy — Content",
  projectId,
  dataset,
  // colorInput registers the "color" field type used by workProject.hoverBg.
  plugins: [structureTool({ structure }), visionTool(), colorInput()],
  schema: {
    types: schemaTypes,
    // Hide singletons from the global "create new" menu.
    templates: (templates) =>
      templates.filter(({ schemaType }) => !singletonTypes.has(schemaType)),
  },
  document: {
    // Remove create/delete actions for singleton documents.
    actions: (input, context) =>
      singletonTypes.has(context.schemaType)
        ? input.filter(
            ({ action }) =>
              action && ["publish", "discardChanges", "restore"].includes(action)
          )
        : input,
  },
});
