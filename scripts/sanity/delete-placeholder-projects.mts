/**
 * One-off cleanup: removes the three invented case studies the seed script used
 * to create — TWICE (workProject-01), AETHER (workProject-02) and NURA HEALTH
 * (workProject-03).
 *
 * They were placeholder content, not the site owner's work: stock Unsplash
 * photography and fabricated copy. Because they were the only workProject
 * documents in the dataset, they were also everything /work and the home page
 * displayed.
 *
 * They additionally carried `tags` as plain strings where the schema declares an
 * array of references, so `tags[]->` resolved every entry to null and crashed
 * /work with "Cannot read properties of null (reading 'slug')".
 *
 * Run:  npm run sanity:delete-placeholders          # dry run, lists what it would delete
 *       npm run sanity:delete-placeholders -- --yes # actually delete
 *
 * Safe to run more than once; already-absent documents are reported and skipped.
 * Only these three fixed ids are ever touched — it takes no arguments naming
 * other documents, so it cannot be pointed at real work by accident.
 */
import { getWriteClient } from "../../src/lib/sanity/writeClient";

/** Fixed ids, matching the deterministic ones the old seed used. */
const PLACEHOLDER_IDS = [
  "workProject-01",
  "workProject-02",
  "workProject-03",
] as const;

const confirmed = process.argv.includes("--yes");

const client = getWriteClient();

const found = await client.fetch<
  { _id: string; title?: string; slug?: string }[]
>(`*[_id in $ids]{ _id, title, "slug": slug.current }`, {
  ids: [...PLACEHOLDER_IDS],
});

if (found.length === 0) {
  console.log("✓ Nothing to do — none of the placeholder projects exist.");
  process.exit(0);
}

console.log(`Found ${found.length} placeholder project(s):`);
for (const doc of found) {
  console.log(`  • ${doc._id} — ${doc.title ?? "(untitled)"} (/work/${doc.slug ?? "?"})`);
}

// Drafts shadow published documents under a `drafts.` prefix. Deleting only the
// published id would leave an editable draft behind that reappears in the
// Studio, so both are removed.
const draftIds = found.map((doc) => `drafts.${doc._id}`);

if (!confirmed) {
  console.log(
    "\nDry run — nothing was deleted.\n" +
      "Re-run with --yes to delete these documents and any drafts of them:\n" +
      "  npm run sanity:delete-placeholders -- --yes"
  );
  process.exit(0);
}

const tx = client.transaction();
for (const doc of found) tx.delete(doc._id);
for (const id of draftIds) tx.delete(id);
await tx.commit();

console.log(`\n✓ Deleted ${found.length} placeholder project(s) and any drafts.`);
console.log(
  "  /work now has no projects and will render its empty state until you add\n" +
    "  real ones in the Studio. The seed script no longer recreates these."
);
