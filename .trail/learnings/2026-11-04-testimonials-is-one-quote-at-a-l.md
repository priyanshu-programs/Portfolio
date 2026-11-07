---
title: "Testimonials is one quote at a time tied to a real project, at Services scale; outside-reference layouts (marquee, duotone cards, huge heading) were dropped fo…"
author: L
date: 2026-11-04
branch: main
cost: { minutes: 10, tokens: 96960 }
id: l-f2647075
scope: repo
status: active
replaces: l-88c18744
src: agent
touches:
  - src/components/sections/Testimonials.tsx
  - updates.md
  - src/app/globals.css
---

## Decided
After five rebuilds in one day from outside references (an editorial portrait queue, then
Mixpanel-style duotone cards in a marquee with an 80px heading), the owner said the section didn't
fit the site. It is now built from the site's own system. In
src/components/sections/Testimonials.tsx:
- The heading is the Services size (31 / sm:42 / lg:clamp(28px,2.55vw,48px*fluid)), Manrope 300,
  with #858EA3 muted words.
- One testimonial shows at a time: a 16:10 frame with the project's Sanity `hoverImage` (the wide
  site screenshot; `thumbnail` was unset on every project) next to a Light quote with an `accent`
  phrase, then name, "role, company" and "See the project →" to /work/<slug>.
- Client-name tabs switch between them.
- Entries pair with workProjects by `project` slug, else the i-th project that isn't coming soon.
  Entries with no project are dropped while projects exist.

## Tried and ruled out
- Marquee of duotone cards, stock faces, "Watch video" without videos, a closing line under the
  row, and a heading bigger than Services. They clashed with the calm off-white/ink/navy editorial
  page, doubled the hero's marquee and competed with the CTA collage.
- Using `thumbnail` for the frame: it is empty on the live projects.

## Watch out
- Swaps are CSS only: stacked images crossfade by opacity, and the text block is keyed by `active`
  to replay `.tm-swap` (globals.css). Don't add setState-in-effect (the hooks lint bans it).
- /images/cta1-img-*.png don't exist in public/. The collage images come from Sanity.
- Headless screenshots need wheel scrolling (Lenis + ScrollTrigger) or the reveal stays at opacity 0.
