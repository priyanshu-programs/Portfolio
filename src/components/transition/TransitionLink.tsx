"use client";

import { useRouter } from "next/navigation";
import React, { forwardRef } from "react";
import { useTransition } from "./TransitionContext";

interface TransitionLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
}

const TransitionLink = forwardRef<HTMLAnchorElement, TransitionLinkProps>(
  ({ href, children, onClick, onMouseEnter, onFocus, ...rest }, ref) => {
    const router = useRouter();
    const { navigateTo, isAnimating } = useTransition();
    const isExternalHref =
      href.startsWith("http") ||
      href.startsWith("mailto:") ||
      href.startsWith("tel:") ||
      href.startsWith("#");

    const prefetchTarget = () => {
      if (isExternalHref) {
        return;
      }

      const targetUrl = new URL(href, window.location.origin);
      const targetPath = `${targetUrl.pathname}${targetUrl.search}`;

      void router.prefetch(targetPath);
    };

    const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
      if (
        e.defaultPrevented ||
        e.button !== 0 ||
        e.metaKey ||
        e.ctrlKey ||
        e.shiftKey ||
        e.altKey
      ) {
        onClick?.(e);
        return;
      }

      if (isExternalHref) {
        onClick?.(e);
        return;
      }

      if (isAnimating) return;

      e.preventDefault();
      onClick?.(e);
      navigateTo(href);
    };

    if (isExternalHref) {
      return (
        <a href={href} onClick={handleClick} ref={ref} {...rest}>
          {children}
        </a>
      );
    }

    return (
      <a
        href={href}
        data-transition-link="true"
        onClick={handleClick}
        onMouseEnter={(e) => {
          prefetchTarget();
          onMouseEnter?.(e);
        }}
        onFocus={(e) => {
          prefetchTarget();
          onFocus?.(e);
        }}
        ref={ref}
        {...rest}
      >
        {children}
      </a>
    );
  }
);

TransitionLink.displayName = "TransitionLink";

export default TransitionLink;
