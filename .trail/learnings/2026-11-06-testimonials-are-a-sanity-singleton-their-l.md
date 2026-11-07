---
title: Testimonials are a Sanity singleton; their seed is createIfNotExists and short lists are padded with inert .tm-fill repeats
author: L
date: 2026-11-06
branch: main
cost: { minutes: 9, tokens: 130563 }
id: l-e40e62b4
scope: repo
status: active
src: agent
touches:
  - sanity/schemas/testimonials.ts
  - src/components/sections/Testimonials.tsx
  - src/app/globals.css
  - src/lib/sanity/getSiteContent.ts
  - scripts/sanity/seed-testimonials.mts
  - updates.md
---

## Decided
- src/components/sections/Testimonials.tsx reads `useSiteContent()?.testimonials` (singleton `testimonials`, sanity/schemas/testimonials.ts, ordered `items[]` with a `hidden` toggle). With no visible entries the section returns null. The owner chose to seed the 8 Lorem placeholders into Sanity rather than keep a hardcoded fallback.
- scripts/sanity/seed-testimonials.mts uses `createIfNotExists` and is kept out of seed.mts on purpose: seed.mts is `createOrReplace` and would wipe Studio edits on every run.
- Fewer than 6 entries are repeated inside each marquee copy (MIN_PER_COPY), because a copy narrower than the viewport shows a gap at the loop point. Repeats are inert/aria-hidden with `.tm-fill`, hidden in the strip-mode media query in globals.css next to `.tm-copy-dup`.

## Watch out
- On this Windows machine, Python `open()` defaults to cp1252. Rewriting a UTF-8 file containing "─" or "→" with `open(p,'w')` truncates it to 0 bytes and then fails. Testimonials.tsx was untracked and got wiped this way. Pass `encoding="utf-8"` or use the Edit tool.
- `npm run sanity:deploy` needs `npx sanity login` first (interactive), so an agent can't redeploy the hosted Studio by itself.
