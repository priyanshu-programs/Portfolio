---
title: "Testimonials heading is \"I'll stop talking. / They'll take it from here.\"; owner-voice copy, never servile"
author: L
date: 2026-11-04
branch: main
cost: { minutes: 11, tokens: 100147 }
id: l-981cf949
scope: repo
status: active
replaces: l-5c313544
src: agent
touches:
  - src/app/globals.css
  - src/components/sections/Testimonials.tsx
  - updates.md
  - src/components/sections/Services.tsx
---

## Decided
In src/components/sections/Testimonials.tsx the `HEADING` array reads "I'll stop talking." (ink) / "They'll take it from here." (muted #858EA3), with the line break after "talking." at every width. "from here." is ONE word span on purpose: as two spans, phones (390px) left "here." alone on a third line. The heading is still the Services size and Manrope 300, on the gutter, with the "Start a project →" link (/contact) right-aligned on the bottom line; the row stacks below sm. The owner picked it from 10 options as matching their voice: first person, short, dry, with a turn at the end (like the hero's "Most sites look like templates. Mine don't.").

## Tried and ruled out
- "What clients say / after launch": replaced; the owner wanted something in their own voice.
- "Remembered by the people I've built for": the owner said it makes them sound like their clients' servant. Avoid copy that puts the owner below the client ("built for", "served").
- Not picked, still candidates if the owner wants to change it: No templates. / No regrets. · Skip my pitch. / Read theirs. · Ask the people / who hired me. · Said after launch, / not in the pitch. · Good work / gets talked about.

## Watch out
- Line 1 has to fit on one line on a 390px phone at 31px (about 19 characters or fewer).
- If the Services heading size changes, change this heading too.
- The link sits inside a `.tm-word-inner` mask with pb-[0.3em], so the focus outline isn't clipped.
