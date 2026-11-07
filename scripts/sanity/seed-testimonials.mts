/**
 * Seeds the "Testimonials Section" singleton with the 8 placeholder entries the
 * component used to hardcode, so they can be edited (or deleted) in the Studio.
 *
 * Run with:  npm run sanity:seed-testimonials
 * Requires SANITY_API_TOKEN (Editor role) in .env.local.
 *
 * Safe to re-run: the document is written with createIfNotExists, so once it
 * exists (and has possibly been edited in the Studio) this does nothing to it.
 * Deliberately NOT part of seed.mts, whose createOrReplace would wipe edits.
 * Portraits are Unsplash placeholders, uploaded as Sanity assets
 * (content-addressed, so re-uploads return the same asset).
 */
import type { SanityClient } from "@sanity/client";
import { getWriteClient } from "../../src/lib/sanity/writeClient";

const DOC_ID = "testimonials";

const PLACEHOLDERS = [
  { name: "Lorem Ipsum", role: "Founder", company: "Lorem Studio", quote: "Lorem ipsum dolor sit amet, consectetur adipiscing elit", photo: "1534528741775-53994a69daeb" },
  { name: "Dolor Amet", role: "Creative Director", company: "Ipsum & Co.", quote: "Sed ut perspiciatis unde omnis iste natus error", photo: "1500648767791-00dcc994a43e" },
  { name: "Consectetur Elit", role: "Head of Brand", company: "Dolor Labs", quote: "At vero eos et accusamus et iusto odio dignissimos", photo: "1494790108377-be9c29b29330" },
  { name: "Tempor Incididunt", role: "Co-founder", company: "Magna Aliqua", quote: "Nemo enim ipsam voluptatem quia voluptas sit", photo: "1507003211169-0a1dd7228f2d" },
  { name: "Veniam Quis", role: "Marketing Lead", company: "Nostrud Group", quote: "Neque porro quisquam est qui dolorem ipsum", photo: "1438761681033-6461ffad8d80" },
  { name: "Ullamco Laboris", role: "Product Owner", company: "Aliquip Ltd.", quote: "Ut enim ad minima veniam, quis nostrum exercitationem", photo: "1506794778202-cad84cf45f1d" },
  { name: "Commodo Consequat", role: "Director", company: "Irure Partners", quote: "Quis autem vel eum iure reprehenderit qui in ea", photo: "1544005313-94ddf0286df2" },
  { name: "Fugiat Nulla", role: "Founder", company: "Pariatur Studio", quote: "Temporibus autem quibusdam et aut officiis debitis", photo: "1517841905240-472988babdf9" },
];

async function uploadUnsplash(client: SanityClient, id: string) {
  const url = `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&crop=faces&q=80&w=800&h=1000&fm=jpg`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetching ${url} failed: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const asset = await client.assets.upload("image", buf, {
    filename: `testimonial-${id}.jpg`,
  });
  console.log(`  ↑ ${id} → ${asset._id}`);
  return asset._id;
}

async function main() {
  const client = getWriteClient();

  const existing = await client.fetch<{ n: number } | null>(
    `*[_id == $id][0]{ "n": count(items) }`,
    { id: DOC_ID }
  );
  if (existing) {
    console.log(
      `Testimonials document already exists (${existing.n ?? 0} entries); leaving it as is.`
    );
    return;
  }

  console.log("Uploading portraits…");
  const assetIds = await Promise.all(
    PLACEHOLDERS.map((p) => uploadUnsplash(client, p.photo))
  );

  const doc = {
    _id: DOC_ID,
    _type: "testimonials",
    items: PLACEHOLDERS.map((p, i) => ({
      _key: `t${i + 1}`,
      _type: "testimonial",
      name: p.name,
      role: p.role,
      company: p.company,
      quote: p.quote,
      photo: {
        _type: "image",
        asset: { _type: "reference", _ref: assetIds[i] },
      },
      hidden: false,
    })),
  };

  await client.createIfNotExists(doc);
  console.log(`✓ Seeded ${doc.items.length} testimonials into "${DOC_ID}".`);
}

main().catch((err) => {
  console.error("\n✗ Seed failed:", err.message ?? err);
  process.exit(1);
});
