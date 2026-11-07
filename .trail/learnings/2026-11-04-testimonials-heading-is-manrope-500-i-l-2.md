---
title: "Testimonials heading is Manrope 500 \"I'll stop talking. / They'll take it from here.\"; word spans need a trailing {\" \"}"
author: L
date: 2026-11-04
branch: main
cost: { minutes: 2, tokens: 11230 }
id: l-0257e6e3
scope: repo
status: active
replaces: l-5ece189a
src: agent
touches:
  - src/components/sections/Testimonials.tsx
  - updates.md
  - src/components/sections/Hero.tsx
  - src/components/sections/AboutStage.tsx
---

## Decided
src/components/sections/Testimonials.tsx `HEADING`: "I'll stop talking." (ink) / "They'll take it from here." (muted #858EA3), with the break after "talking.". The owner picked the copy from 10 options in their voice (first person, dry, with a turn at the end), then asked for it bolder, so the h2 is Manrope 500 (the heaviest loaded weight) with -0.01em tracking. It's still the Services size, but no longer Services' Light. "from here." is one span so phones don't leave "here." alone on a line.

## Tried and ruled out
- Word spans spaced only by `mr-[0.25em]`: textContent read "I'llstoptalking.They'll…". Fixed with the Hero.tsx pattern: `{" "}` inside each outer inline-block after the inner span, which adds no width. Every other reveal heading already had it.
- "What clients say / after launch"; "Remembered by the people I've built for" (servile; avoid "built for" and "served").

## Watch out
- Line 1 has to fit on a 390px phone at 31px (about 19 characters or fewer).
- Any new per-word reveal heading needs the same `{" "}`.
