import "server-only";

/**
 * Per-IP submission throttle for the contact form.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * READ THIS BEFORE TRUSTING IT.
 *
 * This is an in-memory limiter on a serverless platform, which means it is
 * weak by construction:
 *
 *   - Each Vercel instance has its own heap, so each keeps its own counter.
 *   - Vercel scales instances horizontally under load, so a burst of concurrent
 *     requests will land on several cold instances, each seeing "first request
 *     from this IP".
 *   - Instances are recycled aggressively, so counters vanish without warning.
 *
 * What it does stop: an impatient double-click, a stuck retry loop, and a naive
 * single-threaded script. What it does not stop: anyone actually trying.
 *
 * It ships anyway because it costs ~30 lines and catches the common case. It is
 * documented this loudly because an *undocumented* limiter is worse than none —
 * the next reader assumes the endpoint is protected and stops looking.
 *
 * The real control is a rate-limit rule on /contact in the Vercel firewall,
 * configured in the dashboard: it runs at the edge, needs no code, and needs no
 * database. That belongs in the deploy checklist. If abuse ever materialises
 * past that, the upgrade is a shared counter in Upstash Redis — worth doing at
 * that point and not before.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_PER_WINDOW = 3;

/** IP → timestamps of submissions still inside the window. */
const hits = new Map<string, number[]>();

/**
 * Drop expired entries.
 *
 * Called on each check rather than on a timer: a serverless instance can be
 * frozen between requests, so an interval isn't guaranteed to run, and without
 * pruning the map would grow for the life of the instance.
 */
function prune(now: number) {
  for (const [key, timestamps] of hits) {
    const live = timestamps.filter((t) => now - t < WINDOW_MS);
    if (live.length === 0) {
      hits.delete(key);
    } else {
      hits.set(key, live);
    }
  }
}

/**
 * Record an attempt from `key` and report whether it may proceed.
 *
 * `key` is the client IP. Note it is only as trustworthy as the hop that set
 * `x-forwarded-for` — on Vercel the edge overwrites that header, so it can be
 * trusted here; on a host that merely forwards it, this value is
 * attacker-controlled and the limiter becomes decorative.
 */
export function allowSubmission(key: string): boolean {
  const now = Date.now();
  prune(now);

  const timestamps = hits.get(key) ?? [];
  if (timestamps.length >= MAX_PER_WINDOW) {
    return false;
  }

  timestamps.push(now);
  hits.set(key, timestamps);
  return true;
}
