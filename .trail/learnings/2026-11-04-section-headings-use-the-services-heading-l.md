---
title: Section headings use the Services heading size; Testimonials quote stays smaller than its heading
author: L
date: 2026-11-04
branch: main
cost: { minutes: 2, tokens: 80299 }
id: l-0a3057e0
scope: repo
status: active
src: agent
touches:
  - src/components/sections/Testimonials.tsx
  - updates.md
  - src/components/sections/Services.tsx
---

## Decided
The owner wants the Testimonials heading (src/components/sections/Testimonials.tsx) at exactly the
size of the Services heading in src/components/sections/Services.tsx: 31px / sm:42px below lg, and
clamp(28px,2.55vw,calc(48px*var(--fluid-scale))) from lg up. Surrounding content was scaled to fit:
pull quote clamp(20px,1.65vw,calc(28px*var(--fluid-scale))), heading-to-carousel gap
clamp(40px,4vw,64px). Portraits, thumbnails, caption (12px) and body (13px) were left as they were.

## Tried and ruled out
- Changing only the heading: the old 34px-max quote would then be nearly as big as the 48px heading.
- Scaling everything by the same ratio (~0.58), portraits included: this made the quote about 17px,
  too close to the 13px body text, and shrank the photos for no reason.

## Watch out
Services sets its mobile and desktop sizes on two separate elements (lines ~368 and ~435). Testimonials
has one h2, so it uses breakpoint prefixes to match both. If the Services size changes, update the
Testimonials heading too.
