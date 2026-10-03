# Updates log

Newest first. One entry per unit of work. See `plan.md` for the phased plan.

Entry format: what changed · files touched · how it was verified · what's next.

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
