---
title: Testimonials no longer has a marquee or phone strip mode; the .tm-marquee/.tm-copy CSS was removed
author: L
date: 2026-11-04
branch: main
cost: { minutes: 10, tokens: 96960 }
id: l-3e56ddfe
scope: repo
status: active
replaces: l-a1a22cf6
src: agent
touches:
  - src/components/sections/Testimonials.tsx
  - updates.md
  - src/app/globals.css
---

## Decided
The v4 marquee (two copies, the second inert, plus a phone/reduced-motion strip mode) was removed in
the v6 rebuild of src/components/sections/Testimonials.tsx. Its rules in src/app/globals.css
(.tm-marquee, .tm-copy, .tm-copy-dup, .tm-marquee-wrap and the strip media query) are gone. Only
`@keyframes tm-swap` / `.tm-swap` remain for testimonials. `@keyframes marquee` stays because the
hero uses it.

## Tried and ruled out
- Keeping a marquee in testimonials: the hero already has one, and constant drift broke the page's
  one-focus-per-section rhythm.

## Watch out
- Don't bring back the `--tm-gutter` / `--tm-gap` variables. Nothing reads them now.
