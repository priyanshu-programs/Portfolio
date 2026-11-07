---
title: "Testimonials heading is the Services size in a left header row with a muted count; the cards carry the scale, and the closing line is gone"
author: L
date: 2026-11-04
branch: main
cost: { minutes: 4, tokens: 38378 }
id: l-30999167
scope: repo
status: active
replaces: l-88c18744
src: agent
touches:
  - src/components/sections/Testimonials.tsx
---

## Decided
In src/components/sections/Testimonials.tsx the heading is exactly the Services heading size (31 / sm:42 / lg:clamp(28px,2.55vw,calc(48px*var(--fluid-scale)))), Manrope 300, left on the page gutter, with "I've built for" in #858EA3 and a muted `(08)` count right-aligned on the same baseline. This mirrors "Recent work (n)" in AboutWork, and the owner picked it over a centred heading. The cards keep their size (~640px card, 320×400 portrait at 1600). Their text was scaled down to sit a clear step under the heading: wordmark clamp(17px,1.25vw,22px*fluid), quote clamp(20px,1.45vw,26px*fluid), about 41:23 at 1600. The closing line was removed.

## Tried and ruled out
- The reference-scale heading (clamp 48–88px, Manrope 500): the owner found it too big and out of step with the site.
- Shrinking only the heading: the quote (~30px) and wordmark (~32px) were then nearly as big as the heading (~41px), so nothing led and the section looked small. The card text has to shrink with it.
- The centred closing line under the row: the owner called it unnecessary.

## Watch out
- If the Services heading size changes, change this heading too (one element with breakpoint prefixes; Services uses two elements).
- The count shares the `.tm-word-inner` reveal. It is `aria-hidden`, so screen readers don't hear a bare "(08)".
