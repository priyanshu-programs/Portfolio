import "server-only";

import { Resend } from "resend";

import type { ContactFieldName } from "./validate";

/**
 * Delivery of contact form submissions, via Resend.
 *
 * Everything a stranger typed ends up rendered as HTML in an inbox, so escaping
 * here is a security boundary, not formatting. See `escapeHtml`.
 */

type ContactSubmission = Record<ContactFieldName, string>;

/**
 * Escape the five characters that matter in HTML text and attribute contexts.
 *
 * `&` must be replaced first. Doing it later would re-encode the ampersands
 * introduced by the other replacements and render `&amp;lt;` in the inbox.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/**
 * Strip CR/LF from a value bound for a mail header.
 *
 * `validateContact` already rejects newlines in these fields, so this is
 * redundant today. It stays because validation and transport shouldn't be
 * coupled: a future change to the rules upstream shouldn't be able to open a
 * header injection downstream.
 *
 * Worth noting that the Resend SDK posts JSON over HTTPS rather than assembling
 * SMTP headers itself, so CRLF injection is structurally prevented at the
 * provider boundary too. Two independent reasons this is safe is the right
 * number for something that reaches an inbox.
 */
function headerSafe(value: string): string {
  return value.replace(/[\r\n]+/g, " ").trim();
}

/** Blank optionals render as an em-dash so the message keeps a scannable shape. */
const EMPTY = "—";

const LABELS: Record<ContactFieldName, string> = {
  name: "Name",
  email: "Email",
  organization: "Organization",
  services: "Services",
  message: "Message",
};

function buildHtml(submission: ContactSubmission, receivedAt: string): string {
  const row = (field: ContactFieldName) => {
    const raw = submission[field];
    const value = raw ? escapeHtml(raw) : EMPTY;
    // Newlines become <br> only after escaping, so a literal "<br>" typed into
    // the message stays literal.
    const rendered = field === "message" ? value.replace(/\n/g, "<br />") : value;

    return `
      <tr>
        <td style="padding:14px 0;border-bottom:1px solid #d7d7d8;vertical-align:top;width:140px;color:#858ea3;font-size:13px;letter-spacing:0.04em;text-transform:uppercase;">${LABELS[field]}</td>
        <td style="padding:14px 0;border-bottom:1px solid #d7d7d8;vertical-align:top;color:#1d222e;font-size:16px;line-height:1.55;">${rendered}</td>
      </tr>`;
  };

  return `<!doctype html>
<html>
  <body style="margin:0;padding:32px;background:#fffcfa;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
    <div style="max-width:640px;margin:0 auto;">
      <p style="margin:0 0 4px;color:#858ea3;font-size:13px;letter-spacing:0.04em;text-transform:uppercase;">New enquiry</p>
      <h1 style="margin:0 0 28px;color:#1d222e;font-size:26px;font-weight:500;letter-spacing:-0.02em;">${escapeHtml(submission.name)}</h1>
      <table style="width:100%;border-collapse:collapse;">
        ${(["email", "organization", "services", "message"] as const).map(row).join("")}
      </table>
      <p style="margin:28px 0 0;color:#858ea3;font-size:13px;">
        Received ${escapeHtml(receivedAt)} · Reply directly to this email to reach them.
      </p>
    </div>
  </body>
</html>`;
}

/** Plain-text alternative. Needs no escaping — nothing here is parsed as markup. */
function buildText(submission: ContactSubmission, receivedAt: string): string {
  return [
    "New enquiry",
    "",
    `Name:         ${submission.name}`,
    `Email:        ${submission.email}`,
    `Organization: ${submission.organization || EMPTY}`,
    `Services:     ${submission.services || EMPTY}`,
    "",
    "Message:",
    submission.message,
    "",
    `Received ${receivedAt}`,
    "Reply directly to this email to reach them.",
  ].join("\n");
}

export type SendResult = { ok: true } | { ok: false; reason: string };

/**
 * Send one submission to the site owner.
 *
 * `to` is resolved by the caller from environment/CMS config and never from the
 * submitted form data — otherwise the form would be an open relay.
 *
 * Returns a result rather than throwing: a mail outage should degrade to the
 * mailto fallback in the UI, not surface as a 500.
 */
export async function sendContactEmail(
  submission: ContactSubmission,
  options: { to: string; from: string }
): Promise<SendResult> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    return { ok: false, reason: "RESEND_API_KEY is not set." };
  }

  const receivedAt = new Date().toUTCString();
  const org = headerSafe(submission.organization);
  const subject = headerSafe(
    `New enquiry — ${submission.name}${org ? ` (${org})` : ""}`
  );

  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: options.from,
      to: options.to,
      subject,
      // The whole point of the integration: hitting Reply in the inbox
      // addresses the visitor, with no copy-paste.
      replyTo: headerSafe(submission.email),
      html: buildHtml(submission, receivedAt),
      text: buildText(submission, receivedAt),
    });

    if (error) {
      return { ok: false, reason: `${error.name}: ${error.message}` };
    }

    return { ok: true };
  } catch (cause) {
    return {
      ok: false,
      reason: cause instanceof Error ? cause.message : "Unknown send failure.",
    };
  }
}
