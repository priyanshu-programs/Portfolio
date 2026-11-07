---
title: "Testimonials follows the owner's reference hierarchy: heading at reference scale (bigger than Services), wordmark → quote → name/role, Watch video pinned to th…"
author: L
date: 2026-11-04
branch: main
cost: { minutes: 9, tokens: 111649 }
id: l-88c18744
scope: repo
status: active
replaces: l-0a3057e0
src: agent
touches:
  - src/components/sections/Testimonials.tsx
  - updates.md
---

## Decided
The owner asked for "exactly this hierarchy" from a reference (centred huge heading, cards, closing
line), and that overrides the earlier "heading = Services heading size" rule. In
src/components/sections/Testimonials.tsx the heading is 36px / sm:56px / lg:clamp(48px,5vw,88px*fluid),
Manrope 500, one ink colour (no #858EA3 emphasis words), about 2.6× the card quote. Card text panel:
company wordmark (clamp 24–34px, 500), then the quote (clamp 22–32px, 400), then name/role (13px)
straight under it, then "Watch video →" (15–18px, 500) pinned to the bottom with mt-auto. A play
badge and "Watch video" show on every card: buttons on video entries, aria-hidden marks on image
entries (no dead controls). A centred closing line (.tm-closing) sits under the row.

## Tried and ruled out
- Keeping the heading at the Services size: the owner chose the reference scale when asked.
- Showing Watch video only on video entries: the owner wanted it on every card, like the reference.

## Watch out
- The card shadow reaches about 40px below the card, and .tm-track is overflow-hidden. Keep the
  track's bottom padding at 40px or more (pb clamp(40px,3.5vw,56px)), or the shadow gets cut,
  most visibly in phone strip mode.
- At 40px the phone heading broke as "Remembered / by". 36px fits "Remembered by" on one line
  inside the 11.67vw gutters.
- Headless screenshots need wheel scrolling (Lenis + ScrollTrigger). Jump-scrolling leaves the
  reveal stuck at opacity 0.
