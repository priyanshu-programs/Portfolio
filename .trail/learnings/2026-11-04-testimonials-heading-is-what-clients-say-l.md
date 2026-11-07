---
title: "Testimonials heading is \"What clients say / after launch\" with a Start a project link on the right; \"people I've built for\" was rejected as servile"
author: L
date: 2026-11-04
branch: main
cost: { minutes: 4, tokens: 23795 }
id: l-5c313544
scope: repo
status: active
replaces: l-30999167
src: agent
touches:
  - src/components/sections/Testimonials.tsx
---

## Decided
In src/components/sections/Testimonials.tsx the header row is on the page gutter. The heading is exactly the Services heading size (31 / sm:42 / lg:clamp(28px,2.55vw,calc(48px*var(--fluid-scale)))), Manrope 300, reading "What clients say" / "after launch" with the second line in #858EA3 and the line break at every width. Right-aligned on the heading's bottom line is a "Start a project →" `next/link` to /contact, styled like the cards' "Watch video" (clamp(15px,1.15vw,18px), Manrope 500, the arrow nudges on hover). Below sm the row stacks: flex-col, with the link under the heading. The cards keep their size; their text stays a step below the heading (wordmark clamp(17–22px), quote clamp(20–26px)). There is no closing line.

## Tried and ruled out
- "Remembered by the people I've built for": the owner said it makes them sound like their clients' servant. Avoid copy that puts the owner below the client ("built for", "served").
- A muted `(08)` count on the right, like "Recent work (n)": replaced by the link, which gives a reader the quotes just convinced a next step.
- The link beside the heading on phones: it squeezed the heading to four ragged lines.
- The reference-scale heading (48–88px) and shrinking only the heading: see the earlier learnings. The card text has to scale with the heading.

## Watch out
- If the Services heading size changes, change this heading too.
- The link sits inside a `.tm-word-inner` mask with pb-[0.3em], so the focus outline and descenders aren't clipped by the overflow-hidden mask.
