---
title: "Site typography stays Manrope-only; emphasis is muted #858EA3, not a serif italic"
author: L
date: 2026-11-03
branch: main
cost: { minutes: 11, tokens: 112627 }
id: l-0501693f
scope: repo
status: active
src: agent
touches:
  - src/components/sections/Testimonials.tsx
  - src/app/page.tsx
  - updates.md
  - src/components/sections/Services.tsx
  - src/app/layout.tsx
  - src/components/sections/CtaCollage.tsx
  - src/app/globals.css
---

## Decided
The owner chose to keep the site on Manrope only (300/400), even for editorial-style sections like the home Testimonials (src/components/sections/Testimonials.tsx) that were modelled on a serif reference. Emphasis inside headings is done with the muted colour #858EA3, the same treatment as "you will ever have." in src/components/sections/Services.tsx.

## Tried and ruled out
- Adding Instrument Serif via next/font for the testimonials heading and quote: dropped. It's the closest match to the reference, but the owner preferred a consistent single typeface.
- Cormorant Garamond: dropped for the same reason.

## Watch out
When a design reference uses serif italics, translate it to Manrope Light plus #858EA3 emphasis rather than adding a font in src/app/layout.tsx. Ask first if a serif seems truly necessary.
