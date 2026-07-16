"use client";

import React, { useLayoutEffect, useRef } from "react";
import { useTransition } from "./TransitionContext";

interface PageWrapperProps {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export default function PageWrapper({
  children,
  className = "",
  style,
}: PageWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { registerPageRef } = useTransition();

  // Register the page container ref on mount
  useLayoutEffect(() => {
    registerPageRef(containerRef.current);
    return () => {
      registerPageRef(null);
    };
  }, [registerPageRef]);

  return (
    <div
      ref={containerRef}
      className={`page-wrapper ${className}`}
      style={style}
    >
      {children}
    </div>
  );
}
