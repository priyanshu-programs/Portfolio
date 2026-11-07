---
title: Testimonials is an auto-scrolling marquee of CSS-duotone cards; the duplicate copy must stay inert
author: L
date: 2026-11-04
branch: main
cost: { minutes: 7, tokens: 45411 }
id: l-376337c2
scope: repo
status: active
src: agent
touches:
  - src/components/sections/Testimonials.tsx
  - src/app/globals.css
  - updates.md
  - src/components/work/CaseStudyGallery.tsx
---

## Decided
src/components/sections/Testimonials.tsx follows a reference the owner shared: a centred heading
(kept at the Services heading size) above a full-bleed row of cards. Each card is a text panel
(company, one-line quote, name, role) next to a 4:5 portrait. The owner chose:
- an auto-scrolling marquee: CSS `.tm-marquee` in src/app/globals.css, reusing `@keyframes marquee` (0 to -50%)
- duotone tints done in CSS (grayscale img + `mix-blend-mode: color` tint layer + pale lighten
  layer), so real photos drop in unedited; tints cycle through TINTS by index

## Tried and ruled out
- Drag/swipe track with arrow buttons (the CaseStudyGallery pattern): the owner preferred the marquee.
- Full-colour photos (the v3 choice): replaced by the duotone tint for this design.
- The earlier rotating queue (large frame + thumbnails, `active`/`shown` text swap): removed entirely.

## Watch out
- The track renders the list twice so -50% loops seamlessly. Each copy carries its own trailing gap
  (paddingRight = gap); without it the loop point jumps.
- The second copy is `inert` + `aria-hidden`; keep it that way or screen readers read every
  testimonial twice.
- Only copy 0 is interactive (`playing` is a plain index).
- GSAP reveals `.tm-track` (the wrapper), never `.tm-marquee`: a GSAP transform on the track would
  override the CSS animation's transform.
- `--tm-duration` is set inline at 7s per card, so the speed stays constant as cards are added.
