import { about } from "./about";
import { aboutWork } from "./aboutWork";
import aboutWriteups from "./aboutWriteups";
import { contact } from "./contact";
import { ctaCollage } from "./ctaCollage";
import { floatingMenu } from "./floatingMenu";
import { hero } from "./hero";
import { services } from "./services";
import { siteSettings } from "./siteSettings";
import { tag } from "./tag";
import { testimonials } from "./testimonials";
import { workProject } from "./workProject";

export const schemaTypes = [
  siteSettings,
  hero,
  about,
  aboutWork,
  aboutWriteups,
  contact,
  services,
  testimonials,
  ctaCollage,
  floatingMenu,
  tag,
  workProject,
];

export const singletonTypes = new Set([
  "siteSettings",
  "hero",
  "aboutWork",
  "about",
  "contact",
  "services",
  "testimonials",
  "ctaCollage",
  "floatingMenu",
]);
