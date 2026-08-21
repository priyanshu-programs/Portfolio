/**
 * Seeds Sanity with the site's current content — the exact copy used as
 * fallbacks in the section components, plus the real images from public/images.
 *
 * Run with:  npm run sanity:seed
 * Requires SANITY_API_TOKEN (Editor role) in .env.local. Idempotent:
 *  - Sanity image assets are content-addressed, so re-uploading a file returns
 *    the same asset id.
 *  - Singletons use fixed _ids (their schema name) via createOrReplace.
 *
 * Seeds singletons only. Work projects are authored in the Studio and are never
 * written from here — see the note above `docs` for why.
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import type { SanityClient } from "@sanity/client";
import { getWriteClient } from "../../src/lib/sanity/writeClient";

// Assigned at the start of main() so a missing token surfaces as a clean
// message via main().catch, not an uncaught error at import time.
let client: SanityClient;
const IMAGES_DIR = path.join(process.cwd(), "public", "images");

type ImageRef = {
  _type: "image";
  asset: { _type: "reference"; _ref: string };
};

function imageRef(assetId: string): ImageRef {
  return { _type: "image", asset: { _type: "reference", _ref: assetId } };
}

async function uploadLocal(file: string): Promise<ImageRef> {
  const buf = await readFile(path.join(IMAGES_DIR, file));
  const asset = await client.assets.upload("image", buf, { filename: file });
  console.log(`  ↑ ${file} → ${asset._id}`);
  return imageRef(asset._id);
}

async function main() {
  client = getWriteClient();

  console.log("Uploading images…");
  const [
    heroPortrait,
    ornament,
    ornament2,
    aboutImg,
    servicesImg,
    cta5,
    cta2,
    cta3,
    cta4,
    cta1,
    cta6,
    handLeft,
    handRight,
    twoHands,
  ] = await Promise.all([
    uploadLocal("hero-portrait.webp"),
    uploadLocal("ornament-1.jpg"),
    uploadLocal("ornament-2.png"),
    uploadLocal("about.png"),
    uploadLocal("services.png"),
    uploadLocal("cta1-img-5.png"),
    uploadLocal("cta1-img-2.png"),
    uploadLocal("cta1-img-3.png"),
    uploadLocal("cta1-img-4.png"),
    uploadLocal("cta1-img-1.png"),
    uploadLocal("cta1-img-6.png"),
    uploadLocal("hand left.png"),
    uploadLocal("hand right.png"),
    uploadLocal("cta-2hands.png"),
  ]);

  console.log("Writing documents…");
  const singletons = [
    {
      _id: "siteSettings",
      _type: "siteSettings",
      name: "Priyanshu Roy",
      email: "priyanshuroy.official19@gmail.com",
      phone: "+91 80746 65471",
      timezone: "IST — UTC +5:30",
      socials: [
        { _key: "instagram", label: "Instagram", href: "#" },
        { _key: "twitter", label: "Twitter", href: "#" },
        { _key: "linkedin", label: "Linkedin", href: "#" },
      ],
      navLinks: [
        { _key: "work", label: "Work", href: "/work" },
        { _key: "about", label: "About", href: "/about" },
        { _key: "services", label: "Services", href: "/#services" },
        { _key: "contact", label: "Contact", href: "/#contact" },
      ],
      seoTitle: "Priyanshu Roy — Brand Designer & Web Developer",
      seoDescription:
        "Most sites look like templates. Mine don't. Identity and execution, together.",
    },
    {
      _id: "hero",
      _type: "hero",
      pillLabel: "Open to\nprojects",
      heading: "Brand Designer\n& Web Developer",
      paragraph: "Most sites look like\ntemplates. Mine don't.",
      marqueeText: "Priyanshu Roy",
      loaderText: "LET'S TALK • LET'S TALK • LET'S TALK •",
      portrait: heroPortrait,
    },
    {
      _id: "aboutWork",
      _type: "aboutWork",
      quote:
        "A website is the sharpest version of\na brand or it's a missed opportunity.\nThere's not much in between.",
      subParagraph:
        "Identity without execution is just a mood board. Execution\nwithout identity is just a website.\nI work at the point where they become the same thing.",
    },
    {
      _id: "about",
      _type: "about",
      title: "About",
      // Accents must be verbatim substrings of their paragraph — the splitter
      // matches them literally against the source text.
      // Placeholder body copy: the page shipped with none, so this is starter
      // text to replace in the Studio rather than established wording.
      paragraphs: [
        {
          _key: "para1",
          text: "I design brand identities and build the websites that carry them, so the two arrive as one piece of work rather than a handoff.",
          accents: ["brand identities"],
        },
      ],
      // Each slot pairs its photo with the blurb set beside it.
      slots: [
        {
          _key: "slot1",
          image: ornament,
          alt: "Priyanshu at work",
          blurb: {
            text: "Looking for an apprenticeship starting September. Eager to join an innovative team and contribute to ambitious projects.",
            accents: ["apprenticeship"],
          },
        },
        {
          _key: "slot2",
          image: ornament2,
          alt: "A recent identity project",
          blurb: {
            text: "I'm available for freelance missions worldwide, on your ambitious projects and international collaborations.",
            accents: [
              "freelance missions",
              "worldwide",
              "your",
              "ambitious projects",
            ],
          },
        },
        {
          _key: "slot3",
          image: aboutImg,
          alt: "Studio detail",
          blurb: {
            text: "Driven by craft and curiosity, always looking to push each project a little further.",
            accents: ["craft"],
          },
        },
      ],
      socials: [
        { _key: "github", label: "GitHub", href: "#" },
        { _key: "linkedin", label: "LinkedIn", href: "#" },
        { _key: "behance", label: "Behance", href: "#" },
      ],
      seoTitle: "About — Priyanshu Roy",
      seoDescription:
        "Brand identity and web development, made together.",
    },
    {
      _id: "contact",
      _type: "contact",
      heading: "Let's start a project together",
      successHeading: "Got it.",
      successBody: "I'll come back to you shortly. If it's easier, pick a time now.",
      submitLabel: "Send it!",
      submitPendingLabel: "Sending",
    },
    {
      _id: "services",
      _type: "services",
      // heading intentionally left empty → the component keeps its rich,
      // hand-composed default heading (inline ornament + colored span).
      ornament,
      landscape: servicesImg,
      cards: [
        { _key: "c1", title: "Brand\nDesign", copy: "Identity that earns recognition before a single word is spoken.", iconKey: "trend" },
        { _key: "c2", title: "Web\nDevelopment", copy: "Fast, scalable websites engineered to perform and convert.", iconKey: "nodes" },
        { _key: "c3", title: "UI / UX\nDesign", copy: "Experiences that feel effortless from the very first click.", iconKey: "wand" },
      ],
    },
    {
      _id: "ctaCollage",
      _type: "ctaCollage",
      headline: "no more forgettable work",
      revealHeadline: "Good work starts with a conversation.",
      linkText: "Let's have one.",
      // Order matches the IMAGES layout array in CtaCollage.tsx (slots 1–6).
      collage: [
        { ...cta5, _key: "i1" },
        { ...cta2, _key: "i2" },
        { ...cta3, _key: "i3" },
        { ...cta4, _key: "i4" },
        { ...cta1, _key: "i5" },
        { ...cta6, _key: "i6" },
      ],
      handLeft,
      handRight,
      twoHands,
    },
    {
      _id: "floatingMenu",
      _type: "floatingMenu",
      tags: ["Identity", "Visualisation", "Interactive"],
      image: servicesImg,
    },
  ];

  // NOTE: this seed deliberately creates NO work projects.
  //
  // It used to write three invented case studies (TWICE, AETHER, NURA HEALTH)
  // with stock photography and fabricated copy. They were never the site
  // owner's work, but they were the only projects in the dataset, so they were
  // what /work and the home page actually displayed — and because the seed is
  // createOrReplace, every re-run resurrected them.
  //
  // They also carried `tags: ["development", ...]` as plain strings while the
  // schema declares tags as an array of *references*. Sanity stored the
  // strings; `tags[]->` then dereferenced each to null, which crashed /work
  // with "Cannot read properties of null (reading 'slug')".
  //
  // Real projects are authored in the Studio. If you ever reintroduce seeded
  // projects here, tags must be written as references, never strings:
  //   tags: [{ _type: "reference", _key: "t1", _ref: "<tag document _id>" }]
  // (`floatingMenu.tags` above is a different field — a plain array of string —
  // and is correct as it stands.)
  const docs: Array<Record<string, unknown> & { _id: string; _type: string }> =
    singletons;
  const tx = client.transaction();
  for (const doc of docs) {
    tx.createOrReplace(doc);
  }
  const result = await tx.commit();
  console.log(`✓ Seeded ${result.results.length} documents.`);
  for (const r of result.results) console.log(`  • ${r.id}`);
}

main().catch((err) => {
  console.error("\n✗ Seed failed:", err.message ?? err);
  process.exit(1);
});
