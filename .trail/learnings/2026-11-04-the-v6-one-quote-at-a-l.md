---
title: "The v6 one-quote-at-a-time Testimonials (Sanity screenshot + tabs) was rolled back at the owner's choice; v5 cards are current"
author: L
date: 2026-11-04
branch: main
cost: { minutes: 1, tokens: 1938 }
id: l-465104e9
scope: repo
status: active
replaces: l-f2647075
src: agent
---

## Decided
After the v6 rebuild, the owner rolled src/components/sections/Testimonials.tsx back to v5 and kept it when asked: duotone cards in a marquee, the reference-scale heading (bigger than Services, Manrope 500), "Watch video" on every card, and a closing line. v6 is no longer in the code: the one quote at a time, the Sanity `hoverImage` frame, the client-name tabs, "See the project →" and the `.tm-swap` CSS. For the current layout and CSS, see l-5d3e7556 and l-88c18744.

## Tried and ruled out
- Treating v6 as current just because its learning was newest: the file on disk and the owner's choice both say v5.

## Watch out
- If the owner asks for a project-linked layout again, the v6 notes still apply. `thumbnail` is empty on the live workProjects; use `hoverImage`. Entries pair with projects by slug.
