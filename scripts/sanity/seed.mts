/**
 * Seeds Sanity with the site's current content — the exact copy used as
 * fallbacks in the section components, plus the real images from public/images.
 *
 * Run with:  npm run sanity:seed
 * Requires SANITY_API_TOKEN (Editor role) in .env.local. Idempotent:
 *  - Sanity image assets are content-addressed, so re-uploading a file returns
 *    the same asset id.
 *  - Singletons use fixed _ids (their schema name) via createOrReplace.
 *  - Work projects use deterministic _ids (workProject-01…), also createOrReplace.
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

async function uploadRemote(
  url: string,
  filename: string
): Promise<ImageRef | null> {
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    const asset = await client.assets.upload("image", buf, { filename });
    console.log(`  ↑ ${filename} (remote) → ${asset._id}`);
    return imageRef(asset._id);
  } catch (e) {
    console.warn(`  ⚠ skipped ${filename} (${url}): ${(e as Error).message}`);
    return null;
  }
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
    uploadLocal("hero-portrait.png"),
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

  // Work project thumbnails/covers/gallery currently reuse remote Unsplash
  // placeholders; pull them into Sanity so the seeded site renders identically.
  console.log("Uploading recent-work placeholder images…");
  const recentWorkUrls = [
    "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=640&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?q=80&w=640&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1634017839464-5c339afa60f0?q=80&w=640&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=640&auto=format&fit=crop",
  ];
  const recentWorkRaw = await Promise.all(
    recentWorkUrls.map((url, i) => uploadRemote(url, `recent-work-${i + 1}.jpg`))
  );
  // Any placeholder that 404'd falls back to a working one (or the portrait as
  // a last resort) so every popout row still has a valid image.
  const firstOkRecent = recentWorkRaw.find(Boolean) ?? heroPortrait;
  const recentWorkImages = recentWorkRaw.map((img) => img ?? firstOkRecent);

  console.log("Writing documents…");
  const singletons = [
    {
      _id: "siteSettings",
      _type: "siteSettings",
      name: "Priyanshu Roy",
      email: "priyanshuroy.official19@gmail.com",
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
        {
          _key: "para2",
          text: "Most sites look like templates because identity and execution were decided by different people at different times. I work at the point where they become the same decision.",
          accents: ["identity and execution"],
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

  /** Gallery slides reuse the recent-work placeholders until real shots exist. */
  const gallerySlides = (caption: string[]) =>
    caption.map((text, i) => ({
      _key: `slide${i + 1}`,
      image: recentWorkImages[i % recentWorkImages.length],
      caption: text,
    }));

  const workProjects = [
    // Thumbnails and covers reuse the recent-work placeholders above until real
    // project shots exist; bgColor shows while the image loads.
    //
    // pageBg is deliberately varied: TWICE is dark, AETHER warm light, and
    // NURA HEALTH leaves it empty to exercise the cream fallback.
    //
    // textColor/navColor are left unset everywhere so the derived-ink path is
    // what the seeded site exercises. Set either in the Studio to override it.
    {
      _id: "workProject-01",
      _type: "workProject",
      order: 1,
      visible: true,
      pinnedHome: true,
      id: "01",
      title: "TWICE",
      slug: { _type: "slug", current: "twice" },
      category: "Interaction & Development",
      services: "Design + Development",
      year: "2026",
      tags: ["development", "interaction"],
      bgColor: "#F1F1F1",
      thumbnail: recentWorkImages[0],
      cover: recentWorkImages[0],
      pageBg: "#1E1C28",
      accent: "#7BE0AD",
      summary: "TWICE — an interaction-led storefront built for momentum.",
      liveUrl: "https://example.com",
      challenge: [
        "The existing storefront treated every product the same way, so the pieces that deserved attention got none of it.",
        "Anything we added had to survive a slow connection — the audience browses on mobile, mid-commute.",
      ],
      approach: [
        "We rebuilt the browse experience around a single scroll narrative, letting each product arrive on its own terms.",
        "Motion is used sparingly and always tied to intent, so the page still reads clearly with animation switched off.",
      ],
      galleryHeading: "Pixels with Purpose",
      gallerySubheading:
        "Explore the screens that bring the experience to life.",
      gallery: gallerySlides([
        "Landing — the scroll narrative opens",
        "Product detail with pinned specs",
        "Cart and checkout in one pass",
      ]),
    },
    {
      _id: "workProject-02",
      _type: "workProject",
      order: 2,
      visible: true,
      pinnedHome: true,
      id: "02",
      title: "AETHER",
      slug: { _type: "slug", current: "aether" },
      category: "Brand Identity & Web",
      services: "Brand + Web",
      year: "2025",
      tags: ["design", "development"],
      bgColor: "#E0D9D1",
      thumbnail: recentWorkImages[1],
      cover: recentWorkImages[1],
      pageBg: "#F4EFEA",
      summary: "AETHER — an identity system that holds up at every size.",
      challenge: [
        "AETHER had a logo and little else: no type scale, no colour rules, and no guidance for the team shipping pages weekly.",
      ],
      approach: [
        "We built the identity as a small set of decisions rather than a document — a type scale, four colours, and one spacing rhythm.",
        "The site then became the reference implementation, so the rules are visible in the product instead of a PDF.",
      ],
      gallerySubheading: "Identity applied across the marketing surface.",
      gallery: gallerySlides([
        "Type scale in use",
        "Colour applied to editorial layouts",
      ]),
    },
    {
      _id: "workProject-03",
      _type: "workProject",
      order: 3,
      visible: true,
      pinnedHome: true,
      id: "03",
      title: "NURA HEALTH",
      slug: { _type: "slug", current: "nura-health" },
      category: "Fullstack Architecture",
      services: "Architecture + Development",
      year: "2025",
      tags: ["development"],
      bgColor: "#48494A",
      thumbnail: recentWorkImages[2],
      cover: recentWorkImages[2],
      // pageBg intentionally omitted → falls back to the default cream.
      summary: "NURA HEALTH — clinical data made legible under load.",
      challenge: [
        "Clinicians were reading patient history across four systems, and the handover notes lived in a fifth.",
      ],
      approach: [
        "One timeline, one source of truth, and a summary that answers the first question a clinician actually asks.",
      ],
      gallery: gallerySlides(["Patient timeline", "Handover summary"]),
    },
  ];

  const docs: Array<Record<string, unknown> & { _id: string; _type: string }> =
    [...singletons, ...workProjects];
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
