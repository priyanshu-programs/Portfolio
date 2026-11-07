---
title: "A new Sanity schema only reaches the hosted Studio via sanity deploy, which needs an interactive login; seed scripts don't"
author: L
date: 2026-11-07
branch: main
cost: { minutes: 1, tokens: 1573 }
id: l-0bf6ea84
scope: repo
status: active
src: agent
touches:
  - scripts/sanity/seed-testimonials.mts
  - scripts/sanity/seed.mts
  - sanity/schemas/index.ts
  - sanity/schemas/testimonials.ts
  - sanity.cli.ts
---

## Decided
Seed scripts (scripts/sanity/seed-testimonials.mts, scripts/sanity/seed.mts) write to the dataset with the API token in .env.local, so content lands with no CLI login. New schema types (sanity/schemas/index.ts, sanity/schemas/testimonials.ts) only appear in priyanshuroy-portfolio.sanity.studio after `npm run sanity:deploy` (sanity.cli.ts sets studioHost). That needs `npx sanity login` as the account that owns project i0fv16h3.

## Watch out
"My CMS changes didn't show up" usually means the data is already in the dataset and only the Studio deploy is missing. Check with `npx sanity projects list`: it fails when you're logged out and lists i0fv16h3 when you're on the right account. The login opens a browser, so the owner has to run it. The site still needs its own git push for Vercel.
