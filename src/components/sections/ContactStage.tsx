"use client";

import {
  useActionState,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import gsap from "gsap";

import { submitContact } from "@/app/contact/actions";
import { useSiteContent } from "@/components/ContentProvider";
import CalendlyEmbed from "@/components/ui/CalendlyEmbed";
import BloomFieldGradient from "@/components/ui/BloomFieldGradient";
import { LiquidMetalButton } from "@/components/ui/liquid-metal-button";
import NumberedField from "@/components/ui/NumberedField";
import {
  FIELD_MAX_LENGTH,
  INITIAL_CONTACT_STATE,
  type ContactFieldName,
} from "@/lib/contact/validate";

const DEFAULT_NAME = "Priyanshu Roy";
const DEFAULT_EMAIL = "priyanshuroy.academics@gmail.com";
const DEFAULT_PHONE = "+91 80746 65471";
const DEFAULT_PROFILE_IMAGE =
  "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200&h=200";
const DEFAULT_SOCIALS = [
  { label: "LinkedIn", href: "https://linkedin.com" },
  { label: "GitHub", href: "https://github.com" },
  { label: "Twitter", href: "https://twitter.com" },
];

/** Fallback copy, used whenever the Sanity `contact` singleton has no value set. */
const COPY = {
  heading: "Let's start a project together",
  submitIdle: "Send it!",
  submitPending: "Sending",
  successHeading: "Message sent.",
  successBody:
    "If you want to move faster, pick a time now. Otherwise I'll reply by email.",
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
  const contact = content?.contact;
  const ownerName = content?.settings?.name ?? DEFAULT_NAME;
  const ownerEmail = contact?.email ?? content?.settings?.email ?? DEFAULT_EMAIL;
  const ownerPhone = contact?.phone ?? content?.settings?.phone ?? DEFAULT_PHONE;
  const profileImage = contact?.profileImage ?? DEFAULT_PROFILE_IMAGE;
  const socials = contact?.socials?.length
    ? contact.socials
    : content?.settings?.socials?.length
      ? content.settings.socials
      : DEFAULT_SOCIALS;
  const heading = contact?.heading ?? COPY.heading;
  const successHeading = contact?.successHeading ?? COPY.successHeading;
  const successBody = contact?.successBody ?? COPY.successBody;
  const submitLabel = contact?.submitLabel ?? COPY.submitIdle;
  const submitPendingLabel = contact?.submitPendingLabel ?? COPY.submitPending;
  const showBackgroundGradient = contact?.showBackgroundGradient ?? false;
  const firstName = ownerName.trim().split(/\s+/)[0];

  const [state, formAction, pending] = useActionState(
    submitContact,
    INITIAL_CONTACT_STATE
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLSpanElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const timingRef = useRef<HTMLInputElement>(null);

  // Bridges the form → success DOM swap across the collapse animation: the
  // form collapses first (still mounted), then this flips to mount the
  // success block and play its reveal, instead of swapping instantly.
  const [showSuccessContent, setShowSuccessContent] = useState(false);

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

  // ── Land at the top of the page ───────────────────────────────────────────
  // The form is far taller than the success panel that replaces it, and the
  // footer is a full-viewport flow sibling of this page (see layout.tsx). Left
  // alone, the swap shrinks the document mid-commit, the browser clamps scrollY
  // to the new maximum, and the visitor is dumped into the footer.
  //
  // Going to 0 is what makes that impossible rather than merely survivable:
  // scroll position 0 is the one place no document-height change can clamp, so
  // the swap needs no height reservation to protect it. Earlier revisions
  // scrolled to the success block instead and had to pin the container's height
  // across the unmount, then release the pin once the tween landed — but the
  // release itself changed document height under the scroll that had just
  // finished aiming at it, which is exactly the stutter this replaced.
  //
  // useLayoutEffect, not useEffect: this runs synchronously after the DOM swap
  // and before paint, so no frame ever shows the success block at the old
  // scroll position. The reveal effect below is a plain useEffect on the same
  // dependency, so it necessarily plays after this has already landed.
  useLayoutEffect(() => {
    if (!showSuccessContent) return;

    // Instant, so there is no travel to interrupt and no reduced-motion
    // variant to consider — a jump is already the reduced-motion behavior.
    const lenis = window.__lenis;
    if (lenis) {
      // `force` because Lenis ignores scrollTo while stopped; same rationale as
      // SmoothScroll.tsx's route-change reset, which this mirrors.
      lenis.scrollTo(0, { immediate: true, force: true });
    }
    window.scrollTo(0, 0);

    // Lenis derives its scroll limit from live layout; tell it the document
    // just got shorter rather than waiting for it to notice. Safe to do after
    // the fact here — the viewport is already parked at 0, so the recomputed
    // limit has nothing to clamp.
    lenis?.resize();
  }, [showSuccessContent]);

  // ── Entrance ────────────────────────────────────────────────────────────
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      const rows = gsap.utils.toArray<HTMLElement>(".contact-field");
      const targets = [...rows, ".contact-submit"];
      const heading = headingRef.current;

      if (reduced) {
        gsap.set(targets, { opacity: 1, y: 0 });
        gsap.set(heading, { yPercent: 0, opacity: 1, filter: "blur(0px)" });
        return;
      }

      gsap.set(heading, { yPercent: 110, opacity: 0, filter: "blur(6px)" });

      const playEntrance = () => {
        gsap.to(heading, {
          yPercent: 0,
          opacity: 1,
          filter: "blur(0px)",
          duration: 0.75,
          ease: "power3.out",
        });

        gsap.fromTo(
          targets,
          { opacity: 0, y: 24 },
          { opacity: 1, y: 0, duration: 0.5, stagger: 0.08, ease: "power3.out", delay: 0.1 }
        );
      };

      if (document.fonts?.ready) {
        document.fonts.ready.then(playEntrance);
      } else {
        playEntrance();
      }
    }, containerRef);

    return () => ctx.revert();
  }, []);

  // ── Submit success: collapse the form ──────────────────────────────────
  // Fields fade out top-to-bottom, then the form clips shut from the bottom
  // up. The form's box height is deliberately held fixed throughout (only
  // clipPath moves) — Lenis continuously re-derives the page's scrollable
  // extent from live layout, so animating actual `height` here shrank the
  // document frame-by-frame and dragged the viewport down toward the footer
  // as it went. Clipping keeps document height constant until the single,
  // one-shot layout change when showSuccessContent flips the DOM over.
  //
  // That last layout change needs no height reservation of its own: the effect
  // above sends the viewport to 0 in the same pre-paint commit, and nothing
  // clamps at 0. So this animation only has to keep the height steady for as
  // long as the visitor is still looking at their old scroll position — which
  // is precisely what clipPath does and animating `height` would not.
  useEffect(() => {
    if (!isSuccess) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setShowSuccessContent(true);
      return;
    }

    const formEl = formRef.current;
    if (!formEl) {
      setShowSuccessContent(true);
      return;
    }

    const ctx = gsap.context(() => {
      const rows = gsap.utils.toArray<HTMLElement>(".contact-field", formEl);
      gsap.set(formEl, { overflow: "hidden" });

      const tl = gsap.timeline({
        onComplete: () => setShowSuccessContent(true),
      });

      tl.to([...rows, ".contact-submit"], {
        opacity: 0,
        y: -16,
        duration: 0.35,
        stagger: 0.05,
        ease: "power2.in",
      });

      // Marks where the field fade-out ends, so the clip below can be anchored
      // to *that* rather than to the timeline's running end. Without this, the
      // heading tween inserted after it would extend the end and drag the clip
      // out of sync — a relative "-=" offset would silently mean something
      // different depending on insertion order.
      tl.addLabel("fieldsOut");

      // The prompt heading leaves at the same time the fields do, as the exact
      // inverse of its entrance (yPercent 110 → 0, blur 6 → 0, see the entrance
      // effect above) so arrival and departure read as one gesture. Its
      // overflow-hidden wrapper is the mask; nothing extra is needed.
      //
      // Position 0 — parallel with the fields, not after them. The heading sits
      // above the form, so sequencing it later would leave the prompt hanging
      // over an already-empty form for a beat.
      if (headingRef.current) {
        tl.to(
          headingRef.current,
          {
            yPercent: -110,
            opacity: 0,
            filter: "blur(6px)",
            duration: 0.45,
            ease: "power3.in",
          },
          0
        );
      }

      tl.to(
        formEl,
        {
          clipPath: "inset(0% 0% 100% 0%)",
          duration: 0.5,
          ease: "power3.inOut",
        },
        "fieldsOut-=0.1"
      );
    }, containerRef);

    return () => ctx.revert();
  }, [isSuccess]);

  // ── Submit success: reveal "Got it." ───────────────────────────────────
  // Word-mask reveal, matching AboutStage's reveal-word pattern, followed by
  // the success body copy and Calendly embed fading in after the text settles.
  useEffect(() => {
    if (!showSuccessContent) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const ctx = gsap.context(() => {
      const words = gsap.utils.toArray<HTMLElement>(".reveal-inner");
      const body = gsap.utils.toArray<HTMLElement>(".contact-success-body");
      const calendly = gsap.utils.toArray<HTMLElement>(".contact-calendly");

      if (reduced) {
        gsap.set(words, { y: "0%", opacity: 1, rotateZ: 0, filter: "blur(0px)" });
        gsap.set([...body, ...calendly], { opacity: 1, y: 0, scale: 1 });
        return;
      }

      const tl = gsap.timeline({ defaults: { ease: "expo.out" } });

      if (words.length) {
        tl.fromTo(
          words,
          { y: "120%", opacity: 0, rotateZ: 5, filter: "blur(6px)" },
          {
            y: "0%",
            opacity: 1,
            rotateZ: 0,
            filter: "blur(0px)",
            duration: 0.7,
            stagger: 0.02,
          }
        );
      }

      if (body.length) {
        tl.fromTo(
          body,
          { opacity: 0, y: 16 },
          { opacity: 1, y: 0, duration: 0.5 },
          words.length ? "-=0.3" : 0
        );
      }

      // The scheduler is its own beat, held back until the confirmation has
      // fully settled. Previously it shared a tween with the body copy and so
      // arrived on the same frame — confirmation and sales pitch landing
      // together, which reads as transactional. The gap is the whole point:
      // the visitor gets told their message went through, and only then gets
      // offered a faster path.
      //
      // Transform-only, and on the wrapper rather than the iframe — scaling an
      // iframe forces a re-raster of third-party content. The wrapper's fixed
      // height (see CalendlyEmbed) is untouched, so nothing here shifts layout.
      if (calendly.length) {
        tl.fromTo(
          calendly,
          { opacity: 0, y: 24, scale: 0.98 },
          { opacity: 1, y: 0, scale: 1, duration: 0.6, ease: "power3.out" },
          "+=0.6"
        );
      }
    }, containerRef);

    return () => ctx.revert();
  }, [showSuccessContent]);

  // ── Error focus ─────────────────────────────────────────────────────────
  // Move the caret to the first thing that needs fixing, and shake it — a
  // scrolled-away error is otherwise invisible on a page this tall.
  useEffect(() => {
    if (state.status !== "error") return;

    const firstBad = FIELDS.find((f) => fieldErrors[f.name]);
    if (!firstBad) return;

    const el = formRef.current?.querySelector<HTMLElement>(`#${firstBad.name}`);
    if (!el) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    el.focus({ preventScroll: true });

    // Not scrollIntoView: globals.css forces `scroll-behavior: auto` under
    // html.lenis, so the smooth request degrades to an instant native teleport
    // that Lenis then drifts back from. Going through Lenis keeps it one motion.
    const lenis = window.__lenis;
    if (lenis) {
      lenis.scrollTo(el, {
        offset: -(window.innerHeight / 2),
        duration: reduced ? 0 : 0.8,
        force: true,
      });
    } else {
      el.scrollIntoView({
        block: "center",
        behavior: reduced ? "auto" : "smooth",
      });
    }

    if (!reduced) {
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

  // `no-overflow`, not `overflow-hidden`: the latter makes this section a scroll
  // container, and the sidebar's `position: sticky` then resolves against *this*
  // box instead of the page — which has no scrollable overflow, so the sidebar
  // never sticks and just flows with the form. `.no-overflow` is
  // `overflow-x: clip`, which clips without establishing a scrollport. Same
  // pattern as AboutStage, whose sticky column works. Nothing here needed
  // vertical clipping: the gradient is `inset: 0`, and its own root clips the
  // blob layers internally.
  return (
    <section ref={containerRef} className="no-overflow relative w-full">
      {/* ── Animated Bloom Field mesh-gradient backdrop (Sanity toggle) ──── */}
      {showBackgroundGradient && (
        <BloomFieldGradient className="pointer-events-none z-0" />
      )}
      <div className="relative z-10 mx-auto w-full max-w-[1400px] px-6 py-[clamp(5rem,12vh,8rem)] md:px-[40px] lg:flex lg:gap-24">
        {/* ── Left: Heading and Form ────────────────────────── */}
        {/* Widens to the full container on success. The scheduler is a fixed-
            layout third-party page: inside the 65% column it gets ~800px, which
            is below the width Calendly needs for its desktop layout but above
            the point where it collapses to its mobile one — so it overflowed
            and showed its own scrollbars. Those scrollbars can't be styled
            (cross-origin iframe; the global scrollbar-hiding rules in
            globals.css stop at the iframe boundary), so the only real fix is to
            stop the overflow by giving it room. */}
        <div
          className={`w-full flex flex-col gap-16 lg:gap-24 lg:py-[6vh] ${
            showSuccessContent ? "lg:w-full" : "lg:w-[65%]"
          }`}
        >
          {/* One heading for the whole flow. The prompt masks up and out as the
              form collapses, and the confirmation masks up and in to the same
              slot at the same size — so the page never shows two headings, and
              never shows none. Keeping "Let's start a project together" mounted
              alongside the confirmation was the old behaviour, and it left the
              page asking a question the visitor had just answered. */}
          {/* max-w widens on success: 12ch is tuned to break the prompt across
              two lines, but it would also break "Message sent." mid-phrase.
              The confirmation should land as one unbroken line where it fits. */}
          <h1
            className={`font-medium leading-[1.1] tracking-[-0.03em] text-ink ${
              showSuccessContent ? "max-w-[20ch]" : "max-w-[12ch]"
            }`}
            style={{ fontSize: "clamp(3.5rem, 8vw, 6rem)" }}
          >
            {showSuccessContent ? (
              // Per word, so the reveal effect below can stagger them. Same
              // .reveal-word / .reveal-inner pair AboutStage uses.
              successHeading.split(" ").map((word, i) => (
                <span
                  key={i}
                  className="reveal-word inline-block overflow-hidden align-bottom mr-[0.25em]"
                >
                  <span className="reveal-inner inline-block will-change-transform">
                    {word}
                  </span>
                </span>
              ))
            ) : (
              <span className="inline-block overflow-hidden align-bottom">
                <span
                  ref={headingRef}
                  className="contact-heading-inner inline-block will-change-transform"
                >
                  {heading}
                </span>
              </span>
            )}
          </h1>

          <div>
            {/* Status announcements */}
            <div aria-live="polite" className="sr-only">
              {pending ? "Sending your message." : ""}
              {isSuccess ? "Message sent." : ""}
            </div>

            {showSuccessContent ? (
              <div>
                {/* The success heading itself renders in the <h1> above. */}
                <p
                  className="contact-success-body max-w-[38ch] text-ink"
                  style={{ fontSize: "clamp(1rem, 1.15vw, 1.2rem)", lineHeight: 1.5 }}
                >
                  {successBody}
                </p>

                <div className="contact-calendly">
                  {/* Narrow on the discriminant: name/email live only on the
                      success variant, and showSuccessContent is a separate
                      boolean TypeScript can't use to narrow `state`. */}
                  <CalendlyEmbed
                    name={state.status === "success" ? state.name : undefined}
                    email={state.status === "success" ? state.email : undefined}
                  />
                </div>
              </div>
            ) : (
              <form ref={formRef} action={formAction} noValidate>
                {/* Honeypot */}
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

                <div className="flex flex-col">
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
                  <p role="alert" className="mt-10 text-[15px] text-wine border-t border-divider/60 pt-8">
                    {formError}{" "}
                    <a href={mailtoHref} className="underline underline-offset-4">
                      Open a prefilled email instead.
                    </a>
                  </p>
                ) : null}

                <div className="contact-submit border-t border-divider/60 mt-0 py-8 lg:py-10 md:pl-[88px]">
                  <LiquidMetalButton
                    type="submit"
                    disabled={pending}
                    aria-busy={pending}
                    label={submitLabel}
                  >
                    {pending ? submitPendingLabel : submitLabel}
                  </LiquidMetalButton>
                </div>
              </form>
            )}
          </div>
        </div>

        {/* ── Right: Contact Details Sidebar ─────────────────────── */}
        {/* Sticky on desktop so it holds its position while the left column's
            heading + form scroll past it; plain stacked flow on mobile.
            Unmounted on success: it exists to offer a way to make contact, and
            the visitor has just done that. Removing it is also what frees the
            35% the scheduler needs — see the width note on the left column. */}
        {!showSuccessContent && (
        <div className="contact-sidebar w-full lg:w-[35%] flex flex-col gap-12 mt-20 lg:sticky lg:top-[12vh] lg:self-start lg:flex-none lg:pl-12">
          {/* Profile pic and arrow */}
          <div className="flex flex-col gap-6">
             <div className="w-20 h-20 rounded-full bg-divider/30 overflow-hidden">
                <img
                  src={profileImage}
                  alt="Profile"
                  className="w-full h-full object-cover"
                />
             </div>
          </div>
          
          {/* Info blocks */}
          <div className="flex flex-col gap-10 text-[17px] tracking-[-0.01em] text-ink font-medium">
            <div>
               <h4 className="text-[#858EA3] text-[11px] font-semibold uppercase tracking-widest mb-4">Contact Details</h4>
               <a href={`mailto:${ownerEmail}`} className="block hover:underline mb-1 w-fit">{ownerEmail}</a>
               <a href={`tel:${ownerPhone.replace(/[^+\d]/g, "")}`} className="block hover:underline w-fit">{ownerPhone}</a>
            </div>

            <div>
               <h4 className="text-[#858EA3] text-[11px] font-semibold uppercase tracking-widest mb-4">Socials</h4>
               <ul className="flex flex-col gap-1">
                 {socials.map((social) => (
                   <li key={social.href}>
                     <a href={social.href} target="_blank" rel="noopener noreferrer" className="hover:underline w-fit block">
                       {social.label}
                     </a>
                   </li>
                 ))}
               </ul>
            </div>
          </div>
        </div>
        )}
      </div>
    </section>
  );
}
