---
title: Testimonials is back to the v5 marquee of cards; its .tm-marquee/.tm-copy CSS was restored and the v6 one-quote layout is gone
author: L
date: 2026-11-04
branch: main
cost: { minutes: 1, tokens: 2590 }
id: l-5d3e7556
scope: repo
status: active
replaces: l-3e56ddfe
src: agent
touches:
  - src/app/globals.css
---

## Decided
src/components/sections/Testimonials.tsx was rolled back from the v6 rebuild (one quote at a time, Sanity project screenshot, client-name tabs) to v5: the marquee of CSS-duotone cards with the reference-scale heading and closing line. The owner chose to keep v5. Its CSS was restored in src/app/globals.css: `.tm-marquee` (reuses `@keyframes marquee`, `--tm-duration`), pausing on hover, focus-within and `[data-paused]`, the `.tm-copy` trailing gap (`--tm-gap`), and the strip-mode media query `(max-width: 767px), (prefers-reduced-motion: reduce)`, which makes `.tm-marquee-wrap` an overflow-x snap strip with `--tm-gutter` padding and hides `.tm-copy-dup`. The v6 `tm-swap` CSS was deleted. The learning saying the marquee CSS is gone, and the one saying testimonials is one quote at a time, no longer apply.

## Tried and ruled out
- Rebuilding v6 to match the leftover CSS: the owner picked v5.
- Lazy portraits everywhere: inside the clipped, transformed row Chrome loads a lazy image only once it is about at the viewport edge, so every card drifted in blank and its photo popped in. The first copy now uses `loading="eager"`. The inert duplicate stays lazy and hits the cache, since it uses the same URLs.

## Watch out
- The component and globals.css drifted apart once because only some files were rolled back. If Testimonials.tsx changes version again, check that globals.css matches. The component sets `--tm-gutter` and `--tm-gap` inline, and the strip mode depends on them.
- The tm rules must stay unlayered (outside any @layer) so they beat Tailwind's `overflow-hidden` on the wrapper.
