"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/**
 * Frosted-glass pill. Styling lives in globals.css under `.glass-button*`;
 * this component owns the DOM shape and the cursor-tracked specular highlight.
 *
 * Renders a <button> by default. Pass `as` to render anything else — the
 * homepage About me CTA uses `as={SmartLink}` so it stays a real anchor and
 * keeps prefetch, view transitions, and middle-click behaviour.
 */
const glassButtonVariants = cva("glass-button", {
  variants: {
    size: {
      default: "glass-button--default",
      sm: "glass-button--sm",
      lg: "glass-button--lg",
      icon: "glass-button--icon",
    },
  },
  defaultVariants: { size: "default" },
});

// At `icon` size the pill is square and only the arrow shows, so the label
// stays in the DOM for screen readers rather than being dropped.
const glassButtonTextVariants = cva("glass-button-text", {
  variants: {
    size: { default: "", sm: "", lg: "", icon: "sr-only" },
  },
  defaultVariants: { size: "default" },
});

/**
 * Filled chevron, kept as an inline path rather than a lucide icon: lucide's
 * arrows are stroked outlines, which renders as a visibly different glyph
 * against the `fill`-based `.glass-button-svg` treatment.
 */
const ChevronGlyph = () => (
  <svg
    className="glass-button-svg"
    viewBox="0 0 1024 1024"
    version="1.1"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden
  >
    <path d="M779.180132 473.232045 322.354755 16.406668c-21.413706-21.413706-56.121182-21.413706-77.534887 0-21.413706 21.413706-21.413706 56.122205 0 77.534887l418.057421 418.057421L244.819868 930.057421c-21.413706 21.413706-21.413706 56.122205 0 77.534887 10.706853 10.706853 24.759917 16.059767 38.767955 16.059767s28.061103-5.353938 38.767955-16.059767L779.180132 550.767955C800.593837 529.35425 800.593837 494.64575 779.180132 473.232045z" />
  </svg>
);

type GlassButtonOwnProps = VariantProps<typeof glassButtonVariants> & {
  /** Extra classes for the inner text span. */
  contentClassName?: string;
  /** Render the trailing dark circle and chevron. */
  withIcon?: boolean;
  children?: React.ReactNode;
};

export type GlassButtonProps<E extends React.ElementType = "button"> =
  GlassButtonOwnProps & { as?: E } & Omit<
      React.ComponentPropsWithoutRef<E>,
      keyof GlassButtonOwnProps | "as"
    >;

function GlassButtonImpl<E extends React.ElementType = "button">(
  {
    as,
    size,
    className,
    contentClassName,
    withIcon = true,
    children,
    onMouseMove,
    ...rest
  }: GlassButtonProps<E>,
  forwardedRef: React.Ref<Element>,
) {
  const Comp = (as ?? "button") as React.ElementType;
  const innerRef = React.useRef<HTMLElement | null>(null);

  // Own the node so the specular highlight works whether or not a caller
  // passed a ref, while still honouring one if they did.
  const setRef = React.useCallback(
    (node: HTMLElement | null) => {
      innerRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) {
        (forwardedRef as React.MutableRefObject<Element | null>).current = node;
      }
    },
    [forwardedRef],
  );

  const handleMouseMove = (event: React.MouseEvent<HTMLElement>) => {
    (onMouseMove as ((e: React.MouseEvent<HTMLElement>) => void) | undefined)?.(
      event,
    );
    const el = innerRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty("--mouse-x", `${event.clientX - rect.left}px`);
    el.style.setProperty("--mouse-y", `${event.clientY - rect.top}px`);
  };

  return (
    <Comp
      {...rest}
      ref={setRef}
      className={cn(glassButtonVariants({ size }), className)}
      onMouseMove={handleMouseMove}
    >
      <div className="glass-button-live-spec" aria-hidden />
      <span className={cn(glassButtonTextVariants({ size }), contentClassName)}>
        {children}
      </span>
      {withIcon && (
        <div className="glass-button-icon" aria-hidden>
          <ChevronGlyph />
        </div>
      )}
      <div className="glass-button-circle-overlay" aria-hidden />
    </Comp>
  );
}

// Cast preserves the `as`-driven generic through forwardRef, which otherwise
// erases it to the base props type.
export const GlassButton = React.forwardRef(GlassButtonImpl) as <
  E extends React.ElementType = "button",
>(
  props: GlassButtonProps<E> & { ref?: React.Ref<Element> },
) => React.ReactElement | null;

export { glassButtonVariants, glassButtonTextVariants };
