import { createHash, timingSafeEqual } from "node:crypto";
import { revalidatePath, revalidateTag } from "next/cache";
import { NextResponse } from "next/server";

const TAG = "site-content";
const SECRET_HEADER = "x-sanity-webhook-secret";

/**
 * Constant-time secret comparison.
 *
 * Both sides are SHA-256'd first so the buffers are always 32 bytes:
 * timingSafeEqual throws on length mismatch, and that throw would itself leak
 * the expected secret's length.
 */
function secretMatches(provided: string, expected: string) {
  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

/**
 * On-demand revalidation endpoint for Sanity webhooks.
 *
 * Configure a Sanity webhook (Manage → API → Webhooks) to POST here on publish
 * with the secret in an `x-sanity-webhook-secret` header. Refreshes the
 * `site-content` tag used by getSiteContent, so edits go live without a
 * redeploy.
 *
 * The secret travels in a header, not the query string: URLs are written to
 * access logs, proxy logs, and browser history, and leak via `Referer`. POST
 * only, for the same reason a GET would be triggerable by any <img> tag on any
 * site the user visits.
 */
function revalidate(request: Request) {
  const secret = request.headers.get(SECRET_HEADER);

  if (!process.env.SANITY_REVALIDATE_SECRET) {
    return NextResponse.json(
      { revalidated: false, message: "Revalidation secret not configured." },
      { status: 500 }
    );
  }

  if (!secret || !secretMatches(secret, process.env.SANITY_REVALIDATE_SECRET)) {
    return NextResponse.json(
      { revalidated: false, message: "Invalid secret." },
      { status: 401 }
    );
  }

  // `{ expire: 0 }` is the documented profile for webhooks: it expires the tag
  // immediately so the next request blocks on fresh data, rather than the
  // stale-while-revalidate behaviour of "max" (which would serve the old page
  // once more before catching up).
  revalidateTag(TAG, { expire: 0 });

  // The content is fetched in the root layout and handed to every route via
  // ContentProvider, so the whole layout tree has to be invalidated too —
  // clearing the fetch entry alone leaves the prerendered pages stale.
  revalidatePath("/", "layout");

  return NextResponse.json({ revalidated: true, tag: TAG, now: Date.now() });
}

export async function POST(request: Request) {
  return revalidate(request);
}

// No GET handler by design. It existed for browser smoke-testing, but a GET
// that mutates cache state is reachable from any page's <img>/<link> and so is
// CSRF-triggerable. Smoke-test with an explicit POST instead:
//   curl -X POST -H "x-sanity-webhook-secret: $SANITY_REVALIDATE_SECRET" \
//     https://<host>/api/revalidate
