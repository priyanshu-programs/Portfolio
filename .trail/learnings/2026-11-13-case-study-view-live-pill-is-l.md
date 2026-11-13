---
title: Case-study View live pill is a cursor-morph + magnetic button filled with --cs-ink
author: L
date: 2026-11-13
branch: main
cost: { minutes: 1, tokens: 1345 }
id: l-72e465ff
scope: repo
status: active
src: agent
touches:
  - src/components/work/CaseStudy.tsx
  - src/app/globals.css
---

## Decided
- The "View live" pill (src/components/ui/MagneticLivePill.tsx, used in CaseStudy.tsx) hides the native cursor on enter, grows a cursor-sized disc from the entry point to fill the pill, leans magnetically toward the pointer (0.3x, label 0.15x), swaps the arrow diagonally, then shrinks the disc back at the exit point. This was the owner's own idea ("cursor disappears and becomes the pill's fill"), combined with magnetic pull.
- Fill is --cs-ink with --cs-bg text, not --cs-accent: caseStudyTheme falls back to a semi-transparent ink for the accent, which would wash out the label.
- The JS path only runs on (pointer: fine) and (prefers-reduced-motion: no-preference) and stamps data-magnetic. Without it (touch, reduced motion) and on :focus-visible, a plain CSS fill in globals.css (.live-pill) takes over.

## Tried and ruled out
- The options offered first: CSS liquid fill + text roll + arrow swap, an arrow chip that expands, and fill/roll + magnetic. The owner picked the cursor-morph + magnetic idea instead.

## Watch out
- Don't give a GSAP-animated element a starting CSS `transform` (e.g. translate(-100%,100%) on [data-arrow-in]). GSAP reads it as px x/y and then adds xPercent/yPercent on top, so the offset is applied twice and the arrow ends up outside its overflow-hidden box. Set the start state with gsap.set only.
- The magnetic lean moves the pill, so getBoundingClientRect includes the translate. Subtract gsap.getProperty(pill,"x"/"y") before working out the pointer's offset, or it feeds back on itself.
