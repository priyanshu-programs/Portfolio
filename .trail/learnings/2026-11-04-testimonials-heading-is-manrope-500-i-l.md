---
title: "Testimonials heading is Manrope 500 \"I'll stop talking. / They'll take it from here.\" with real spaces between word spans"
author: L
date: 2026-11-04
branch: main
cost: { minutes: 2, tokens: 14730 }
id: l-5ece189a
scope: repo
status: active
replaces: l-981cf949
src: agent
touches:
  - src/components/sections/Testimonials.tsx
  - updates.md
---

## Decided
src/components/sections/Testimonials.tsx `HEADING`: "I'll stop talking." (ink) / "They'll take it from here." (muted #858EA3), with the break after "talking.". The owner picked the copy from 10 options in their voice (first person, dry, with a turn at the end). They then asked for it bolder, so the h2 is Manrope 500 (Medium, the heaviest loaded weight) with -0.01em tracking. It's still the Services size, but no longer the Services Light weight. "from here." is one span so phones don't leave "here." alone on a line.

## Tried and ruled out
- Spacing the word spans with `mr-[0.25em]`: the heading text had no spaces ("I'llstoptalking."), which breaks copy, crawlers and GEO. Each word now gets a real " " text node, including before the <br>, because textContent ignores <br>.
- "What clients say / after launch" and "Remembered by the people I've built for" (rejected as servile; avoid "built for" and "served").

## Watch out
- Line 1 has to fit on a 390px phone at 31px (about 19 characters or fewer).
- Any per-word reveal heading elsewhere on the site likely has the same missing-space problem.
