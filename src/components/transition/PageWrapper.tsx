import React from "react";

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
  return (
    <div className={`page-wrapper ${className}`} style={style}>
      {children}
    </div>
  );
}
