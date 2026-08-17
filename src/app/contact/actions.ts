"use server";

import { headers } from "next/headers";

import { sendContactEmail } from "@/lib/contact/email";
import { allowSubmission } from "@/lib/contact/rateLimit";
import {
  CONTACT_FIELDS,
  validateContact,
  type ContactState,
  type ContactValues,
} from "@/lib/contact/validate";
import { getSiteContent } from "@/lib/sanity/getSiteContent";

/**
 * Contact form submission handler.
 *
 * Server Functions are reachable by direct POST, not only through the form that
 * renders them — Next's own docs are emphatic about this. There is no session to
 * authenticate here (a public contact form has no user), which means the abuse
 * controls below *are* the entire defence, and every one of them has to live in
 * this function rather than in the component.
 */

/** Hidden field bots fill in and humans never see. */
const HONEYPOT_FIELD = "website";
/** Hidden field stamped with Date.now() when the form mounts. */
const TIMING_FIELD = "t";

/** Anything faster than this is not someone reading five questions. */
const MIN_FILL_MS = 2_500;
/** Older than this and the page has been sitting open, or replayed, for hours. */
const MAX_FORM_AGE_MS = 2 * 60 * 60 * 1000;

const FALLBACK_TO_EMAIL = "priyanshuroy.academics@gmail.com";
/**
 * Resend's sandbox sender. Works with no DNS setup, but will only deliver to
 * the address the Resend account itself is registered under — which is fine
 * here, since the only recipient is the site owner. Swap for an address on a
 * domain verified in Resend to send from your own domain.
 */
const FALLBACK_FROM_EMAIL = "Portfolio <onboarding@resend.dev>";

const SEND_FAILURE_MESSAGE =
  "Something broke on my end and the message didn't send. Email me directly and it'll reach me.";

/**
 * Read one field as a string.
 *
 * `FormData.get` returns `File | string | null`, and a hand-rolled multipart
 * POST can put a `File` where a string is expected — so the type guard is a
 * check, not housekeeping.
 *
 * Deliberately not `Object.fromEntries(formData)`: that pulls in React's
 * `$ACTION_*` keys (as the Next docs note) and would let a caller inject
 * arbitrary extra keys into anything downstream that iterates the result.
 */
function readField(formData: FormData, key: string): string {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Best-effort client IP.
 *
 * First entry of `x-forwarded-for` is the original client; the rest are proxies.
 * Spoofable in general — trusted here only because Vercel's edge overwrites the
 * header. See the note in rateLimit.ts.
 */
async function clientIp(): Promise<string> {
  const store = await headers();
  const forwarded = store.get("x-forwarded-for");
  return forwarded?.split(",")[0]?.trim() || "unknown";
}

/**
 * Looks like a bot, so pretend it worked.
 *
 * Returning success rather than an error is the point: an error response tells
 * an automated submitter exactly which guard tripped, and invites a retry with
 * that field cleared. Silence gives it nothing to learn from.
 */
function fakeSuccess(values: ContactValues): ContactState {
  return {
    status: "success",
    name: values.name ?? "",
    email: values.email ?? "",
  };
}

export async function submitContact(
  _prevState: ContactState,
  formData: FormData
): Promise<ContactState> {
  const values: ContactValues = {};
  for (const field of CONTACT_FIELDS) {
    values[field] = readField(formData, field);
  }

  // ── Bot checks, before any real work ────────────────────────────────────
  if (readField(formData, HONEYPOT_FIELD)) {
    return fakeSuccess(values);
  }

  const stamped = Number(readField(formData, TIMING_FIELD));
  if (Number.isFinite(stamped) && stamped > 0) {
    const age = Date.now() - stamped;
    if (age < MIN_FILL_MS || age > MAX_FORM_AGE_MS) {
      return fakeSuccess(values);
    }
  }
  // An absent or unparseable stamp is treated as "unknown, allow" on purpose:
  // the value is written by JavaScript on mount, so rejecting empty would make
  // the form impossible to submit with JS disabled. The check is a filter for
  // naive bots, not a control — it's client-supplied and trivially forged.
  // Hardening it means minting an HMAC-signed timestamp server-side, which is
  // the upgrade path if this ever stops being enough.

  // ── Validation ──────────────────────────────────────────────────────────
  const result = validateContact(values);
  if (!result.ok) {
    return { status: "error", fieldErrors: result.fieldErrors, values };
  }

  // ── Throttle ────────────────────────────────────────────────────────────
  // After validation so that a visitor fixing a typo doesn't burn their quota.
  if (!allowSubmission(await clientIp())) {
    return {
      status: "error",
      fieldErrors: {},
      formError:
        "That's a few messages in quick succession — give it a few minutes, or email me directly.",
      values,
    };
  }

  // ── Send ────────────────────────────────────────────────────────────────
  // The recipient comes from config or the CMS, never from the submitted form:
  // taking it from FormData would turn this into an open relay.
  const content = await getSiteContent();
  const to =
    process.env.CONTACT_TO_EMAIL ||
    content?.settings?.email ||
    FALLBACK_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL || FALLBACK_FROM_EMAIL;

  const sent = await sendContactEmail(result.data, { to, from });

  if (!sent.ok) {
    // Logged server-side only. Provider errors name configuration and account
    // state, so they never go to the browser.
    console.error("[contact] send failed:", sent.reason);
    return {
      status: "error",
      fieldErrors: {},
      formError: SEND_FAILURE_MESSAGE,
      values,
    };
  }

  return {
    status: "success",
    name: result.data.name,
    email: result.data.email,
  };
}
