"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import gsap from "gsap";

import { submitContact } from "@/app/contact/actions";
import { useSiteContent } from "@/components/ContentProvider";
import CalendlyEmbed from "@/components/ui/CalendlyEmbed";
import NumberedField from "@/components/ui/NumberedField";
import {
  FIELD_MAX_LENGTH,
  INITIAL_CONTACT_STATE,
  type ContactFieldName,
} from "@/lib/contact/validate";

const DEFAULT_NAME = "Priyanshu Roy";
const DEFAULT_EMAIL = "priyanshuroy.academics@gmail.com";

/**
 * Every visitor-facing string, in one place.
 *
 * Copy is hardcoded for this pass by decision. Keeping it in a single const
 * means the eventual move to a Sanity `contactPage` singleton is one edit here
 * rather than a hunt through the JSX.
 */
const COPY = {
  heading: "Contact",
  subhead: "Tell me what you're building. I read everything that comes in.",
  submitIdle: "Send it",
  submitPending: "Sending",
  successHeading: "Got it.",
  successBody: "I'll come back to you shortly. If it's easier, pick a time now.",
  fallbackLead: "Or reach me directly at",
} as const;

/** Field order is the numbering — 01 through 05. */
const FIELDS: {
  name: ContactFieldName;
  label: string;
  placeholder: string;
  required?: boolean;
  multiline?: boolean;
  autoComplete?: string;
}[] = [
  {
    name: "name",
    label: "What's your name?",
    placeholder: "John Doe",
    required: true,
    autoComplete: "name",
  },
  {
    name: "email",
    label: "What's your email?",
    placeholder: "john@doe.com",
    required: true,
    autoComplete: "email",
  },
  {
    name: "organization",
    label: "What's the name of your organization?",
    placeholder: "John & Doe ®",
    autoComplete: "organization",
  },
  {
    name: "services",
    label: "What services are you looking for?",
    // Free text rather than a select: the placeholder is a comma-list, which a
    // select can't produce, and a boxed multi-select would break the bare
    // underline language every other field uses. The value is unstructured on
    // purpose — a human reads it in an inbox, nothing queries it.
    placeholder: "Web Design, Web Development ...",
  },
  {
    name: "message",
    label: "Your message",
    placeholder: "", // filled in at render — it uses the owner's first name
    required: true,
    multiline: true,
  },
];

export default function ContactStage() {
  const content = useSiteContent();
  const ownerName = content?.settings?.name ?? DEFAULT_NAME;
  const ownerEmail = content?.settings?.email ?? DEFAULT_EMAIL;
  const firstName = ownerName.trim().split(/\s+/)[0];

  const [state, formAction, pending] = useActionState(
    submitContact,
    INITIAL_CONTACT_STATE
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const timingRef = useRef<HTMLInputElement>(null);

  // Stamped on the client because the server has no idea when the page was
  // painted. Absent under no-JS, which the action treats as "unknown, allow".
  const [mountedAt] = useState(() => Date.now());
  useEffect(() => {
    if (timingRef.current) timingRef.current.value = String(mountedAt);
  }, [mountedAt]);

  const isSuccess = state.status === "success";
  const fieldErrors = state.status === "error" ? state.fieldErrors : {};
  const formError = state.status === "error" ? state.formError : undefined;
  const values = state.status === "error" ? state.values : {};

  // ── Entrance ────────────────────────────────────────────────────────────
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      const rows = gsap.utils.toArray<HTMLElement>(".contact-field");
      const targets = [".contact-lede", ...rows, ".contact-submit"];

      if (reduced) {
        gsap.set(targets, { opacity: 1, y: 0 });
        return;
      }

      gsap.fromTo(
        targets,
        { opacity: 0, y: 24 },
        { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: "power3.out" }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // ── Error focus ─────────────────────────────────────────────────────────
  // Move the caret to the first thing that needs fixing, and shake it — a
  // scrolled-away error is otherwise invisible on a page this tall.
  useEffect(() => {
    if (state.status !== "error") return;

    const firstBad = FIELDS.find((f) => fieldErrors[f.name]);
    if (!firstBad) return;

    const el = formRef.current?.querySelector<HTMLElement>(`#${firstBad.name}`);
    if (!el) return;

    el.focus({ preventScroll: true });
    el.scrollIntoView({ block: "center", behavior: "smooth" });

    if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      gsap.fromTo(
        el.closest(".contact-field"),
        { x: -4 },
        { x: 0, duration: 0.18, ease: "elastic.out(1, 0.35)" }
      );
    }
    // fieldErrors is derived from state; state is the real dependency.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  /**
   * Prefilled mailto, used when the send itself fails. One click recovers the
   * whole submission instead of asking the visitor to retype it.
   */
  const mailtoHref = (() => {
    const subject = `Enquiry from ${values.name || "the site"}`;
    const body = [
      values.organization ? `Organization: ${values.organization}` : null,
      values.services ? `Services: ${values.services}` : null,
      "",
      values.message ?? "",
    ]
      .filter((line) => line !== null)
      .join("\n");
    return `mailto:${ownerEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  })();

  return (
    <section ref={containerRef} className="relative w-full bg-cream">
      <div className="relative mx-auto w-full max-w-[1700px] px-6 py-[clamp(5rem,12vh,8rem)] md:px-[40px] lg:flex lg:gap-12">
        {/* ── Left: heading and direct contact ──────────────────────────
            Sticky on desktop, matching AboutStage — it holds position while
            the taller form column scrolls past. */}
        {/* h-fit, not justify-between: the form column is far taller than this
            one, and stretching to match would strand the email block in the
            middle of the viewport with nothing around it. */}
        <div className="lg:sticky lg:top-0 lg:flex lg:h-fit lg:w-[42%] lg:flex-none lg:flex-col lg:py-[14vh]">
          <div>
            {/* Smaller max than /about's 11.62rem: "Contact" is a longer word
                and would otherwise wrap or crowd the form column. */}
            <h1
              className="font-medium leading-[0.9] tracking-[-0.04em] text-ink"
              style={{
                fontSize: "clamp(3rem, 8vw, 7rem)",
                marginTop: "clamp(2.5rem, 6vw, 6rem)",
                marginLeft: "clamp(1.5rem, 6.2vw, 6.19rem)",
              }}
            >
              <span className="inline-block overflow-hidden align-bottom">
                <span className="inline-block">{COPY.heading}</span>
              </span>
            </h1>

            <p
              className="contact-lede max-w-[34ch] text-ink"
              style={{
                fontSize: "clamp(1rem, 1.15vw, 1.2rem)",
                lineHeight: 1.5,
                marginTop: "clamp(1.5rem, 4vw, 4.19rem)",
                marginLeft: "clamp(1.5rem, 6.2vw, 6.19rem)",
              }}
            >
              {COPY.subhead}
            </p>
          </div>

          <div
            className="flex flex-col gap-1"
            style={{
              marginTop: "clamp(1.5rem, 5vw, 5.06rem)",
              marginLeft: "clamp(1.5rem, 6.2vw, 6.19rem)",
            }}
          >
            <span className="text-caption text-muted">{COPY.fallbackLead}</span>
            <a
              href={`mailto:${ownerEmail}`}
              className="magnetic-hover inline-block w-fit py-1 text-[19.36px] text-ink transition-opacity duration-300 hover:opacity-70"
              style={{ fontWeight: 363, letterSpacing: "-0.01em" }}
            >
              {ownerEmail}
            </a>
            {content?.settings?.timezone ? (
              <span className="text-caption text-muted">
                {content.settings.timezone}
              </span>
            ) : null}
          </div>
        </div>

        {/* ── Right: the form, or the success panel ─────────────────────── */}
        <div className="mt-16 w-full lg:mt-0 lg:py-[14vh]">
          <div className="max-w-[52ch]">
            {/* Status announcements. Kept separate from the button, whose own
                label changes and so gets announced inconsistently. */}
            <div aria-live="polite" className="sr-only">
              {pending ? "Sending your message." : ""}
              {isSuccess ? "Message sent." : ""}
            </div>

            {isSuccess ? (
              <div>
                <h2
                  className="font-medium leading-[1.05] tracking-[-0.03em] text-ink"
                  style={{ fontSize: "clamp(2rem, 3.4vw, 3rem)" }}
                >
                  {COPY.successHeading}
                </h2>
                <p
                  className="mt-4 max-w-[38ch] text-ink"
                  style={{ fontSize: "clamp(1rem, 1.15vw, 1.2rem)", lineHeight: 1.5 }}
                >
                  {COPY.successBody}
                </p>

                <CalendlyEmbed name={state.name} email={state.email} />
              </div>
            ) : (
              <form ref={formRef} action={formAction} noValidate>
                {/* Honeypot. Positioned off-screen rather than display:none —
                    bots skip hidden and display:none fields, but fill this one.
                    tabIndex={-1} is not optional: without it a keyboard user
                    tabs into an invisible input and their submission is
                    silently discarded as spam. */}
                <div
                  aria-hidden="true"
                  style={{
                    position: "absolute",
                    left: "-9999px",
                    width: "1px",
                    height: "1px",
                    overflow: "hidden",
                  }}
                >
                  <label htmlFor="website">Leave this field empty</label>
                  <input
                    id="website"
                    type="text"
                    name="website"
                    tabIndex={-1}
                    autoComplete="off"
                  />
                </div>

                <input ref={timingRef} type="hidden" name="t" defaultValue="" />

                <div className="flex flex-col gap-16">
                  {FIELDS.map((field, i) => (
                    <NumberedField
                      key={field.name}
                      index={String(i + 1).padStart(2, "0")}
                      name={field.name}
                      label={field.label}
                      placeholder={
                        field.name === "message"
                          ? `Hello ${firstName}, can you help me with ...`
                          : field.placeholder
                      }
                      required={field.required}
                      multiline={field.multiline}
                      maxLength={FIELD_MAX_LENGTH[field.name]}
                      error={fieldErrors[field.name]}
                      defaultValue={values[field.name]}
                      autoComplete={field.autoComplete}
                    />
                  ))}
                </div>

                {formError ? (
                  <p role="alert" className="mt-10 text-[15px] text-wine">
                    {formError}{" "}
                    <a href={mailtoHref} className="underline underline-offset-4">
                      Open a prefilled email instead.
                    </a>
                  </p>
                ) : null}

                <div className="contact-submit mt-12">
                  <button
                    type="submit"
                    disabled={pending}
                    aria-busy={pending}
                    className="magnetic-hover inline-flex items-center gap-3 py-1 text-[19.36px] text-ink transition-opacity duration-300 hover:opacity-70 disabled:opacity-50"
                    style={{ fontWeight: 363, letterSpacing: "-0.01em" }}
                  >
                    {pending ? COPY.submitPending : COPY.submitIdle}
                    {pending ? (
                      <span
                        aria-hidden="true"
                        className="inline-block h-3 w-3 animate-spin rounded-full border border-ink border-t-transparent"
                      />
                    ) : (
                      <span aria-hidden="true">→</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
