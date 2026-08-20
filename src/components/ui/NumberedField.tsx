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
  // The line above the field.
  const topBorder = error
    ? "border-wine"
    : hasValue
      ? "border-ink"
      : "border-divider/60"; // Use a subtle border for light mode

  const fieldClass = [
    "w-full bg-transparent border-0 py-2 text-ink outline-none",
    "placeholder:text-muted transition-colors duration-300",
  ].join(" ");

  const fieldStyle = { fontSize: "clamp(1.1rem, 1.8vw, 1.5rem)" };

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
    <div className={`contact-field border-t py-8 lg:py-10 ${topBorder} transition-colors duration-300 group`}>
      <div className="flex flex-col md:flex-row gap-2 md:gap-10">
        <span
          aria-hidden="true"
          className="block text-[14px] md:text-[16px] tracking-[0.04em] text-muted md:w-12 shrink-0 md:pt-1"
        >
          {index}
        </span>

        <div className="flex-1 flex flex-col gap-3">
          {/* The question is the label itself */}
          <label
            htmlFor={name}
            className="block text-ink text-2xl md:text-3xl"
            style={{ fontWeight: 400, letterSpacing: "-0.02em" }}
          >
            {label}
          </label>

          <div className="relative">
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
      </div>
    </div>
  );
}
