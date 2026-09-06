/**
 * One-off content fix: restores the line break in the first service card's
 * title.
 *
 * The three cards on the home page's services deck are authored as two-line
 * titles — the newline is content, not styling, and Services.tsx renders it
 * with `whitespace-pre-line` (see the card `<h3>` there). Cards 2 and 3 still
 * carry theirs ("Web\nDevelopment", "UI / UX\nDesign"); card 1 lost its own
 * when it was renamed from "Brand Design" to "Web Design" in the Studio, so it
 * renders on one line and sits visibly out of step with the other two.
 *
 * This patches the stored title from "Web Design" to "Web\nDesign". It is a
 * content fix — no component change is involved, because the rendering was
 * always correct.
 *
 * Run:  npm run sanity:fix-service-linebreak          # dry run, shows the diff
 *       npm run sanity:fix-service-linebreak -- --yes # write it
 *
 * Safe to run more than once: it matches on the exact expected text and reports
 * "already correct" (or "unexpected value") rather than writing blindly, so a
 * second run — or a run after someone has edited the title again — is a no-op.
 */
import { getWriteClient } from "../../src/lib/sanity/writeClient";

/** The card to touch, keyed as the seed script keys it. */
const CARD_KEY = "c1";
const EXPECTED = "Web Design";
const CORRECTED = "Web\nDesign";

const confirmed = process.argv.includes("--yes");

const client = getWriteClient();

const doc = await client.fetch<{
  _id: string;
  cards?: { _key: string; title?: string }[];
} | null>(`*[_type == "services"][0]{ _id, cards[]{ _key, title } }`);

if (!doc) {
  console.error('No "services" document found in this dataset.');
  process.exit(1);
}

const index = doc.cards?.findIndex((c) => c._key === CARD_KEY) ?? -1;
if (index === -1) {
  console.error(`No card with _key "${CARD_KEY}" on ${doc._id}.`);
  process.exit(1);
}

const current = doc.cards![index].title ?? "";

if (current === CORRECTED) {
  console.log("Already correct — title has its line break. Nothing to do.");
  process.exit(0);
}

if (current !== EXPECTED) {
  console.error(
    `Unexpected title on card ${CARD_KEY}: ${JSON.stringify(current)}\n` +
      `Expected ${JSON.stringify(EXPECTED)}. Someone has edited it since; ` +
      `refusing to overwrite. Fix it in the Studio instead.`
  );
  process.exit(1);
}

console.log(`${doc._id}  cards[${index}] (_key: ${CARD_KEY})`);
console.log(`  - ${JSON.stringify(current)}`);
console.log(`  + ${JSON.stringify(CORRECTED)}`);

if (!confirmed) {
  console.log("\nDry run. Re-run with --yes to write this change.");
  process.exit(0);
}

await client
  .patch(doc._id)
  .set({ [`cards[_key=="${CARD_KEY}"].title`]: CORRECTED })
  .commit();

console.log("\nWritten. The site revalidates on the site-content tag (60s).");
