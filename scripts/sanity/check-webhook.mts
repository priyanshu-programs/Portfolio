/**
 * Exercises the /api/revalidate endpoint the way a Sanity webhook will, plus
 * the ways a request should be refused. Run: npm run sanity:check-webhook
 *
 * The secret moved from a query string to the `x-sanity-webhook-secret` header
 * and the GET handler was removed, which makes a misconfigured webhook fail
 * *silently* — Sanity logs a 401 in its own delivery log and the site simply
 * keeps serving stale content. This proves the endpoint end to end before the
 * dashboard is touched, so a later 401 is unambiguously the webhook's config
 * and not the route.
 *
 * Checks the rejections too, not just the happy path: they are the security
 * behaviour, and a route that 200s on a missing secret would pass a happy-path
 * test while being wide open.
 *
 * Usage:
 *   npm run sanity:check-webhook                       # http://localhost:3000
 *   npm run sanity:check-webhook https://your-domain   # deployed or tunnel
 *
 * Needs a server already running at the target; it does not start one.
 */

const target = (process.argv[2] ?? "http://localhost:3000").replace(/\/$/, "");
const endpoint = `${target}/api/revalidate`;
const secret = process.env.SANITY_REVALIDATE_SECRET;

// Same failure the route guards against: without a secret there is nothing to
// verify, and reporting "all checks passed" here would be actively misleading.
if (!secret) {
  console.error(
    "✗ SANITY_REVALIDATE_SECRET is not set.\n" +
      "  Add it to .env.local (any long random string), and set the same value\n" +
      "  in your host's environment variables if you are checking a deployment."
  );
  process.exit(1);
}

const HEADER = "x-sanity-webhook-secret";

type Check = {
  label: string;
  expected: number;
  /** Extra assertion on the body, for the success case. */
  body?: (json: unknown) => string | null;
  init: RequestInit;
};

const checks: Check[] = [
  {
    label: "POST with the correct secret",
    expected: 200,
    body: (json) =>
      (json as { revalidated?: boolean })?.revalidated === true
        ? null
        : `expected {"revalidated":true}, got ${JSON.stringify(json)}`,
    init: { method: "POST", headers: { [HEADER]: secret } },
  },
  {
    label: "POST with no secret header",
    expected: 401,
    init: { method: "POST" },
  },
  {
    label: "POST with a wrong secret",
    expected: 401,
    init: { method: "POST", headers: { [HEADER]: "not-the-secret" } },
  },
  {
    // Regression guard: the GET handler was removed deliberately. If it ever
    // comes back, cache state becomes mutable by any page that can load a URL.
    label: "GET (handler removed by design)",
    expected: 405,
    init: { method: "GET" },
  },
];

console.log(`Checking ${endpoint}\n`);

const failures: string[] = [];

for (const check of checks) {
  let res: Response;
  try {
    res = await fetch(endpoint, check.init);
  } catch (error) {
    // Almost always "server isn't running", which is worth saying plainly
    // rather than surfacing a bare ECONNREFUSED.
    const reason = error instanceof Error ? error.message : String(error);
    console.error(`✗ ${check.label}\n    could not reach ${endpoint} — ${reason}`);
    console.error(
      `\n✗ Is a server running at ${target}? Start one with \`npm run dev\` ` +
        "(or `npm run build && npm start`) and re-run."
    );
    process.exit(1);
  }

  if (res.status !== check.expected) {
    failures.push(
      `${check.label}: expected ${check.expected}, got ${res.status}`
    );
    console.error(`✗ ${check.label} — expected ${check.expected}, got ${res.status}`);
    continue;
  }

  if (check.body) {
    // Only the success case has a body contract; a non-JSON response there is
    // itself the failure.
    const json = await res.json().catch(() => null);
    const problem = check.body(json);
    if (problem) {
      failures.push(`${check.label}: ${problem}`);
      console.error(`✗ ${check.label} — ${problem}`);
      continue;
    }
  }

  console.log(`✓ ${check.label} → ${res.status}`);
}

if (failures.length) {
  console.error(`\n✗ ${failures.length} of ${checks.length} check(s) failed.`);
  // Deliberately never echo the secret, here or above — this output ends up in
  // terminals, CI logs and screenshots.
  console.error(
    "  A 401 on the correct-secret check means the running server's\n" +
      "  SANITY_REVALIDATE_SECRET differs from this shell's .env.local."
  );
  process.exit(1);
}

console.log(
  `\n✓ All ${checks.length} checks passed. Point the Sanity webhook at ` +
    `${endpoint}\n  with header ${HEADER} (POST, no query string).`
);
