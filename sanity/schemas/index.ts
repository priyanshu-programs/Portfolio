import { siteSettings } from "./siteSettings";
import { hero } from "./hero";
import { aboutWork } from "./aboutWork";
import { about } from "./about";
import { services } from "./services";
import { ctaCollage } from "./ctaCollage";
import { floatingMenu } from "./floatingMenu";
import { workProject } from "./workProject";
import { tag } from "./tag";

export const schemaTypes = [
  siteSettings,
  hero,
  aboutWork,
  about,
  services,
  ctaCollage,
  floatingMenu,
  workProject,
  tag,
];

/** Document types that exist as a single editable record (not a collection). */
export const singletonTypes = new Set([
  "siteSettings",
  "hero",
  "aboutWork",
  "about",
  "services",
  "ctaCollage",
  "floatingMenu",
]);
