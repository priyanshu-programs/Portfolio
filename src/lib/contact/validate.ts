/**
 * Contact form field definitions, state shape, and validation.
 *
 * Deliberately dependency-free and side-effect-free: this module is imported by
 * the server action (which needs it) and is safe to import from a client
 * component (which may eventually want to mirror a rule). Nothing here touches
 * the network, the filesystem, or `process.env`.
 *
 * There is no zod in this project and this is the only form, so the rules are
 * hand-rolled. If a second form appears, that's the moment to reach for a schema
 * library rather than copying this file.
 */

export const CONTACT_FIELDS = [
  "name",
  "email",
  "organization",
  "services",
  "message",
] as const;

export type ContactFieldName = (typeof CONTACT_FIELDS)[number];

export type ContactValues = Partial<Record<ContactFieldName, string>>;
export type ContactFieldErrors = Partial<Record<ContactFieldName, string>>;

/**
 * The value `useActionState` carries between renders.
 *
 * A discriminated union rather than a bag of optionals, so the success branch
 * can't be read while errors are still populated.
 *
 * `success` carries `name` and `email` because they prefill the Calendly embed.
 * Routing the prefill through the server means the values shown to Calendly are
 * exactly what passed validation and went out in the email — never raw input.
 *
 * `error` echoes `values` back so a submission survives a failed validation pass
 * with JavaScript disabled. Without this the browser re-renders from the server
 * with empty inputs and the visitor loses everything they typed. The inputs read
 * it via `defaultValue`.
 */
export type ContactState =
  | { status: "idle" }
  | {
      status: "error";
      fieldErrors: ContactFieldErrors;
      /** Set when the failure wasn't the visitor's fault (e.g. mail send failed). */
      formError?: string;
      values: ContactValues;
    }
  | { status: "success"; name: string; email: string };

export const INITIAL_CONTACT_STATE: ContactState = { status: "idle" };

/**
 * Maximum accepted lengths. Mirrored onto the inputs as `maxLength`, but that
 * attribute is a convenience for the visitor — these are the values actually
 * enforced, on the server, on every submission.
 */
export const FIELD_MAX_LENGTH: Record<ContactFieldName, number> = {
  name: 80,
  // RFC 5321's maximum address length.
  email: 254,
  organization: 120,
  services: 200,
  // Arbitrary but deliberate: bounds the email body and the request payload.
  message: 4000,
};

/**
 * Email shape check, intentionally stricter than RFC 5322.
 *
 * A fully spec-compliant email regex is a well-known footgun — it accepts
 * quoted strings, comments, and bracketed IP literals that no contact form
 * wants. This requires a dot in the domain (so `someone@localhost` fails) and
 * bans whitespace along with < > " ' , ; : and backslash.
 *
 * That character ban is not cosmetic. Those are precisely the characters needed
 * to inject a mail header or spoof a display name in the Reply-To we build from
 * this value, so shape validation and header safety are the same check here.
 */
const EMAIL_PATTERN =
  /^[^\s@,;:<>"'\\]+@[^\s@.,;:<>"'\\]+(\.[^\s@.,;:<>"'\\]+)+$/;

/** Single-line fields must not contain newlines — see EMAIL_PATTERN's note. */
const CONTAINS_NEWLINE = /[\r\n]/;

export type ContactValidationResult =
  | { ok: true; data: Record<ContactFieldName, string> }
  | { ok: false; fieldErrors: ContactFieldErrors };

/**
 * Validate the five submitted fields.
 *
 * Values are expected to be already trimmed by the caller. Every rule runs so
 * the visitor sees all their mistakes at once rather than one per round trip.
 */
export function validateContact(values: ContactValues): ContactValidationResult {
  const fieldErrors: ContactFieldErrors = {};

  const name = values.name ?? "";
  const email = values.email ?? "";
  const organization = values.organization ?? "";
  const services = values.services ?? "";
  const message = values.message ?? "";

  if (!name) {
    fieldErrors.name = "Tell me what to call you.";
  } else if (name.length < 2) {
    fieldErrors.name = "That looks a little short.";
  } else if (name.length > FIELD_MAX_LENGTH.name) {
    fieldErrors.name = `Keep it under ${FIELD_MAX_LENGTH.name} characters.`;
  } else if (CONTAINS_NEWLINE.test(name)) {
    fieldErrors.name = "Names can't span multiple lines.";
  }

  if (!email) {
    fieldErrors.email = "I need somewhere to reply.";
  } else if (email.length > FIELD_MAX_LENGTH.email) {
    fieldErrors.email = "That address is too long to be real.";
  } else if (CONTAINS_NEWLINE.test(email) || !EMAIL_PATTERN.test(email)) {
    fieldErrors.email = "That email doesn't look right.";
  }

  if (organization.length > FIELD_MAX_LENGTH.organization) {
    fieldErrors.organization = `Keep it under ${FIELD_MAX_LENGTH.organization} characters.`;
  } else if (CONTAINS_NEWLINE.test(organization)) {
    fieldErrors.organization = "Keep this to a single line.";
  }

  if (services.length > FIELD_MAX_LENGTH.services) {
    fieldErrors.services = `Keep it under ${FIELD_MAX_LENGTH.services} characters.`;
  } else if (CONTAINS_NEWLINE.test(services)) {
    fieldErrors.services = "Keep this to a single line.";
  }

  if (!message) {
    fieldErrors.message = "Don't leave me guessing.";
  } else if (message.length < 10) {
    fieldErrors.message =
      "A sentence or two is plenty — I just need somewhere to start.";
  } else if (message.length > FIELD_MAX_LENGTH.message) {
    fieldErrors.message = `That's over ${FIELD_MAX_LENGTH.message} characters. Trim it and the rest can wait for the call.`;
  }

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, fieldErrors };
  }

  return {
    ok: true,
    data: { name, email, organization, services, message },
  };
}
