"use client";

import { useState } from "react";

/**
 * One numbered row of the contact form: index, question, bare underlined input.
 *
 * Extracted rather than inlined five times because the accessible wiring —
 * matching `id`/`htmlFor`, and `aria-describedby` pointing at an error node that
 * only sometimes exists — is exactly the kind of thing that silently drifts out
 * of sync when it's copy-pasted.
 */

type NumberedFieldProps = {
  /** Displayed index, e.g. "01". Decorative — hidden from screen readers. */
  index: string;
  name: string;
  label: string;
  placeholder: string;
  required?: boolean;
  multiline?: boolean;
  maxLength: number;
  error?: string;
  defaultValue?: string;
  autoComplete?: string;
};

export default function NumberedField({
  index,
  name,
  label,
  placeholder,
  required = false,
  multiline = false,
  maxLength,
  error,
  defaultValue,
  autoComplete,
}: NumberedFieldProps) {
  // Drives the "filled" underline so the form visibly accumulates progress as
  // it's completed. Uncontrolled input with a separate emptiness flag, so that
  // `defaultValue` still works for the no-JS round trip.
  const [hasValue, setHasValue] = useState(Boolean(defaultValue));

  const errorId = `${name}-error`;

  // The underline. Tailwind's border utilities are not enough on their own here:
  // globals.css sets `border-color: transparent` on every element inside
  // @layer base, and unlayered CSS beats utilities regardless of specificity, so
  // an explicit colour class is mandatory or the line renders invisible.
  const underline = error
    ? "border-wine"
    : hasValue
      ? "border-ink"
      : "border-divider";

  const fieldClass = [
    "peer w-full bg-transparent border-0 border-b py-3 text-ink outline-none",
    "placeholder:text-muted transition-colors duration-300",
    "focus:border-ink",
    underline,
  ].join(" ");

  const fieldStyle = { fontSize: "clamp(1.25rem, 2.2vw, 1.75rem)" };

  const shared = {
    id: name,
    name,
    placeholder,
    required,
    maxLength,
    defaultValue,
    autoComplete,
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": error ? errorId : undefined,
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => setHasValue(event.target.value.length > 0),
    className: fieldClass,
    style: fieldStyle,
  };

  return (
    <div className="contact-field">
      <span
        aria-hidden="true"
        className="block text-[13px] tracking-[0.04em] text-muted"
      >
        {index}
      </span>

      {/* The question is the label itself, at the site's nav voice. */}
      <label
        htmlFor={name}
        className="mt-2 block text-[19.36px] text-ink"
        style={{ fontWeight: 363, letterSpacing: "-0.01em" }}
      >
        {label}
      </label>

      <div className="mt-3">
        {multiline ? (
          <textarea {...shared} rows={4} className={`${fieldClass} resize-none`} />
        ) : (
          <input {...shared} type="text" />
        )}
      </div>

      {error ? (
        <p
          id={errorId}
          role="alert"
          className="mt-2 text-[13px] tracking-[0.01em] text-wine"
        >
          {error}
        </p>
      ) : null}
    </div>
  );
}
