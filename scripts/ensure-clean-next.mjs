/**
 * Deletes `.next` when the cache in it belongs to a different directory.
 *
 * Wired as `predev` in package.json, so npm runs it before `next dev`.
 *
 * ── WHY THIS EXISTS ──────────────────────────────────────────────────────
 * This project arrived as a folder copy ("23-09-26 backup Priyanshu"), and the
 * copy brought `.next` with it. Turbopack's build output stores ABSOLUTE paths:
 * `.next/required-server-files.json` still named
 * `C:\Users\rijup\OneDrive\Documents\1abc- Proj\Priyanshu` as both `appDir` and
 * `config.turbopack.root`, a directory that does not exist on this machine.
 *
 * Turbopack resolves modules relative to that root and will not look outside it
 * ("Files outside of the project root are not resolved" — see
 * node_modules/next/dist/docs/01-app/03-api-reference/05-config/01-next-config-js/turbopack.md),
 * so `node_modules/next` fell outside the root and every HMR version poll
 * panicked:
 *
 *   Failed to write app endpoint /_not-found/page
 *   Caused by: - Next.js package not found
 *   - Execution of Project::hmr_version_state failed
 *   - Execution of get_next_server_import_map failed
 *
 * A failed HMR version makes the dev client fall back to a full document
 * reload, which polls again and panics again — an endless reload loop on every
 * route (the failing endpoint was `/_not-found/page`, not any page of ours).
 *
 * `.next` is gitignored, so this cannot arrive through git and a one-time
 * delete would not prevent it. Any future backup/restore, drive move, or
 * OneDrive sync reintroduces it. Hence a guard rather than a cleanup.
 */

import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";

const NEXT_DIR = path.resolve(process.cwd(), ".next");

/** Our own marker. Load-bearing for the dev-only case: a `.next` that never had
 *  a production build in it has no `required-server-files.json` to check, so
 *  without this stamp a copied dev cache would sail straight through. */
const STAMP = path.join(NEXT_DIR, ".project-path");

/** Windows is case-insensitive and tolerates mixed separators, so compare
 *  resolved paths case-folded. A false positive here deletes a healthy cache on
 *  every start and turns a fast dev boot into a full rebuild — worse, and more
 *  confusing, than the bug being guarded against. */
const samePath = (a, b) => {
  if (!a || !b) return true; // Nothing to compare — not evidence of a mismatch.
  return path.resolve(a).toLowerCase() === path.resolve(b).toLowerCase();
};

const nuke = (reason) => {
  console.log(`[ensure-clean-next] Clearing .next — ${reason}`);
  rmSync(NEXT_DIR, { recursive: true, force: true });
};

/** Absolute paths this cache claims to belong to, from Next's own build output. */
const claimedPaths = () => {
  const manifest = path.join(NEXT_DIR, "required-server-files.json");
  if (!existsSync(manifest)) return [];

  const parsed = JSON.parse(readFileSync(manifest, "utf8"));
  return [parsed?.appDir, parsed?.config?.turbopack?.root].filter(Boolean);
};

function main() {
  // Fresh clone or already-clean tree: nothing to validate, and creating the
  // stamp here would mean writing into a directory Next has not made yet.
  if (!existsSync(NEXT_DIR)) return;

  const here = process.cwd();

  for (const claimed of claimedPaths()) {
    if (!samePath(claimed, here)) {
      nuke(`built for ${claimed}, but this project is at ${here}`);
      return;
    }
  }

  if (existsSync(STAMP)) {
    const stamped = readFileSync(STAMP, "utf8").trim();
    if (!samePath(stamped, here)) {
      nuke(`cache belongs to ${stamped}, but this project is at ${here}`);
      return;
    }
  }

  // Cache is ours — (re)stamp it so the next run can check cheaply, and so a
  // `.next` that predates this script gets a stamp on first use.
  writeFileSync(STAMP, here, "utf8");
}

/* Never block the dev server. A guard that throws would turn an occasional
   stale-cache problem into "npm run dev is broken", which is strictly worse.
   On any unexpected failure, say so and let Next start. */
try {
  main();
} catch (error) {
  console.warn(
    `[ensure-clean-next] Skipped cache check: ${error?.message ?? error}`
  );
}
