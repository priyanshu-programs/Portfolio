# Updates log

Newest first. One entry per unit of work. See `plan.md` for the phased plan.

Entry format: what changed · files touched · how it was verified · what's next.

---

# ⚠ OUTSTANDING — the only things left that move the scores

**Not a log entry. A standing backlog. Read this before asking "why hasn't the score gone up?"**

Current: **Classic SEO ≈77** · **GEO/AEO ≈51**. The technical track is **finished** — host, schema,
canonicals, sitemap, alt pipeline, `llms.txt`, crawler declarations, snippet hygiene are all done
and verified live. **There is no further code change of consequence.**

Every remaining point needs **writing and off-site presence**. That work is Priyanshu's; an agent
can format, structure and ship it, but cannot invent the substance.

| # | Task | Owner | Moves | Est. gain |
|---|---|---|---|---:|
| 1 | Expand thin pages to 600+ words each | Priyanshu | Content Quality 23% | **+8–10 classic** |
| 2 | Question-form headings + FAQ + a table | Priyanshu | GEO structural 20% | **+8 GEO** |
| 3 | A 130–170 word self-contained answer block per page | Priyanshu | GEO citability 25% | **+8 GEO** |
| 4 | E-E-A-T: testimonials, named results, credentials | Priyanshu | Content + GEO authority | **+5 both** |
| 5 | Off-site presence: YouTube, Reddit, Wikidata, LinkedIn | Priyanshu | GEO authority 20% | **+10 GEO** |
| 6 | Real `/services` page (the `/#services` anchor is dangling) | Priyanshu + agent | On-Page + Content | **+3 classic** |
| 7 | Free Google API key for PageSpeed + CrUX | Priyanshu | Unblocks Performance 10% | unknown |
| 8 | Speculation rules + `fetchpriority` on the real LCP | Agent, after #7 | Performance 10% | **+3 classic** |

### 1. The pages are too thin — this is the single biggest lever

Measured word counts: home **252**, `/work` **50**, `/about` **175**, `/contact` **96**,
`kbrs` **176**, `a2` **210**. Content Quality is **23% of the classic score** and sits at **38**,
graded on word count, E-E-A-T evidence and page coverage. `/work` being a 50-word hub page is the
worst offender.

Target 600+ words per page. **The writing itself is not the problem** — `content_quality.py` scores
the existing prose **89–94/100** with 0 filler and 0 AI-pattern markers. There simply is not enough
of it.

### 2. Zero question-form headings, zero tables, zero FAQ

Measured: **0 of 22 headings** are question-form, across all six pages. Answer engines match
question headings to query patterns. Convert the case-study section headings:

- `Challenge` → `What problem did KBRS need solved?`
- `Approach` → `How was it approached?`
- `Overview` → `What is KBRS & Associates?`

Add one services comparison **table** and one **FAQ** block (real Q&A headings, not schema markup —
FAQ rich results are deprecated for commercial sites, but the structure still helps extraction).

### 3. No self-contained answer blocks

~**44% of AI citations come from the first 30% of a page**. Each page needs one quotable,
self-contained block of ~130–170 words near the top that answers its core question without needing
surrounding context — ideally opening with a definition pattern (`X is…`, `X refers to…`).

### 4. No E-E-A-T evidence

No testimonials, no named client results, no metrics, no credentials beyond one line
(`Smart Bengal Hackathon Finalist '25`). Add: client quotes with attribution, specific outcomes
("cut load time from X to Y", "N enquiries in the first month"), and dates.

### 5. Off-site presence — the dominant GEO signal, currently zero

Brand mentions correlate ~**3x more strongly with AI citations than backlinks**
(Ahrefs, 75k brands):

| Signal | Correlation | Status |
|---|---:|---|
| YouTube mentions | ~0.737 | **none** |
| Reddit mentions | high | **none** |
| Wikipedia / Wikidata | high | **none** |
| LinkedIn | moderate | profile only |
| Domain Rating (backlinks) | ~0.266 | new domain, absent from Common Crawl |

Slowest item here and the one that compounds. A Wikidata entity and a few genuine Reddit/YouTube
appearances are worth more than any further technical work.

### 6–8. Smaller, mostly mechanical

`/about`'s h1 is the single word "About". `/#services` is a nav anchor with no page behind it, and
all three homepage service cards link to `/contact` instead. Performance is scored **58 on static
signals only** — PSI's keyless quota has failed on every attempt across every session, so a free
Google API key (PageSpeed Insights + Chrome UX Report, stored at
`~/.config/claude-seo/google-api.json`) is the prerequisite for ever knowing the real CWV number.
Only once measured is it worth marking the actual LCP element.

### Honest ceiling

Items 1–6 get Classic to roughly **90** and GEO to roughly **80**. Neither reaches 100: Content
Quality is graded partly on site size and history, and GEO authority partly on third-party presence
that cannot be manufactured quickly. The domain was registered **2026-10-02** and is absent from the
Common Crawl graph — some of this is simply time.

---

## 2026-11-07 — Testimonials: "Show section" toggle in Studio

- **What:** New `showSection` boolean (default on) on the Testimonials Section singleton. Off hides
  the whole home-page section without deleting entries; the document preview reads "Shown on site" /
  "Hidden on site".
- **Files:** `sanity/schemas/testimonials.ts`, `src/lib/sanity/queries.ts` (projects `showSection`),
  `src/lib/sanity/getSiteContent.ts` (returns `[]` when it's `false`, so `Testimonials.tsx` renders nothing).
- **Verified:** `tsc --noEmit` clean; `npx sanity deploy` succeeded → priyanshuroy-portfolio.sanity.studio.
- **Next:** the site code still needs a commit + push for Vercel before the toggle has any effect live.

---

## 2026-11-07 — Testimonials Studio deployed, site pushed

**What changed.** The owner ran `npx sanity login` (account owning `i0fv16h3`), then
`npm run sanity:deploy` rebuilt priyanshuroy-portfolio.sanity.studio with the `testimonials`
schema ("Deployed 1/1 schemas"). The testimonials code was committed and pushed to `main`, so
Vercel deploys it. The content itself was already in the dataset from the seed run below.

**Files.** Everything listed in the entry below, plus `.trail/learnings/`. Left uncommitted on
purpose: `.claude/settings.json` (trail hook), `geo-research/`, the rest of `.trail/`.

**Verified.** `sanity projects list` shows i0fv16h3. Deploy printed success. `tsc --noEmit`,
eslint and `trail check` (no conflicts) were all clean before the commit.

**Next.** Swap the 8 placeholder testimonials for real ones in the hosted Studio.

---

## 2026-11-07 — Testimonials come from Sanity

**What changed.**
- **Schema:** new singleton `testimonials` ("Testimonials Section" in the Studio), with one ordered
  `items` array. Each entry has name, role, company, quote, photo (hotspot) and an optional video
  file, plus a `hidden` toggle that takes it off the site without deleting it.
- **Data:** `siteContentQuery` fetches `items[hidden != true]` with `video.asset->url`.
  `getSiteContent` resolves photos at 800px and drops entries missing a name, quote or photo. The
  existing `/api/revalidate` webhook already covers every document, so edits go live without
  extra wiring.
- **Component:** the hardcoded Lorem/Unsplash `TESTIMONIALS` is gone. Cards come from
  `useSiteContent()?.testimonials`, and an entry with a video gets a working "Watch video". With
  no visible entries the section isn't rendered. **Short lists:** a marquee copy narrower than the
  viewport leaves a gap at the loop point, so lists under 6 are repeated up to 6 per copy. The
  repeats are `inert`/`aria-hidden` and carry `.tm-fill`, which the strip-mode media query hides
  next to `.tm-copy-dup`. Marquee duration now scales with the padded card count.
- **Seed:** `npm run sanity:seed-testimonials` uploaded the 8 placeholder portraits and wrote the
  doc with `createIfNotExists`, so re-runs never touch Studio edits. It's kept out of `seed.mts`,
  whose `createOrReplace` would wipe them.

**Files.** `sanity/schemas/testimonials.ts` (new), `sanity/schemas/index.ts`,
`sanity/structure.ts`, `src/lib/sanity/{queries,types,getSiteContent}.ts`,
`src/components/sections/Testimonials.tsx`, `src/app/globals.css`,
`scripts/sanity/seed-testimonials.mts` (new), `package.json`.

**Verified.** `tsc --noEmit` and eslint are clean. The seed ran: 8 entries, and a re-run reported
"already exists" and changed nothing. The site query returns all 8 with photos. The home page SSR
on :3001 renders all 8 Sanity portraits and no Unsplash URLs. Not yet seen in a browser: the
short-list padding, the empty state and video playback.

**Next.** The hosted Studio isn't redeployed yet because `sanity deploy` needs `npx sanity login`
first. Until then, the section can be edited in the local Studio (`npm run sanity`). Then replace
the placeholders with real testimonials.

---

## 2026-11-04 — Testimonials heading: Medium weight, and real spaces between words

**What changed.**
- **Weight:** the owner wanted the heading bolder. It's now Manrope 500 (Medium, the heaviest
  weight `layout.tsx` loads) with -0.01em tracking, up from the Light 300 it shared with
  Services. The size is unchanged, still the Services size.
- **Real spaces:** the words were separate spans with only `mr-[0.25em]` between them, so the
  heading's text had no spaces at all. Copying, crawlers and `textContent` all got
  "I'llstoptalking.They'll…". Each word's wrapper now ends with a `{" "}`, the pattern `Hero.tsx`
  already uses. Trailing whitespace inside an inline-block adds no width, so the margin still
  sets the gap and the layout doesn't move by a pixel.
- **Other headings:** every other per-word reveal heading (`Hero`, `NotFoundStage`, `AboutWork`,
  `AboutStage`, `ContactStage`, `CtaCollage`) already had the `{" "}`. Testimonials was the only
  one missing it.

**Files.** `src/components/sections/Testimonials.tsx`.

**Verified.** `npx eslint` on the file is clean. Headless Chrome on the dev server (:3000) reports
`textContent` = "I'll stop talking. They'll take it from here." and a computed weight of 500. In the
screenshots, 1600px is two lines with word spacing that looks unchanged, and 390px still breaks as
"I'll stop talking. / They'll take it / from here.".

**Next.** Unchanged: real testimonials, then move them into Sanity.

---

## 2026-11-04 — Testimonials heading: "I'll stop talking. / They'll take it from here."

**What changed.** The owner asked for heading copy in their own voice, and I offered 10 options.
They picked "I'll stop talking." with the second line, "They'll take it from here.", in muted
`#858EA3`. It's first person and dry, it hands the floor to the quotes, and it keeps the owner on
equal footing with clients ("built for" was rejected earlier as servile). "from here." is a single
word span, so on phones the muted line wraps as "They'll take it / from here." and doesn't leave
"here." alone on a line. The size, the word reveal and the "Start a project" link are unchanged.

Options not picked, kept for later: No templates. / No regrets. · Skip my pitch. / Read theirs. ·
Ask the people / who hired me. · Said after launch, / not in the pitch. · Good work / gets talked
about. · Then they launched. / Here's how it went. · Months later, / still glad they did. · The
work, / in their words. · Don't take my word. / Take theirs.

**Files.** `src/components/sections/Testimonials.tsx` (the `HEADING` array and its comment).

**Verified.** `npx eslint` on the file is clean. Headless Chrome on the dev server (:3000):
- **1600px:** two lines, with the link right-aligned on the bottom line.
- **390px:** "I'll stop talking." fits on one line, and the muted line breaks as "They'll take it /
  from here.".

**Next.** Unchanged: real testimonials, then move them into Sanity.

---

## 2026-11-04 — Testimonials: marquee fades out across the page gutter

**What changed.** The full-bleed card row now fades to transparent at both screen edges. The fade
runs exactly the width of the page gutter (`--tm-gutter`, the same `clamp(1.5rem, 11.67vw, 13rem)`
the heading uses), so cards are fully visible only between the heading's left edge and the
"Start a project" link's right edge. It's a `mask-image` gradient on the still `.tm-marquee-wrap`,
not on the moving `.tm-marquee` track. So it works on any background and fades the card shadows
too. Strip mode (phones, reduced motion) gets the same mask. Each copy already has gutter padding,
so the first card is fully visible at rest, and cards fade only as they're swiped past the edges.

**Files.** `src/app/globals.css` (new `.tm-marquee-wrap` mask rule),
`src/components/sections/Testimonials.tsx` (header comment only).

**Verified.** `npx eslint` on the component is clean. Headless Chrome on the dev server (:3000):
- **1600px:** the mask is opaque from 186.72px to `100% − 186.72px`. The heading's left edge is
  186.72px and the link's right edge is 1413.28px, so the fade lines up with both. In the
  screenshot, edge cards fade smoothly to nothing.
- **390px (strip):** a 45.5px fade, the same as the heading's left edge. The first card sits fully
  opaque, and the peeking second card fades out on the right.

**Next.** Unchanged: real testimonials, then move them into Sanity.

---

## 2026-11-04 — Testimonials: "What clients say after launch", and a Start a project link

**What changed.**
- **Heading copy:** the owner felt "Remembered by the people I've built for" made them sound like
  they serve their clients. It is now "What clients say / after launch", with the second line in
  muted `#858EA3`. The heading is still the Services size, Manrope 300, on the gutter. The line
  break now applies at every width, because the shorter first line fits on phones.
- **Right side:** the `(08)` count is replaced by a "Start a project →" link to `/contact`. It is
  styled like the cards' "Watch video" (clamp(15–18px), Manrope 500, the arrow nudges right on
  hover, a focus outline) and rises with the heading's word reveal.
- **Phones (below sm):** the header row stacks, with the link under the heading. Side by side,
  the link had squeezed the heading into four ragged lines.

**Files.** `src/components/sections/Testimonials.tsx`.

**Verified.** `npx eslint` on the file and `npx tsc --noEmit` are clean. Headless Chrome on the
dev server (:3000):
- **1600px:** a two-line 40.8px heading. The 18px link is right-aligned on the heading's bottom line.
- **1280px:** 32.6px heading, 15px link.
- **390px:** a two-line 31px heading with the link below it.
- **All widths:** the link's href is `/contact`, and the marquee still runs (it's off on phones by
  design).

**Next.** Real testimonials (company, quote, photo or video), then move them into Sanity.

---

## 2026-11-04 — Testimonials: site-scale heading row, closing line removed

**What changed.** The owner said the heading was too big, the closing line added nothing, and the
section should look like the rest of the site, with the cards staying big as in the reference.
Shrinking only the heading had made the section look small. At the Services size the heading
(≈41px at 1600) was barely bigger than the card quote (≈30px) and wordmark (≈32px), so nothing led.
The fix restores the steps between sizes and lets the cards carry the section's scale:
- **Header row:** the heading sits on the page gutter, left-aligned, with a muted `(08)` count
  right-aligned on its baseline (the "Recent work (n)" pattern). It is exactly the Services heading
  size (31 / sm:42 / lg:clamp(28px,2.55vw,48px*fluid)), Manrope 300, with "I've built for" in
  `#858EA3`. The line break after "people" applies only from lg up. The count reveals with the words.
- **Card text:** wordmark clamp(24–34px) → clamp(17px,1.25vw,22px*fluid); quote clamp(22–32px) →
  clamp(20px,1.45vw,26px*fluid). Card and portrait sizes are unchanged (~640px card, 320×400
  portrait at 1600).
- **Closing line removed** (`CLOSING`, its markup, and its GSAP step).
- **Rhythm:** the section padding went from py clamp(96–200px) to pt clamp(80–144px) and
  pb clamp(48–96px). The heading-to-row gap now starts at 24px.

**Files.** `src/components/sections/Testimonials.tsx`.

**Verified.** `npx eslint` on the file and `npx tsc --noEmit` are clean. Measured with headless
Chrome on the dev server (:3000), scrolled with the wheel:

| Width | Heading | Quote | Wordmark |
|---|---|---|---|
| 1600px | 40.8px (weight 300) | 23.2px | 20px |
| 1280px | 32.6px | 20px | 17px |
| 390px | 31px, 3 clean lines | — | — |

- **1600px:** the section is 877px tall.
- **All widths:** the count's bottom edge lines up with the heading's, and the marquee still runs
  (it's off on phones by design).

Screenshots show nothing under the cards and the shadows uncut.

**Next.** Real company names or logo SVGs, quotes and videos, then move them into Sanity.

---

## 2026-11-04 — Testimonials: marquee CSS restored after a partial rollback

**What changed.** The section was broken. `Testimonials.tsx` had been rolled back to the v5
marquee of cards, but `globals.css` was still on the later v6 rebuild (one quote at a time), which
had deleted the CSS v5 needs. The row didn't move, the inert duplicate copy was visible, and phones
got a clipped row where only the first card could be reached. The owner chose to keep v5, so:
- **`globals.css`:** restored `.tm-marquee` (reuses `@keyframes marquee`, `--tm-duration`), pausing
  on hover, focus and `[data-paused]`, the `.tm-copy` trailing gap, and the strip-mode media query
  for phones and reduced motion (a native swipe strip with snap, the gutter as padding,
  `.tm-copy-dup` hidden). Removed the unused v6 `tm-swap` keyframes and class.
- **Portraits:** the first copy now loads eagerly. Lazy loading got almost no look-ahead inside
  the clipped, drifting row, so each card arrived as a blank tint block and its photo popped in.
  The duplicate copy stays lazy and hits the cache.

**Files.** `src/app/globals.css`, `src/components/sections/Testimonials.tsx`.

**Verified.** `npx eslint` on the file and `npx tsc --noEmit` are clean. Headless Chrome
(playwright-core) on the dev server (:3000), scrolled with the wheel:
- **1600px:** the animation runs at 56s and the row moves about 113px in 1.2s. Hovering the row
  stops it.
- **390px:** no animation. The row is an `overflow-x: auto` strip with x-mandatory snap. The first
  card sits 46px in, on the gutter. The duplicate copy is hidden. Scrolling moves it 316px.
- **Reduced motion at 1600px:** the same strip, and nothing drifts.
- **Images:** all 8 first-copy portraits had loaded within 1.5s. Before the change, cards past the
  right edge were still empty.

**Next.** Unchanged: real company names and logos, quotes, videos and closing copy, then move them
into Sanity.

---

## 2026-11-04 — Testimonials: type hierarchy matches the owner's reference

**What changed.** The section now follows the type hierarchy of the reference the owner shared.
- **Heading:** reference scale, `clamp(48px,5vw,88px)` from lg (80px at 1600px), 56px at sm, 36px
  on phones. Manrope 500, one ink colour (the grey emphasis words are gone). It is now
  **bigger than the Services heading**, which reverses the earlier "same size as Services"
  decision at the owner's request.
- **Card text panel, top to bottom:** a company wordmark (24–34px, Manrope 500), then the quote
  (22–32px, Manrope 400), then name and role (13px) straight under the quote, and "Watch video →"
  (15–18px, Manrope 500) pinned to the bottom.
- **Play badge** (44–60px) at the portrait's bottom-left. It and "Watch video" now show on
  **every** card. They are real buttons on `{type:"video"}` entries and non-interactive
  `aria-hidden` marks on image entries, so there are no dead controls.
- **Card surface:** a gradient from `#FFFCFA` to the tint, with a soft shadow. The track has extra
  vertical padding so `overflow-hidden` doesn't clip the shadow.
- **Closing line:** a new centred line under the row (placeholder copy: "Join the founders and
  teams who stopped settling for forgettable work"), revealed with the rest of the timeline.

**Files.** `src/components/sections/Testimonials.tsx`.

**Verified.** `npx eslint` on the file and `npx tsc --noEmit` are clean. Headless Chromium
screenshots of the dev server (:3000) at 1600, 1280 and 390px, scrolled with the wheel so the
reveal runs. At 1600px the heading is 80px and the quote 30.4px (≈2.6:1, as in the reference). On
phones the heading wraps to three clean lines, the cards stack, and the shadow isn't clipped.
Browser MCP was paused, so I didn't check marquee hover-pause by hand.

**Next.** Real company names (or logo SVGs in place of the text wordmark), quotes and videos, and
real closing-line copy. Then move all of it into Sanity.

---

## 2026-11-04 — Testimonials: phones get a swipeable strip of stacked cards

**What changed.** On phones (below `md`, 768px), the v4 marquee had four problems:
- the card was about 432px wide, more than a 375px screen
- the row couldn't be swiped
- a card crossed the screen in about 6s
- pausing depended on sticky hover

Below `md`, each card now stacks (photo on top at 5:4, text below) at `78vw`, capped at 340px. The
auto-scroll is off and the row is a native horizontal strip that snaps to each card. The first card
lines up with the heading's gutter, and the duplicate marquee copy is hidden.

Reduced motion gets the same strip mode at every width, so it no longer shows every card twice. From
`md` up nothing changed. The copy padding moved from an inline style to `.tm-copy` in CSS, so strip
mode can override it. The section now sets `--tm-gutter` and `--tm-gap` inline.

**Files.** `src/components/sections/Testimonials.tsx`, `src/app/globals.css`.

**Verified.** `npx eslint` on the file and `npx tsc --noEmit` are clean, and `GET /` returns 200. Not
checked visually: Browser MCP was paused.

**Next.** In Chrome device mode at 375 and 390px, check:
- the cards stack and snap
- the next card peeks in from the right
- there's no sideways page scroll

Also check that 768px and up still runs the marquee.

---

## 2026-11-04 — Testimonials v4: centred heading over an auto-scrolling row of duotone cards

**What changed.** Replaced the rotating queue (one large portrait, two thumbnails, quote, arrows)
with a layout taken from a reference the owner shared. The heading is now centred, still at the
Services heading size. Below it, a full-bleed row of cards drifts left on a loop. Each card has a
pale tinted background and two panels:
- text: company, a one-line quote, name, and role in #858EA3
- a 4:5 portrait

The portrait is duotoned in CSS (grayscale photo, a tint layer with `mix-blend-mode: color`, and a
pale lighten layer), with tints cycling through peach, teal, lavender and sand. Video entries get a
round play button and a "Watch video →" link. Pressing either mounts a `<video>` over the portrait
and pauses the row until the video ends or is closed. All placeholders are images, so none show yet.

How the row works: the track holds two copies of the list and uses the existing `marquee` keyframes
(translate -50%). The second copy is `inert` and `aria-hidden`. Hover, keyboard focus and a playing
video pause the row. Reduced motion stops it and makes the row scroll by hand. The duration is 7s
per card (56s for 8).

The long lorem body text is gone, and `role` was split into `role` and `company`.

**Files.** `src/components/sections/Testimonials.tsx` (rewritten), `src/app/globals.css` (`.tm-marquee` rules next to `@keyframes marquee`).

**Verified.**
- `npx eslint` on the file and `npx tsc --noEmit` are clean.
- `GET /` on the dev server returns 200, and the HTML contains the heading, the marquee track, one
  `inert` copy and `--tm-duration:56s`.
- Not checked visually: Browser MCP was paused.

**Next.** In the browser, at about 1440, 1024 and 375px, check:
- the loop has no seam
- hover and focus pause the row
- the tints look right on real photos
- there's no horizontal page scroll
- the row is static under reduced motion

Add a real video entry to exercise the play path.

---

## 2026-11-04 — Testimonials: heading matches the Services heading size

**What changed.** The testimonials heading now uses the exact size of the Services heading ("Your
website is the first impression…"): `31px` / `sm:42px` below lg, and
`clamp(28px,2.55vw,calc(48px*var(--fluid-scale)))` from lg up (was `clamp(40px,4.4vw,72px)`). To
keep the proportions, the pull quote went from `clamp(22px,2vw,34px)` to `clamp(20px,1.65vw,28px)`
so it stays smaller than the heading, and the heading-to-carousel gap went from
`clamp(56px,6vw,96px)` to `clamp(40px,4vw,64px)`. Portraits, caption and body are unchanged.

**Files.** `src/components/sections/Testimonials.tsx`.

**Verified.** `npx eslint` on the file and `npx tsc --noEmit` are both clean. Not checked visually.

**Next.** Look at it in the browser at about 1440px, 1024px and 375px.

---

## 2026-11-04 — Testimonials: all caps dropped

**What changed.** Removed `uppercase` from the three places in the testimonials section that had it:
the name and role caption, the quote lines and the body paragraph. Each now renders in the case it
is written in. Sizes, weights and leading are unchanged.

**Files.** `src/components/sections/Testimonials.tsx`.

**Verified.** `npx eslint` on the file is clean, and no `uppercase` is left in the file. Not checked
visually: Browser MCP was paused.

**Next.** Look at it in the browser. The 12px caption and 13px body were sized for all caps, so
they may need a size or tracking adjustment now that they're mixed case.

---

## 2026-11-04 — Testimonials: side margins match Recent work

**What changed.** The testimonials section now uses the same fluid side padding as the homepage
"Recent work" block (`clamp(1.5rem, 11.67vw, 13rem)`, from `AboutWork.tsx`). The old
`px-6 sm:px-10` padding and the centred `max-w-[1200px*fluid-scale]` wrapper are gone, so on wide
screens the section is no longer narrower than the one above it. Grid, stage geometry and GSAP
targets are unchanged.

**Files.** `src/components/sections/Testimonials.tsx`.

**Verified.** `npx eslint` on the file and `npx tsc --noEmit` both clean. On the running dev server
(:3000) at 1536px wide, the Recent work heading and rows and the testimonials heading and figure all
span the same 179.25px to 1356.75px. Screenshot checked.

**Next.** Real testimonial copy and photos (still Lorem and Unsplash), then move them into Sanity.

---

## 2026-11-04 — Testimonials v3: no counter or progress line, colour photos, arrows under the thumbnails

**What changed.**
- Removed the `01 / 08` counter, the progress line and the "Kind words" eyebrow. The eyebrow tween is gone from the reveal, so the heading words now start at 0.
- Removed the `grayscale` filter, so portraits show in colour.
- The ← → arrows moved from a row under the portrait into the stage, directly under the thumbnails. That puts them with the queue they control, in the empty space above the name. The user chose this placement from three options: under the thumbnails, at the end of the quote, or beside the heading.
- Added sr-only text, "Testimonial n of N", inside the `aria-live` caption, so screen readers still know their position without the visual counter.

**Files.** `src/components/sections/Testimonials.tsx`.

**Verified.** `tsc` and `eslint` pass. The rendered HTML on :3001 has no eyebrow, counter or grayscale, and does contain the arrows and the sr-only text. No visual browser check yet (Browser MCP paused).

**Next.** As below.

---

## 2026-11-04 — Testimonials v2: rotating queue for any number, rounded cards, video, scroll reveal

**What changed.** `Testimonials.tsx` was rewritten to handle many testimonials (8 Lorem Ipsum entries now).
- **Rotating queue:** each entry has one always-mounted box with slot `(i − active + N) % N`. Slot 0 is the large frame, 1–2 are thumbnails, N−1 waits hidden behind the large frame (so "previous" fades back in place), and the rest queue hidden to the right. Changing `active` re-slots the boxes, and CSS transitions do the glide (geometry 850 ms; opacity 380 ms, so hidden-bound boxes vanish before they cross anything).
- **Controls:** ← → buttons, a `01 / 08` counter and a progress line. Arrow keys work inside the carousel, and swiping (over 40 px) steps through.
- **Rounding:** 8px on the large frame, 6px on thumbnails, and the radius animates during the glide.
- **Video:** `media` is either `{type:"image"}` or `{type:"video", src, poster}`. A `<video preload="none">` mounts only in the large frame behind a frosted play button. Leaving the frame unmounts it, which stops it, and everywhere else shows the poster.
- **Scroll-in reveal:** one timeline, `start: "top 72%"`, plays once. Eyebrow fade, then the heading words rise out of masks (AboutWork's values). The portrait and thumbnails wipe up from the bottom with a 1.15→1 zoom (AboutAchievements' values, using `inset() round` so the corners stay rounded). Then the quote lines rise, and the caption, body and controls fade in.
- **Text swaps** use the same masked line rise. Reduced motion gets no animation.

**Files.** `src/components/sections/Testimonials.tsx`.

**Verified.**
- `tsc --noEmit` and `eslint` pass.
- The server-rendered HTML from this site's dev server (**:3001**; :3000 on this machine is the unrelated `pujogo` app) contains the section between Services and the CTA, with the carousel region and controls.
- The video path was typechecked with a temporary MDN sample entry, then reverted.
- **Not visually checked in a browser:** Browser MCP was paused. The dev log has GSAP "Invalid scope" warnings from 01:03, before this rewrite, with the source not identified.

**Next.** A visual check: the reveal order, the queue wrapping 08→01, swiping at 390 px, and both neighbouring pins. Then real testimonials and photos/videos, and move the data into Sanity.

---

## 2026-11-04 — Testimonials: portraits glide between slots; placeholder photos

**What changed.** The three portraits are now one set of absolute boxes, each keyed to its
testimonial and assigned a slot (large or thumbnail). Clicking a thumbnail changes only the slots,
so the same node glides and resizes into place: a CSS `left/width/height` transition, 850 ms,
`cubic-bezier(0.76,0,0.24,1)`. Thumbnails sit slightly zoomed and dimmed and settle on hover. The
text cross-fades on its own `shown` state, so the boxes start moving at once. Placeholder grayscale
Unsplash portraits are in (host already allowed in `next.config.ts`; URLs checked to return 200).

**Files.** `src/components/sections/Testimonials.tsx`.

**Verified.** `tsc --noEmit` and `eslint` pass. A visual check is still pending: Browser MCP was paused.

**Next.** Same as below.

---

## 2026-11-04 — Home: testimonials section between Services and the CTA collage

**What changed.** New `Testimonials` section on `/`, placed after the Services deck and before
"no more forgettable work". The layout follows an editorial reference: eyebrow, two-line heading, a
large portrait with two thumbnail buttons that swap the active testimonial (GSAP blur crossfade,
instant under reduced motion), name and role, then an indented all-caps pull-quote and body. It's
Manrope only, by the user's choice (no serif added). Emphasis uses the muted `#858EA3`, the same
treatment as the Services heading. The heading copy is real ("Kind words" / "Remembered by the
people I've built for", written to lead into "no more forgettable work"). The three testimonials
are Lorem Ipsum, and the portraits are `#E9E6E2` placeholder blocks until `image` is set. It
renders in one DOM tree with no mobile duplicate, uses `<figure>/<blockquote>/<figcaption>`, and
isn't pinned.

**Files.** `src/components/sections/Testimonials.tsx` (new), `src/app/page.tsx`.

**Verified.** `tsc --noEmit` and `eslint` pass. Not yet visually checked: Browser MCP was paused.

**Next.** A visual check at 1440 and 390 px, including that the Services pin and the CtaCollage pin
still sit cleanly either side. Then real testimonial copy and grayscale photos, then Sanity fields
(merge by index as in Services). This starts backlog item #4 (E-E-A-T).

---

## 2026-10-08 — GEO study Phase C: REPORT.md written; the backlog's off-site item was aimed wrong

`geo-research/REPORT.md` is written — all 22 protocol sections, all six required tables, with
OBSERVED / INFERENCE / RECOMMENDATION kept visibly separate. No site code touched; this is still
research only. Composite GEO diagnostic: **34/100 now, 68 realistic target** (not an OpenAI score —
an internal framework). The target stops at 68 because authority and third-party validation are
gated on juries, clients and time, and the domain is six days old.

**The correction that matters most.** The standing backlog's off-site item (#5) pointed at YouTube,
Reddit and Wikidata, ranked from general correlation research. **Across nine captures, not one of
those three was retrieved or cited even once.** What ChatGPT actually reached for, repeatedly:
Awwwards (6×), CSS Design Awards (6×), Clutch (4×), Behance (3×), LinkedIn (3×), Dribbble, DesignRush,
Framer Experts — and individual designers' own portfolio domains, cited directly as evidence. Same
effort, far better aim.

**Two P0 items that were not on the backlog at all:**

- **State India and Kolkata.** All four observed discovery queries are geo-scoped; B02 shows ChatGPT
  read the entire site and could not say where he is.
- **State independence and availability.** ChatGPT quotes rivals' *"available for freelance"* lines
  verbatim; B02 had to hedge his business structure because the site never says.

Both are one honest sentence each. Neither requires a claim that isn't already true.

**Promoted:** E-E-A-T (was #4 → P0/P1) — "who will design versus who will develop" was demanded in
**4 of 4** intent captures, and outcomes in 3 of 4. Both case studies state neither.
**Held:** thin pages (was #1 → P1) — still real, but word count doesn't fix an entity ChatGPT can't
place or categorise. **Unchanged:** `/services` page P2, Google API key P3.

**Protocol §22 enforced:** no qualifying design recognition exists, so "award-winning" is recommended
nowhere in site copy. Award language in the generated queries is what ChatGPT searches *for*, not a
licence to assert it — and the study observed ChatGPT hedging rivals' self-asserted award claims
precisely because they are self-asserted.

**Protocol §23 settled against a Kolkata page.** City-level intent returns a local pack — ratings,
street addresses, phone numbers, a map. A portfolio page does not compete there. Kolkata belongs on
the site as entity disambiguation, not as a landing page.

**Attempted and failed:** a clean memory-free baseline. Temporary chat still references memory by its
own banner; the header's Unpersonalized toggle would not switch across three attempts (coordinate,
accessibility ref, keyboard) and the renderer began timing out, so it was abandoned per the run's
stop conditions. **B01 therefore remains invalid as a neutral baseline.** It is a one-minute manual
job: header dropdown → Unpersonalized → re-run B01 and B02.

Files: `geo-research/REPORT.md` (new), `geo-research/raw/_capture-log.md`, `updates.md`.

Verified: every recommendation in the report names its evidence — a raw file id, an audit section
letter, or an explicit INFERENCE label. Claims that could not be traced were cut. The one
low-confidence query transcription (P10) is flagged unusable-as-evidence pending re-capture.

Next, in order: (1) the unpersonalized B01/B02 re-run; (2) the P0 copy and schema changes, which are
a separate approved pass since this one was research-only; (3) re-test B02 for location, then B01 for
retrieval — measured as frequency across repeated runs, because P03 run three times gave three
near-disjoint rosters and single runs prove nothing.

## 2026-10-08 — GEO study Phase A: ChatGPT fan-out pilot captured (6/6) + prior sessions recovered

Phase A of the ChatGPT Search fan-out study finally ran. `geo-research/prompts.json` (the design) and
`geo-research/site-audit.md` (Phase B) were already done from an earlier session; the live capture
was the missing half. `REPORT.md` is still **not** written — this entry covers raw data only.

**Six pilot prompts captured**, each in a fresh conversation, submitted verbatim with web search
explicitly enabled, on the user's own authenticated ChatGPT session: P03, P01, P05, P10, B01, B02.
Plus four prior conversations from 2026-10-07, opened with the user's authorisation.

**The extraction ladder mostly failed, for a documented reason.** L1 (`/backend-api/conversation/…`)
returns 404 to a cookie-only fetch — the page's own identical request returns 200, so the API wants a
bearer token, and the protocol forbids touching session tokens. L2 is structurally impossible:
`read_network_requests` exposes no response bodies. The assistant message now renders in a
**cross-origin iframe** (`cdn.platform.openai.com/deployments/dil/v14/runner.html`), so citation
hrefs and any search disclosure are unreachable from the top frame.

**What worked:** rung L3-streaming — a full-resolution zoom on the transient status line within ~4s
of submit. It renders the generated query *sometimes* (P10, B02) and a bare site count other times
(P01, P05: "Searching 12 websites").

**Four findings that matter more than the queries:**

1. **The site is readable; it is never reached.** B02 proves ChatGPT parses priyanshuroy.com
   accurately when handed the domain — positioning, all three services, both case studies. It
   appeared in none of the four intent prompts, and not even in B01's search for the entity's own
   name, where the web returned a LinkedIn profile instead. **Discovery and corroboration are the
   bottleneck, not crawlability** — which means the "technical track is finished" line in the
   backlog above is correct, and the remaining work really is off-site.
2. **ChatGPT cannot place him.** B02 read the entire site and never stated a location. Corroborates
   `site-audit.md` §B: "India" appears zero times sitewide.
3. **The roster is volatile; the framework is stable.** P03 has now been run three times across two
   days and produced three near-disjoint sets of names — one of nineteen recurs. What is identical
   every time: independent/boutique over agency, live shipped work over claims, awards as a
   *discovery index*, and an explicit demand to know who designs versus who develops. The site
   states none of those last two.
4. **City-level intent is a local pack.** "best web designers in kolkata" returned Google-style
   business listings — ratings, review counts, street addresses, phones, a map — not portfolios.
   This settles protocol §23 **against** a Kolkata landing page chasing local intent.

**Also recovered:** three real `search_model_queries`, verbatim, that the user had extracted by hand
from DevTools on 2026-10-07. All three contain India, all three carry an award signal, two contain
"portfolio", one contains "freelance" unprompted, one contains the year 2026.

**Caveat that limits everything above:** the account has memory/personalization active. B01's status
line read *"Distinguishing **your** Priyanshu from public figures"* and the answer opened *"based on
our conversations, you're Priyanshu Roy"*. **B01 is invalid as a neutral baseline** and needs a
logged-out re-run.

Files: `geo-research/raw/{P01,P03,P05,P10,B01,B02}.json`, `geo-research/raw/_capture-log.md`,
`geo-research/raw/_prior-session-6ac60351.md`,
`geo-research/raw/_prior-session-queries-and-local.md`. No site code touched.

Verified: every pilot id has a raw file recording its conversation id, extraction rung and outcome;
queries are stored with explicit confidence levels and the one low-confidence transcription is
flagged as needing re-capture before use. Nothing was inferred into a gap.

Next: Phase C — `geo-research/REPORT.md`. Before that, two cheap things worth doing: a logged-out
B01/B02 re-run for a clean baseline, and the user's own DevTools extraction on a few prompts, which
yields the whole `search_model_queries` block in a minute per prompt where the agent's tools cannot.

## 2026-10-05 — Dossier stage 0: new repo, 9-table schema, single-address auth

Comp AI CRM is **abandoned in place** (not deleted — it stays as a behavioural reference). Rather
than attach a card to Vercel, we are building a replacement: **Dossier**, at
`1abc- Proj/dossier`, own git repo, first commit `1909fe8`. Full plan in
`~/.claude/plans/trynna-get-started-with-validated-beaver.md`.

Same core loop — Gmail in, researched contacts out — with Comp AI's enterprise surface (deals,
Slack, SSO, custom fields, agent builder) cut. 9 tables against their 61. Hard constraint: no money
anywhere. Groq free tier for the model, Neon free for Postgres, Vercel free for hosting only, own
scraper instead of Context.dev, GitHub Actions cron instead of Vercel cron (Hobby cron is capped at
**once per day**, which would make the worker useless).

**Shipped.** Next 16.2.6 + React 19 + Prisma 7 + Auth.js v5. A new `dossier` database inside the
existing Neon project; init migration applied; 9 tables confirmed by SQL. Sign-in is one Google
account, enforced in the `signIn` callback against `ALLOWED_EMAIL` — Gmail's read scope is requested
at sign-in so there is no second "connect your inbox" consent later.

`ContactFact` is the table the project exists for: every claim carries verbatim `evidence`, a
confidence `score`/`band`, the `method` that produced it and a `sourceUrl`, and is **superseded
rather than updated**, so the history of what the agent believed stays readable. Comp AI's
`EmailThread` + `EmailMessage` + `CalendarEvent` + `CalendarAttendee` collapse into one `Activity`
table with a `meta` JSON column.

**Four version traps, all caught by reading rather than assuming** — `AGENTS.md` earning its keep:

1. `prisma` CLI resolved to **8.0.0-rc.19** while `@prisma/client` was 7.10.0. Pinned the CLI to 7.
2. Prisma 7 moved connection URLs out of `schema.prisma` into `prisma.config.ts`, and `directUrl` is
   not a valid key there at all — only `url` and `shadowDatabaseUrl`. Neon's pooler handled the
   migration fine; if one ever stalls, `prisma migrate dev --url "$DIRECT_DATABASE_URL"`.
3. Prisma 7 dropped the bundled query engine — `new PrismaClient()` now requires a driver adapter
   (`@prisma/adapter-pg`).
4. **Next 16 deprecated `middleware.ts` in favour of `proxy.ts`**, exporting `proxy()`. Route
   protection is done in the page via `auth()` instead, since the docs warn Proxy may be deployed to
   a CDN and should not rely on shared modules.

Verified: `npx tsc --noEmit` and `npm run build` both exit 0; dev server on **:3002** (clear of
comp-crm's 3000/3001) serves `/sign-in` 200 with the Google button, and `/` returns 307 to it when
signed out. `.env` confirmed untracked by git; `.env.example` committed.

**Blocked on two things only Priyanshu can do:** add `http://localhost:3002/api/auth/callback/google`
to the existing OAuth client's redirect URIs, and create a free Groq key at console.groq.com. The
first blocks the end-to-end sign-in test; the second blocks stage 2.

Files: `1abc- Proj/dossier/**` (new repo), `updates.md`.

Next: stage 1 — Gmail sync populating `Contact` and `Activity` from the inbox.

## 2026-10-05 — Onboarding done; the agent is blocked on Vercel card verification

Sign-in, onboarding and the Context key all went through. The agent cannot run: **every model call
returns 403 `customer_verification_required`.**

```
AI Gateway requires a valid credit card on file to service requests.
upstreamType: 'customer_verification_required', statusCode: 403
[agent] ⨯ session MODEL_CALL_FAILED
```

This is **not** a bad key. The key authenticates — `/eve/v1/info` still reports
`endpoint.connected: true`. Vercel simply will not serve AI Gateway requests on a hobby account
until a card is on file, free monthly credits included. Adding the card is the user's to do; an
agent must not enter payment details.

**No workaround exists in this codebase.** Every model call routes through the gateway
(`agent/lib/model.ts` only chooses an id string; `/eve/v1/info` shows
`routing: {kind: "gateway", target: "zai"}`), and `docs/environment.md:117` lists
`AI_GATEWAY_API_KEY` as simply "The model". There is no direct-provider key path to fall back on,
so switching models in Settings changes nothing — they all go the same way.

**State in Neon, confirmed by SQL:** 1 user; the Google `account` row already carries
`gmail.readonly` and `calendar.readonly` alongside the openid scopes, so **Gmail and Calendar were
granted at sign-in** and Phase 3's "connect the inbox" step needs no separate action;
`appSetting.contextDevApiKey` set; `agentModelId` still null (the agent falls back to its own
default, `zai/glm-5.2-fast`); 0 contacts; 1 `agentTask`.

That single task is `workspace-profile`, reason *"The company using this CRM said what its website
is (priyanshuroy.com)"* — started 18:44 UTC, `finishedAt` null, `outcome` null. It is the first
casualty of the 403, and `workspaceProfile.website` and `.narrative` are both still null as a
result. It should complete on retry once the gateway serves requests.

Also worth knowing: Context.dev's free tier is 500 credits/month with brand retrievals at 10 credits
each — roughly 50 company lookups before it runs dry.

Files: `updates.md`, `plan.md`. No code changed.

Next: user adds a card at Vercel, then the `workspace-profile` task retries and Phase 3 can actually
be judged.

## 2026-10-04 — Phases 1–2 finished: Neon, Google OAuth, AI Gateway, CRM booted

The three account-dependent blockers from 2026-10-02 are resolved and the CRM runs locally against
Neon. All changes are in `comp-crm\.env` (outside this repo, gitignored there). No portfolio code
touched.

**Neon.** Project `portfolio-crm` (`steep-snow-81337543`), AWS Asia Pacific 1 (Singapore), branch
`production`, database `neondb`, Postgres 18.6, free plan. `DATABASE_URL` (pooled) and
`DIRECT_DATABASE_URL` (unpooled, same string minus `-pooler`) both written. `bun run db:deploy`
applied all **56 migrations**; `information_schema` now reports **61 tables** in `public`.

Both Neon and Vercel MCP servers were re-authorised by the user via `/mcp`, which finally resolved
the 2026-10-02 cwd-casing/token-wipe problem. Neon MCP supplied the connection string directly, so
the role password never passed through the browser. Vercel MCP authorised *without* the personal
team scope (`403 forbidden … scope "priyanshuroyofficial19-9388s-projects"`), so the AI Gateway key
was created by hand instead; re-auth selecting that scope would fix it for next time.

**Sign-in account changed to `priyanshuroy.official19@gmail.com`.** `ALLOWED_SIGN_IN` previously
named the academics address, but `.env.local` sets `CONTACT_TO_EMAIL=priyanshuroy.official19@gmail.com`
and `priyanshuroy.academics@gmail.com` survives only as `FALLBACK_TO_EMAIL` in
`src/app/contact/actions.ts:35`. Enquiries land in the official19 inbox, and that is the inbox the
agent has to read, so the CRM signs in as that account. Neon, Vercel and Resend are all on it too.

**Google OAuth.** Cloud project `portfolio-crm-510617`; Gmail API and Google Calendar API enabled;
consent screen External + Testing with official19 as the sole test user; Web client with the single
redirect URI `http://localhost:3001/api/auth/callback/google`. That URI was confirmed against
`packages/auth/README.md:74` (`<API_URL>/api/auth/callback/google`) rather than taken from the plan —
`docs/environment.md:71` notes every OAuth redirect is built from `API_URL`, never `APP_URL`, and
`API_URL` is left at its `localhost:3001` default.

**Two boot problems, both resolved by reading the repo rather than guessing:**

1. `bun run dev` dies with *Cannot run interactive task "agent#dev" without Terminal UI* — `turbo run
   dev` needs a TTY this session doesn't have. `turbo.json:69` already defines a `dev:headless` task
   and `apps/agent` implements it as `eve dev --no-ui`. So the working split is
   `bunx turbo run dev --filter=app --filter=api` plus `bunx turbo run dev:headless --filter=agent`.
2. `packages/db/scripts/require-local-db.ts` refuses any `dev` against a non-local host, because
   "dev can rewrite or drop schemas". That is a blanket warning over the whole dev family, not an
   accurate description of this path: `prepare-dev.ts:6-24` runs only `prisma migrate deploy`
   (additive, already applied), `prisma generate` (local codegen) and `prisma migrate diff
   --exit-code` (read-only). With Neon standing in for Docker, this guard will fire on every single
   `dev` run, so `ALLOW_REMOTE_DB=1` is now a permanent requirement of this install. It is currently
   passed per-invocation and is **not** in `.env` — deliberately, since persisting it would also
   disarm the guard for genuinely destructive scripts like `db:reset`.

**Verified.** Ports 3000/3001/2000 all listening. API logs `Database connected` and
`API listening on http://localhost:3001`. `GET http://localhost:3000/sign-in` → **200**.
`GET http://127.0.0.1:2000/eve/v1/info` returns diagnostics with
`model.endpoint = {kind: "gateway", connected: true, credential: "api-key"}`, which proves the AI
Gateway key is valid. Default model is `zai/glm-5.2-fast` — changeable in the CRM's settings UI.

**Not yet verified:** Google sign-in has not been exercised. The client secret was transcribed from
a screenshot and its final character is ambiguous between capital `I` and lowercase `l`; if sign-in
fails with an invalid-client error, re-copy it from the Clients page before looking anywhere else.

Files: `comp-crm\.env`, `plan.md`, `updates.md`.

Next: user signs in at `localhost:3000`, then Phase 3 — connect Google under Settings → Connections,
pick a model, trigger `POST /internal/sync/google` with `Authorization: Bearer <CRON_SECRET>`, and
judge the agent's output before touching the portfolio in Phase 4.

## 2026-10-03 — Correction: the case-study date was an edit artifact in the wrong place

Reverting the visible date shipped in `83af7df` and replacing it. File:
`src/components/work/CaseStudy.tsx`.

**What was wrong.** It rendered `Updated October 2026` from Sanity's `_updatedAt`, which stamps the
last *document edit*, not the project:

```
a2-studios   year=2026  created=2026-07-27  updated=2026-10-03
kbrs         year=2026  created=2026-07-27  updated=2026-10-03
```

Both showed the same date because that is when the gallery alt text was typed into the Studio
earlier the same day. So both pages claimed to have been updated an hour ago, for a reason with
nothing to do with the work — and every future typo fix would have re-stamped them identically.
`_updatedAt` is a correct `dateModified` for machines and bad user-facing copy. It was also stacked
as a third line in the centered hero, which crowded a deliberately sparse header.

**What it is now.** The project's own `year` (`2026`), in the existing rule strip beside
`/ Overview` — a bar that already carries metadata, so no new element enters the layout:

```
 KBRS & ASSOCIATES    2026 / OVERVIEW
```

Emitted as `<time dateTime="2026">2026</time>` so it stays machine-readable, guarded on
`project.year` since the field is optional (`splintr` has none). The `UPDATED_FORMAT` formatter and
its hydration-safety reasoning went with the removed string — `year` is a plain string needing no
locale handling.

`src/app/work/[slug]/page.tsx` is untouched: JSON-LD still carries `datePublished` from `createdAt`
and `dateModified` from `updatedAt`, which is where that field's meaning is correct.

Verified: `npx tsc --noEmit` and `npm run build` exit 0; against a local production server both case
studies emit `<time dateTime="2026">2026</time>`, no visible "Updated" label remains, and JSON-LD
still carries both date properties.

**GEO impact: roughly neutral, and more honest.** Authority & brand was credited partly for visible
recency, but a date that moves whenever any field is edited was never a real recency signal — only
one that looked like one. The genuine lever in that dimension is still off-site presence
(Wikipedia / Reddit / YouTube), still at zero.

## 2026-10-03 — First GEO/AEO pass: recency, extraction noise, AI-crawler declarations

Scope widened by request: SEO work on this site now covers AEO/GEO and agentic readiness by
default, not classic search alone. Ran `seo-geo` against the live site for the first time.

**GEO Readiness: ≈45/100**

| Dimension | Weight | Score | Note |
|---|---:|---:|---|
| Citability | 25% | 32 | No self-contained answer blocks, no definitions, no data points |
| Structural readability | 20% | 45 | **0 question-form headings of 22**, 0 tables, 0 FAQ |
| Multi-modal | 15% | 40 | Images only — no video, charts or tools |
| Authority & brand | 20% | 22 | No dates rendered; no Wikipedia/Reddit/YouTube presence |
| Technical accessibility | 20% | 88 | SSR, AI search bots allowed, real 404s — carrying the score |

**A finding worth keeping:** `content_quality.py` scores the prose **89–94/100** on every page with
**0 filler and 0 AI-pattern** markers. The classic audit's Content Quality 38 measures word count
and page coverage, not writing quality. The writing is good; there is not enough of it, and it is
not shaped for extraction.

**Shipped.** Files: `src/components/work/CaseStudy.tsx`, `src/components/sections/Hero.tsx`,
`src/components/transition/LandingIntro.tsx`, `src/components/ui/FloatingMenu.tsx`,
`src/app/robots.ts`.

1. **Case studies now render their own recency.** Sanity's `_updatedAt` was already fetched and
   already feeding JSON-LD `dateModified` and the sitemap's `lastmod` — it was simply never shown,
   so both pages read as undated. Now a `<time dateTime="…">` beside the Service label. Month
   precision, explicit locale, UTC: this is a client component, so a locale- or zone-dependent
   string would differ between server and browser render and trip a hydration mismatch.
2. **`data-nosnippet` on three decorative blocks.** The homepage's extracted body text opened with
   the brand name eight times before the h1. Traced exactly: the hero marquee repeats it 6× to loop
   seamlessly (`Hero.tsx:538-553`), the intro preloader wordmark (`LandingIntro.tsx:1126`), and the
   closed menu overlay (`FloatingMenu.tsx:302`), which sits in the DOM on every page. All three
   already had `aria-hidden` — that governs the accessibility tree and does nothing for text
   extraction.
3. **`Claude-SearchBot` and `Applebot-Extended` declared.** `ClaudeBot` was already listed but is
   training-only; `Claude-SearchBot` is the bot that governs citability in Claude's search features,
   and the two are routinely conflated. Nothing was blocked before (the named group falls through to
   `User-Agent: *`), but that group exists to state intent so a future wildcard tightening cannot
   silently drop the site out of AI answers.

**Honest limit on #2:** `data-nosnippet` is a Google-honoured signal, not a DOM change. The repeated
text is still present for extractors that ignore it. Removing it properly means not emitting the
marquee duplicates server-side — deferred, since it would mean reworking a working animation.

Verified: `npx tsc --noEmit` and `npm run build` exit 0; checked against a local production server —
robots.txt lists both new agents, 3 `data-nosnippet` blocks render on the homepage, and both case
studies emit `<time dateTime="2026-10-03T…">October 2026</time>`.

**Blocked, not skipped:** `agent_ux_check.py` (Playwright browser cannot download —
`ENOTFOUND playwright.download.prss.microsoft.com`), `nlp_analyze.py` (needs a Google Cloud NL key),
`pagespeed_check.py` (PSI keyless quota, as on every prior attempt).

**Post-deploy re-measure (live):** `data-nosnippet` ×3 on the homepage; `<time>` on both case
studies; robots lists both new agents. `agentic_check` 6 pass / 3 info and `preload_check` 50,
both unchanged as expected — neither was touched.

| Score | Before | After |
|---|---:|---:|
| Classic SEO | ≈77 | **≈77** |
| GEO Readiness | ≈45 | **≈51** |

GEO dimensions moved: Authority & brand **22 → 42** (recency now readable), Technical accessibility
**88 → 94**, Citability **32 → 36**, Structural **45 → 46**, Multi-modal 40 unchanged.

**The classic score did not move, and that is the expected result.** Its weighting rewards word
count, coverage and page-level technicals — none of which this pass touched. Rendering recency and
suppressing decorative text are AEO/GEO levers specifically. Worth remembering before reading a flat
classic number as "no progress".

**Next, and it is content:** question-form headings (0 of 22 today), a 130–170 word self-contained
answer block, a services comparison table, an FAQ, and off-site presence. Brand mentions correlate
~3x more strongly with AI citations than backlinks (YouTube ~0.74 vs Domain Rating ~0.27), and the
site is at zero on all of them.

## 2026-10-03 — Studio deployed, content entered, re-audited: ~65 → ~77

Ran `sanity deploy` against the correct account, then entered `seoTitle` and gallery alt text in the
Studio. Re-audited the live site. Raw outputs in `priyanshuroy.com-audit/live2/`.

**Studio deploy.** `priyanshuroy-portfolio.sanity.studio` rebuilt — `Last-Modified` moved
`2026-09-06 13:14` → `2026-10-03 10:55`, schema `portfolio-studio` registered against `i0fv16h3`.
The account fix was the gate: `priyanshuroy.academics@gmail.com` sees `i0fv16h3`; the previously
logged-in `priyanshuroy.official19@gmail.com` saw only `13cts9ov`.

**Content entered.** Verified against the Sanity API, not just the rendered page:
`seoTitle` = `Priyanshu Roy — Website Designer & Web Developer`; 4/4 alts on `kbrs-associates`,
5/5 on `a2-studios`. Alt text was written by actually viewing each image rather than inferring from
captions — all captions were `null`, so there was nothing to infer from.

**Measured live:**

| Check | Baseline | Prev | Now |
|---|---|---|---|
| Homepage `<title>` length | 13 | 13 | **48** |
| Empty `alt` on `/work/a2-studios` | 11 of 13 | 11 of 13 | **1 of 13** |
| Empty `alt` on `/work/kbrs-associates` | 9 of 11 | 9 of 11 | **1 of 11** |
| Sitemap `<loc>` returning 200 | 0 of 6 | 0 of 6 | **6 of 6** |
| agentic_check | 3 P0 pass | 3 pass / 2 info | **6 pass / 3 info** |
| Homepage preload hints | 9 | 7 | 7 |

The single remaining empty alt on each case study is the *next-project* navigation thumbnail (asset
`30baec7f…`, which belongs to a different document and is not a gallery slide). It sits inside a
link with visible text, so empty alt is correct there. The homepage's 7 remain decorative
`LandingIntro` panels and ornaments — also correct.

**One tooling caveat worth not re-discovering:** `parse_html.py` still reports the homepage h1 as
`WebsiteDesigner&WebDeveloper`. That is the tool, not a regression — it uses `get_text(strip=True)`,
which drops text-node whitespace before joining. Extracted with whitespace preserved, all six h1s
read correctly: `Website Designer & Web Developer`, `Good work takes time. These took mine.`, etc.

**Re-score, same weights:**

| Category | Weight | Baseline | Prev | Now | Why not higher |
|---|---:|---:|---:|---:|---|
| Technical SEO | 22% | 62 | 72 | **95** | Host conflict resolved; nothing material left |
| Content Quality | 23% | 38 | 38 | **38** | Out of scope — pure writing, unchanged word counts |
| On-Page SEO | 20% | 55 | 72 | **88** | `/about` h1 is still "About"; `/#services` still dangling |
| Schema | 10% | 78 | 92 | **98** | — |
| Performance | 10% | 50 | 58 | **58** | CWV still unmeasured; no speculation rules, no `fetchpriority` |
| AI Search Readiness | 10% | 72 | 88 | **92** | Only deliberate skips left (Content-Signal, Markdown, WebMCP) |
| Images | 5% | 40 | 40 | **90** | — |
| **Total** | | **55** | **≈65** | **≈77** | |

**+22 from baseline.** This is essentially the ~78 ceiling the plan predicted for a technical-only
track, reached. Performance remains the one category scored on assumption rather than measurement:
`pagespeed_check` hit `PSI rate limit exceeded (240 QPM / 25,000 QPD)` again on the keyless shared
quota, as it did on every prior attempt.

**Next, in order of value:**

1. **Content track** — the only remaining lever of size. Content Quality is 23% of the weighting and
   sits at 38 on word count (`/work` is 50 words), absent E-E-A-T evidence and 6 pages total. No code
   or CMS change moves it. Worth roughly +10 to the total on its own.
2. **Free Google API key** (PageSpeed Insights + Chrome UX Report, stored at
   `~/.config/claude-seo/google-api.json`) — converts Performance from assumption to measurement.
   Could move the number either direction; currently unknowable.
3. **Cheap technical remainder** — speculation rules, `fetchpriority="high"` on the real LCP element
   (identify it only once measurement exists), `/about` h1, a real `/services` page behind the
   dangling `/#services` anchor.

## 2026-10-03 — Vercel redirect flipped to apex; Sanity toolchain to 6.17.0

Two things, one of them a correction to an assumption in the previous entry.

**1. Host conflict resolved — the audit's #1 critical finding is closed.**

The Vercel domain settings were flipped so `priyanshuroy.com` serves and `www` redirects to it.
Zero code changes, as predicted. Measured live:

| Check | Before | After |
|---|---|---|
| `priyanshuroy.com/` | 308 → www | **200** |
| `www.priyanshuroy.com/` | 200 | **308 → apex** |
| Path preserved through redirect | — | yes (`/work` → `/work`) |
| Sitemap `<loc>` URLs returning 200 | 0 of 6 | **6 of 6** |
| `canonical` / `og:url` | named a host that redirected | `https://priyanshuroy.com`, now truthful |
| `www` strings in homepage source | — | **0** |

Worth recording the failure mode, because it is not obvious: setting `www → apex` *first* leaves
Save greyed out in the Vercel UI with no error message. Apex still pointed at `www` at that moment,
so the pair would have formed a redirect loop and Vercel silently refuses it. The apex must be
promoted to Production first; only then will the `www` redirect save.

**2. `sanity` 6.5.0 → 6.17.0, `@sanity/vision` bumped to match.** Files: `package.json`,
`package-lock.json` (commit `9b95869`, kept separate from SEO work).

This arrived as collateral: `sanity deploy` failed and `npm update sanity` was run in response, but
the two were unrelated — see below. Keeping the bump rather than reverting it, because `^6.5.0` was
already the declared range, so the lockfile had merely drifted behind the project's own intent.
`vision` was bumped in lockstep because `npm update` had moved only `sanity`, leaving a Studio
plugin skewed from the Studio while `visionTool()` is registered in `sanity.config.ts`.

Verified: `npx tsc --noEmit`, `npm run build` and `npx sanity build` all exit 0; all 16 routes still
generate. No site-bundle exposure — both packages are devDependencies, nothing under `src/` imports
`sanity`, there is no embedded `/studio` route, and `next`/`react` did not move.

**Discovered, still blocking the remaining two items:**

- **The hosted Studio is stale.** `priyanshuroy-portfolio.sanity.studio` was last built
  **2026-09-06**; `gallerySlide.alt` landed **2026-10-03** in `210a57d`. The Next.js site redeploys
  on push, the Studio only on `sanity deploy` — which was never run. So the Alt text field is
  correct in code but absent from the Studio UI. This is why the previous entry's "someone needs to
  type the alt text" was not actionable as written.
- **`sanity deploy` fails on the wrong account.** `User is missing required grant
  sanity.project.read`. Not a CLI version issue: the logged-in account
  (`priyanshuroy.official19@gmail.com`) can see only project `13cts9ov`, while this repo and the
  live site both use `i0fv16h3` (confirmed via `cdn.sanity.io/images/i0fv16h3/` on a served page).

**Next:** log in as the account owning `i0fv16h3` (`sanity logout` → `sanity login`; verify with
`sanity projects list`), run `sanity deploy`, then enter `seoTitle` and the gallery alt text in the
Studio and re-audit. Score should move ~65 → ~78.

## 2026-10-03 — Deployed and re-audited live: 55 → ~65

Pushed `210a57d` to `main`, Vercel deployed it, and re-ran the audit against the live site. Raw
outputs in `priyanshuroy.com-audit/live/` (the `raw/` dir remains the pre-fix baseline).

**Confirmed live:**

| Check | Before | After |
|---|---|---|
| Homepage h1 `textContent` | `WebsiteDesigner&WebDeveloper` | `Website Designer & Web Developer` |
| `/work` h1 `textContent` | `Good work takes time.These took mine.` | `Good work takes time. These took mine.` |
| `/llms.txt` | 404 | **200, Lighthouse check passes** |
| robots.txt `Host:` | present, naming the redirecting host | gone |
| Case-study `lastmod` | all = build time | real `_updatedAt` (kbrs `2026-09-06`, a2 `2026-10-02`) |
| Homepage preload hints | 9 (incl. invisible hover image) | 7 |
| Hover preview `<img>` with `src` on load | 2 of 2 | **0 of 2** |
| agentic_check P1 | 1 pass / 4 info | 3 pass / 2 info |
| JSON-LD types per page | Person, WebSite | + WebPage / ProfilePage / ContactPage, `mainEntity` |

**Re-score, same weights as the original audit:**

| Category | Weight | Before | Now | Why it is not higher |
|---|---:|---:|---:|---|
| Technical SEO | 22% | 62 | 72 | Host conflict still live — Vercel redirect not flipped |
| Content Quality | 23% | 38 | 38 | Out of scope this pass |
| On-Page SEO | 20% | 55 | 72 | Homepage title still `Priyanshu Roy` (Sanity override) |
| Schema | 10% | 78 | 92 | `@id`s still name the redirecting apex |
| Performance | 10% | 50 | 58 | CWV still unmeasured; LCP hint pending measurement |
| AI Search Readiness | 10% | 72 | 88 | Only optional items left (Content-Signal, Markdown) |
| Images | 5% | 40 | 40 | Pipeline shipped, **no alt values entered yet** |
| **Total** | | **55** | **≈65** | |

**+10 points, and every remaining point is blocked on something I cannot do.** Note Images did not
move at all: the schema field and render path are live, but an empty field renders the same `alt=""`
as before. The code was only ever half of that fix.

**What each remaining action is worth:**

- **Flip the Vercel redirect** (apex primary, www → apex): ~+6. All six sitemap `<loc>` values still
  return **308**, and every canonical and schema `@id` still names a host that redirects. This is the
  one Critical finding and the single highest-value action left.
- **Sanity `siteSettings.seoTitle`** → `Priyanshu Roy — Website Designer & Web Developer`: ~+3.
  Verified live that the code fallback is correct and the CMS value is what overrides it.
- **Gallery alt text** in the Studio: ~+2.8.
- **Google API key**: unblocks measurement rather than scoring — Performance's 58 is static signals
  only, so the real number could be higher or lower.

Together those reach **≈78–81**, which is the ceiling the plan predicted for a technical-only pass.
The gap from there to 100 is the content track.

PSI remains unavailable: `PSI rate limit exceeded (240 QPM / 25,000 QPD)` on the keyless pool for
both strategies, across two attempts hours apart. It is a shared anonymous quota, not a per-site
limit, so a free key is the only fix.

## 2026-10-03 — SEO technical track implemented (audit findings 1–9, content track skipped)

Implemented the technical half of the audit's action plan. The content work was deliberately skipped,
which caps the achievable score at **~81/100** (Content Quality is 23% of the weighting and is pure
writing — no code change moves it). Everything here is verified locally against a production build;
nothing is live until deployed.

### The heading bug was real, and the audit tool cannot see the fix

The h1 defect was confirmed and fixed, but **`parse_html.py` reports the same broken string either
way**, so re-running the audit is not a valid check for it. Verified instead with BeautifulSoup's
`get_text()`:

```
BEFORE  textContent = 'WebsiteDesigner&WebDeveloper'
AFTER   textContent = 'Website Designer & Web Developer'
```

The tool uses `get_text(strip=True)`, which strips each text node before joining and so destroys
exactly the whitespace in question. **Do not treat the tool's `h1` field as evidence on this.**

Cause was a shared idiom copied into **six** components, not one: `Reveal()` splits a heading on
`" "` and spaces the words with `mr-[0.25em]`, a margin — so no whitespace character ever reached the
DOM. Fixed in `Hero.tsx`, `AboutStage.tsx`, `AboutWork.tsx`, `CtaCollage.tsx`, `ContactStage.tsx`,
`NotFoundStage.tsx`, plus `src/app/work/page.tsx`, which had the same defect via a different
mechanism (two block-level line spans concatenating to `Good work takes time.These took mine.`).

The `{" "}` goes **inside** the outer span, after the inner one, deliberately: trailing whitespace in
an inline-block is trimmed at render, so output is pixel-identical. Putting it between the outer
spans would have doubled the gap and introduced line-break opportunities in headings that are
pre-split on `\n` and meant not to wrap.

### Also changed

- **`robots.txt`**: dropped the `Host:` directive (`src/app/robots.ts`) — a Yandex-only extension
  Google and Bing ignore, which was also naming the host that redirected away.
- **Sitemap `lastmod`** (`src/app/sitemap.ts`, `queries.ts`, `getCaseStudy.ts`): was `new Date()` on
  every entry, i.e. the build time, which Google answers by distrusting the field. Added
  `workSitemapQuery` + `getWorkSitemapEntries()` (kept separate from `getWorkSlugs()`, which feeds
  `generateStaticParams` and wants a bare `string[]`) so case studies carry Sanity's `_updatedAt`.
  Verified real per-document dates: kbrs `2026-09-06`, a2 `2026-10-02`. Dropped `changefreq` and
  `priority` — Google ignores both. Static routes now use a hand-maintained constant.
- **Gallery alt text** (`workProject.ts`, `queries.ts`, `getCaseStudy.ts`, `types.ts`,
  `CaseStudyGallery.tsx`): `alt={item.caption ?? ""}` meant every uncaptioned slide shipped
  `alt=""`, claiming the screens were decorative on the pages whose purpose is showing them. Added a
  first-class `alt` field with a publish-time warning, threaded through the whole chain, rendered as
  `item.alt ?? item.caption ?? ""` in both tracks.
- **Hover previews** (`HoverPreviewCard.tsx`): every project's preview carried its `src` from first
  render, so the browser downloaded all of them on page load for a card invisible until hover.
  `loading="lazy"` does **not** fix this — the card is `position: fixed` inside the viewport at
  `opacity: 0`, so it intersects and fetches immediately; withholding the attribute is what defers
  it. Now primed on first pointer move over the list (earlier than first row hover, so the card's
  0.5s fade covers the fetch). Verified: **2 hover `<img>`, 0 with `src`** on initial load.
- **Schema** (`src/lib/schema.ts` new, `layout.tsx`, `about/layout.tsx`, `contact/layout.tsx`,
  `work/[slug]/page.tsx`): added `Person.image` + `knowsAbout`, and a per-route `WebPage` node tied
  into the sitewide graph by `isPartOf`/`about`. `/about` is now `ProfilePage`, `/contact` is
  `ContactPage`, and case studies add `WebPage` with `mainEntity` → the `CreativeWork`.
- **`/llms.txt`** (`src/app/llms.txt/route.ts`, new): generated from Sanity rather than committed, so
  it cannot drift; same publishable filter as the sitemap. Has the H1, `>` summary and Markdown links
  the Lighthouse audit checks for.
- **CMS value trimming** (`layout.tsx`): `seoTitle` held a trailing space, which shipped as
  `og:title: "Priyanshu Roy "` to every scraper. Now trimmed, and an empty-after-trim field falls
  through to the default. Verified `og:title` is clean.

### Deliberately not done, with reasons

- **Speculation rules** (audit item 7). `SmartLink` wraps `next/link`, so Next already prefetches
  every internal route — document-level rules would duplicate that, and `prerender` would execute
  this site's GSAP timelines and the pre-paint intro arming script in a hidden document. The audit
  tool's generic recommendation does not fit this architecture; `preload_check`'s score will stay
  near 50 and that is the correct trade.
- **`WebPage` node for `/` and `/work`**. Every page component is `"use client"`, and `/work`'s
  layout also wraps `/work/[slug]`, so a node there would claim each case study was the index. Doing
  it properly means converting those routes to server wrappers — disproportionate for what the audit
  rated a Low finding.
- **LCP `fetchpriority`** (audit item 6). Needs real measurement first. The 9 preload hints are not
  careless: `LandingIntro` preloads intro panels with a documented rationale and the case-study cover
  already uses `priority`, so bulk-adding it would make things worse.
- **Image URL de-duplication.** Deferred: it needs `HoverPreviewCard` moved onto `next/image`, whose
  refs the GSAP park/slide timelines depend on. The hover-preview deferral above already removes the
  duplicate download from page load, which was the practical cost.

### Verified

`npx tsc --noEmit` exit 0; `npm run build` exit 0 (16/16 static pages, `/llms.txt` registered as a
route). Against a local production server: `robots.txt` has no `Host:`; `sitemap.xml` carries real
per-document dates and no `changefreq`/`priority`; `llms.txt` renders correctly; `/work` h1 reads
`Good work takes time. These took mine.`; JSON-LD types and `@id` edges confirmed on all four page
kinds; hover previews ship no `src`.

### Two things still need you

1. **Homepage `<title>` is still `Priyanshu Roy`.** `DEFAULT_TITLE` is updated to
   `Priyanshu Roy — Website Designer & Web Developer`, but Sanity's `siteSettings.seoTitle` overrides
   it and still holds the old value. **This is a Studio edit, not a code change.**
2. **Gallery alt text is still empty** (a2: 10 gallery images, 0 with alt, 0 captions). The field and
   the whole pipeline are in place; the values have to be typed per slide in the Studio. Describing
   them needs someone who can see the screens.

Plus the two Phase 0 items from the plan: the Vercel apex/www redirect flip, and a free Google API
key for real CWV numbers. Re-running the full audit is only meaningful after a deploy — localhost
cannot be checked by the agentic/sitemap/PSI tools.

## 2026-10-03 — Full SEO audit of priyanshuroy.com run via vendored claude-seo

Ran the complete audit inline (no subagents) against the live site across all 6 sitemap URLs.
**SEO Health Score 55/100.** Artifacts in `priyanshuroy.com-audit/` (gitignored via a new `/*-audit/`
rule): `FULL-AUDIT-REPORT.md`, `ACTION-PLAN.md`, `audit-data.json`, an HTML report, and `raw/` with
every tool's unedited output.

**Context that reframes the findings:** WHOIS reports the domain created **2026-10-02** (0.0 years,
GoDaddy) and it is absent from the Common Crawl web graph. The site is a day old, nothing ranks yet,
so indexation comes before optimisation.

**The two findings worth acting on immediately — both are code bugs, not SEO advice:**

1. **Host conflict.** `https://priyanshuroy.com/` 308s to `https://www.priyanshuroy.com/`, but every
   `canonical`, `og:url`, JSON-LD `@id`, sitemap `<loc>` and robots `Host:`/`Sitemap:` line names the
   apex. Every canonical points at a URL that redirects, and the whole sitemap is redirecting URLs.
   One fix: set `NEXT_PUBLIC_SITE_URL=https://www.priyanshuroy.com` in Vercel production —
   `src/lib/siteUrl.ts` feeds that single value to `metadataBase`, the sitemap and all JSON-LD. (Or
   flip the Vercel redirect to www → apex instead.)
2. **The h1 has no spaces in it.** `src/components/sections/Hero.tsx:50-63` — `Reveal()` splits the
   heading on `" "` then spaces the words with `mr-[0.25em]`, a purely visual gap. So the homepage h1
   has `textContent` of `WebsiteDesigner&WebDeveloper`, and the `/work` h2 reads
   `Good work takes time.These took mine.` Every text consumer — Google's extractor, screen readers,
   AI crawlers — sees one run-on token where the site's main keyword string should be.

Other material findings: content is thin everywhere (50–248 words/page; `/work` is a 50-word hub),
27 of 37 images have empty `alt` (case-study galleries almost entirely undescribed), homepage
`<title>` is 13 chars and names no service, LCP image is not preloaded while a preload *is* spent on
the invisible nav hover-preview, and the same case-study asset downloads twice under two URLs
(`cdn.sanity.io/...` raw plus `/_next/image?url=<same>`). Schema is the strong category (78): Person
+ WebSite sitewide, BreadcrumbList + CreativeWork on case studies, `sameAs` populated. Agent
readiness is good too (72) — all P0 checks pass and robots has a deliberate allow group for GPTBot,
OAI-SearchBot, ClaudeBot, PerplexityBot and Google-Extended.

**Two things to be careful of in the raw data:** an 807 KB PNG on the Sanity CDN is *not* a real
finding — with a browser `Accept` header the same URL serves a **39.6 KB AVIF**, so it was dropped.
And `/contact`'s P0 "server-rendered" warn is word-count driven (114 words), not a CSR problem; the
form is in the raw HTML.

**Could not be measured, and the score says so rather than assuming a pass:** Core Web Vitals
(no Google API key, and keyless PSI returned `rate limit exceeded` for both strategies — so the
Performance score of 50 is static signals only), indexation/impressions (no Search Console OAuth),
and backlinks (new domain, no Moz/Bing key).

Verified: every script exited 0 and its raw output is in `priyanshuroy.com-audit/raw/`; all 6 URLs
returned 200; `git status --short` shows no audit or vendor entries. **PDF generation failed** —
`weasyprint` is installed in the venv but cannot load its native GTK/Pango libraries on Windows, and
that needs a system-wide GTK runtime install, which was not done unprompted. The HTML report
(`--format html`) was generated instead.

**What's next:** Phase 1 of `ACTION-PLAN.md` is four items (host decision, `Reveal` spacing fix,
homepage title, Search Console verification). The host fix and the `Reveal` fix are small code
changes in this repo and can be done on request.

## 2026-10-03 — claude-seo vendored into `vendor/`, deliberately unwired

The SEO toolkit [AgriciDaniel/claude-seo](https://github.com/AgriciDaniel/claude-seo) (v2.4.1, MIT —
26 skills, 19 agents, ~60 Python scripts) is now available to this project **without** being
installed anywhere global and **without** appearing in the `/` command list.

**Why unwired.** Upstream `install.ps1` hardcodes `$env:USERPROFILE\.claude\skills\seo` and
`...\agents` with no target-dir option, so it was never run. The two project-only alternatives —
registering it as a plugin via `extraKnownMarketplaces`/`enabledPlugins`, or copying its skills into
`.claude/skills/` — both make all 26 skills and 19 agents discoverable, which loads their names and
descriptions into the system prompt of *every* session. That ambient context cost was the thing to
avoid, so nothing was wired: the clone sits inert on disk.

**Two ways to invoke it, both free when idle:**

1. Ask the agent in any session ("audit the homepage for technical SEO"); it reads the relevant
   `vendor/claude-seo/skills/<name>/SKILL.md` on demand and runs scripts through the vendored venv:
   `vendor\claude-seo\.venv\Scripts\python.exe vendor\claude-seo\scripts\<script>.py <url> [flags]`
   (note: `fetch_page.py` takes the URL **positionally**, not `--url`).
2. For the real `/seo audit|page|technical|content|schema|geo|local|…` commands, launch a dedicated
   session with `claude --plugin-dir vendor/claude-seo` from the repo root. The flag persists
   nothing, so normal sessions stay clean.

**Changed.** `.gitignore` — added `/vendor/` next to the existing `/graft/` tool-cache entry (done
*before* cloning, so nothing was ever stageable). Clone at `vendor/claude-seo` (`git clone --depth 1
--branch v2.4.1`, detached at `ff87fce`; the tag is annotated, hence git's "is not a commit"
warning). Runtime built with `py -3 vendor\claude-seo\scripts\runtime.py setup --skip-browser` →
venv at `vendor/claude-seo/.venv`. No source files of this app were touched.

**Verified.** `runtime.py doctor` → `Runtime: ready / Install mode: manual / Python: 3.12 /
Chromium: not installed`, exit 0. `git status --short` shows no `vendor/` entries. Nothing landed
outside the repo: `%LOCALAPPDATA%\claude-seo` absent, `~/.claude/skills` still holds only the
pre-existing `.trash` and `synced`, no `~/.claude/agents`, `.claude/settings.json` untouched, no
`.claude/settings.local.json` created. End-to-end fetcher test:
`fetch_page.py https://example.com --json` → HTTP 200 with parsed HTML, headers and structured-data
block, exit 0.

**What's next.** Opt-in when needed, all skipped for now: Playwright Chromium for JS/SPA rendering
(`runtime.py setup` without `--skip-browser`, ~150MB), Google API credentials in
`~/.config/claude-seo/`, and the 9 MCP extensions (DataForSEO, Firecrawl, Ahrefs, …). Note this
project's `NEXT_PUBLIC_SITE_URL` is unset locally, so an audit of this site needs either
`npm run dev` running or the deployed URL passed explicitly.

## 2026-10-02 — Neon + Vercel MCP moved to user scope (re-auth pending)

Neon and Vercel MCP servers were added so the agent could create the database and mint the AI
Gateway key itself. They were registered and authorised correctly, but **their tools never loaded
into the session**, so they were unusable.

**Diagnosis.** `claude mcp list` showed both Connected at *Local* scope, and
`~/.claude/.credentials.json` held completed OAuth for both (live access + refresh tokens, Neon
scope `read write`, Vercel scope `openid offline_access`). Yet `ToolSearch` found no `mcp__neon__*`
or `mcp__vercel__*` schemas at all. So the failure was tool *loading*, not authentication.

Cause: local-scope MCP servers are keyed by the exact working-directory string in `~/.claude.json`.
The entry holding them was keyed `D:/…/Priyanshu` (uppercase `D:`), but the session started with its
cwd as lowercase `d:\…` and only normalised to `D:\` after the first command. The same split already
exists on this machine for `Pujogo`, which appears under both `d:/…` and `D:/…`.

**Change.** Moved both servers from local to **user scope**, which is not keyed by cwd and so cannot
be hidden by the casing split:

```powershell
claude mcp remove neon -s local ; claude mcp remove vercel -s local
claude mcp add --transport http -s user neon https://mcp.neon.tech/mcp
claude mcp add --transport http -s user vercel https://mcp.vercel.com
```

**Caveat, contrary to expectation:** `claude mcp remove` also wiped the stored OAuth tokens. The
entries survive as empty shells (no refresh token, empty scope), so both now report *Needs
authentication*. A surgical restore of just those two entries from a backup was attempted and
**denied by the permission classifier** (credential-store write) — correctly, so it was not worked
around. Both servers need one `/mcp` re-auth each.

Verified: `claude mcp get neon` / `… vercel` both report `Scope: User config (available in all your
projects)`; the entries now sit in the top-level `mcpServers` block rather than under the project
key. Pre-change copies of `~/.claude.json` and `.credentials.json` are in this session's scratchpad
(`credentials.backup.json`, `claude.json.backup`) and should be deleted once re-auth succeeds.

Files: `~/.claude.json` (via `claude mcp` only), `updates.md`. No project code touched; no change to
this site's runtime behaviour. `comp-crm\.env` still unmodified — `DATABASE_URL` remains the
localhost placeholder, `GOOGLE_CLIENT_*` empty, `AI_GATEWAY_API_KEY` still commented out.

Next: user re-auths both via `/mcp`, then a fresh session; agent confirms the tool schemas load,
creates the Neon project, writes `DATABASE_URL` + `DIRECT_DATABASE_URL`, attempts the gateway key,
then `bun run db:deploy`. Google OAuth client remains a manual step (instructions issued).

## 2026-10-02 — Phases 1–2: Bun installed, CRM cloned, `.env` pre-filled

- Installed **Bun 1.4.2** globally. Note for next time: `npm install -g bun` leaves it broken —
  npm's script guard blocks bun's postinstall, which is what downloads the actual binary. The
  working command is `npm install -g --allow-scripts=bun bun`.
- Machine meets the CRM's requirements: Node v24.19.0 (needs ≥22), Bun 1.4.2 (repo pins 1.3.12,
  newer is fine).
- Cloned the CRM to `..\comp-crm` (shallow, `--depth 1`), outside this repo's git. `bun install` is
  still running in the background.
- Created `comp-crm\.env` from the example (gitignored there) and filled in everything that doesn't
  need an account: `BETTER_AUTH_SECRET`, `AGENT_BRIDGE_SECRET`, `CRON_SECRET` (freshly generated),
  `ALLOWED_SIGN_IN`, `AGENT_URL=http://127.0.0.1:2000`, and `CRM_TELEMETRY_DISABLED="1"` (the CRM
  sends a daily counts-only event otherwise — flip it back if you'd rather support the project).
  A TODO block at the top of that file names the three values that still need accounts.

**Open questions from the plan, now resolved by reading the CRM's code:**

- `db:deploy` **and** `db:migrate` both exist (plus `db:push`, `db:reset`, `db:seed`, `db:studio`,
  `db:test`) — neither doc was stale. `db:reset` is the path for wiping seed data later.
- Both sync routes exist: `POST /internal/sync/mailboxes` and `POST /internal/sync/google`
  (`apps/api/src/sync/sync.controller.ts`), both behind `Authorization: Bearer <CRON_SECRET>`.
- **The tracking collector is real, confirmed in code, not just docs:**
  `apps/api/src/tracking/tracking.controller.ts` has `@Controller("api/t")` with `@Post("e")`
  (anonymous, always 204) and `GET /api/t/config/:siteId`. This settles the contradiction between
  the CRM's `docs/api.md` ("no external form endpoint") and `docs/tracking.md` — tracking.md was
  right, api.md is scoped to the authenticated tRPC surface.
- Phase 4's snippet is generated for us by the CRM's own settings page
  (`apps/app/.../settings/tracking/tracking-script.tsx`):
  `<script src="<scriptUrl>" data-site="<siteId>" async defer></script>`, documented as belonging in
  the head. There's also a built-in installation verifier, a pause switch, and a site-id rotation
  kill switch.

- `bun install` finished (1166 packages, exit 0). Its `prepare` script pointed that clone's git hooks
  at `.githooks`, scoped to `comp-crm` only.
- Built a Graft graph for the CRM clone too: 4667 nodes / 12507 edges across 846 files. Graft added
  `/graft/` to `comp-crm`'s own `.gitignore` automatically — the one tracked file it modified there.

Files: `comp-crm\.env` (new, outside this repo), `comp-crm\graft\` (gitignored), `plan.md`,
`updates.md`.

Next: blocked on the three account-dependent values (Neon `DATABASE_URL`, Google OAuth client,
`AI_GATEWAY_API_KEY`). Once those are in `comp-crm\.env`: `bun run db:deploy`, then `bun run dev`,
then Phase 3.

## 2026-10-02 — Phase 0: control documents and working rules

- Created `plan.md` — the phased end-to-end plan for standing up Comp AI CRM and wiring this site's
  contact form into it.
- Created `updates.md` (this file).
- Added working rules to `CLAUDE.md`: read `plan.md` + `updates.md` before any work on this
  initiative, log every change here, and use Graft when it's available.
- Researched the CRM's own docs to build the plan. The significant finding: `docs/tracking.md`
  documents a native website-tracking/form-capture feature (script tag → `/api/t/e` collector →
  Contact + agent task), so no custom integration code is needed. This corrected an earlier
  conclusion that the CRM had no external form-capture path.
- Checked the machine's prerequisites: `graft`, `node`, `npm`, `git` present; `bun`, `docker` and
  `openssl` missing. The plan routes around Docker (hosted Postgres) and openssl (Node crypto);
  Bun still has to be installed in Phase 1.

- Built the Graft graph with `graft build`: 405 nodes / 802 edges across 103 source files, written to
  the gitignored `graft/`. Chose this over `graft init` on purpose — `init` wires an MCP server and
  four hooks (SessionStart / UserPromptSubmit / PostToolUse / Stop) into `~/.claude/settings.json`,
  which would then run in every repo on this machine. The CLAUDE.md rule plus the CLI gives the same
  benefit with no machine-wide footprint; `init` is still available later.

Files: `plan.md`, `updates.md`, `CLAUDE.md`, `graft/` (gitignored).

Verified: files exist at the repo root; `CLAUDE.md` carries the new rules;
`graft ask "contact form submission flow and where the root layout injects scripts"` returned
`submitContact` at `src/app/contact/actions.ts:91` and `RootLayout` at `src/app/layout.tsx:113`.
Nothing in the site's runtime behaviour was touched.

Next: Phase 1 — install Bun, create the Neon database, mint secrets, set up the Google OAuth client.
