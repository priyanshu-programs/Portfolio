"use client";

import { createContext, useContext } from "react";
import type { SiteContent } from "@/lib/sanity/types";

const SiteContentContext = createContext<SiteContent | null>(null);

export function ContentProvider({
  value,
  children,
}: {
  value: SiteContent | null;
  children: React.ReactNode;
}) {
  return (
    <SiteContentContext.Provider value={value}>
      {children}
    </SiteContentContext.Provider>
  );
}

/**
 * Read CMS content in any client component. Returns null when Sanity isn't
 * configured or the fetch failed — callers use `?.` and fall back to their
 * original hardcoded values.
 */
export function useSiteContent(): SiteContent | null {
  return useContext(SiteContentContext);
}
