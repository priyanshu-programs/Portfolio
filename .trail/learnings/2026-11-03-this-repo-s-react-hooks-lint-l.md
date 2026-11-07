---
title: "This repo's react-hooks lint bans ref-callback factories and setState in effects"
author: L
date: 2026-11-03
branch: main
cost: { minutes: 15, tokens: 100211 }
id: l-e9d63554
scope: repo
status: active
src: agent
touches:
  - src/components/sections/Testimonials.tsx
  - updates.md
  - src/app/globals.css
  - src/components/sections/AboutWork.tsx
  - src/components/sections/AboutAchievements.tsx
---

## Decided
In src/components/sections/Testimonials.tsx, GSAP targets are found with `data-*` attributes or classes queried from one section ref (`gsap.utils.selector(root)` / `querySelectorAll`). Per-element ref-callback factories aren't used. State resets that follow a user action (e.g. clearing `playing` when the slide changes) live in the event handler (`go()`), not in an effect.

## Tried and ruled out
- A `const swapRef = (slot) => (el) => { refs.current[slot] = el }` factory used in JSX: eslint `react-hooks/refs` fails it with "Cannot access refs during render".
- `useEffect(() => { ...; setPlaying(...) }, [active])`: eslint `react-hooks/set-state-in-effect` fails it.

## Watch out
`tsc` passes on both patterns; only `npx eslint` catches them. Run eslint on the file, not just tsc. Inline ref callbacks written directly in JSX (`ref={(el) => map.set(i, el)}`) do pass.
