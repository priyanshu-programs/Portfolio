---
title: Testimonials is a marquee from md up and a snap strip on phones/reduced motion; the duplicate copy stays inert
author: L
date: 2026-11-04
branch: main
cost: { minutes: 4, tokens: 23378 }
id: l-a1a22cf6
scope: repo
status: active
replaces: l-376337c2
src: agent
touches:
  - src/components/sections/Testimonials.tsx
  - src/app/globals.css
  - updates.md
  - src/components/SmoothScroll.tsx
---

## Decided
src/components/sections/Testimonials.tsx follows a reference the owner shared: a centred heading
(kept at the Services heading size) above a full-bleed row of cards. Each card is a text panel
(company, one-line quote, name, role) next to a portrait, duotoned in CSS (grayscale img +
`mix-blend-mode: color` tint layer + pale lighten layer) so real photos drop in unedited.
- md and up (768px+): an auto-scrolling marquee (`.tm-marquee` in src/app/globals.css, reusing
  `@keyframes marquee`). Hover, focus and a playing video pause it.
- Phones and reduced motion: "strip mode". No drift. Cards stack (photo on top, 5:4) at 78vw (max
  340px), and the row is a native overflow-x strip with scroll-snap, the first card on the
  heading's gutter (`--tm-gutter`) and the duplicate copy hidden. One media query in globals.css
  covers both.

## Tried and ruled out
- Drag/swipe with arrow buttons on desktop: the owner preferred the marquee.
- Full-colour photos: replaced by the duotone tint.
- The marquee on phones: the card was wider than the screen, couldn't be swiped, and pausing relied
  on sticky hover, so phones got the strip instead.

## Watch out
- The track renders the list twice so -50% loops. Each copy's trailing gap is `.tm-copy`
  padding-right in CSS (not inline), so strip mode can swap it for gutters.
- The second copy is `inert` + `aria-hidden` and `.tm-copy-dup` (hidden in strip mode).
- GSAP reveals `.tm-track` (the wrapper), never `.tm-marquee`: a GSAP transform would override the CSS animation.
- Touch swipe needs no `data-lenis-prevent`: src/components/SmoothScroll.tsx doesn't use syncTouch.
