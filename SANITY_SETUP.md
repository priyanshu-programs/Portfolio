# Content CMS (Sanity) — Setup & Usage

Your site's text and images are editable from **Sanity Studio** (a hosted admin
panel). Until you complete the steps below, the site simply shows its original
built-in content — nothing breaks. Once configured, every field you fill in the
Studio overrides the matching built-in value.

The contact form is **not** part of this — that's a later phase (Supabase).

---

## One-time setup

The project is already created (**Project ID `i0fv16h3`**) and wired into
`.env.local`. Two things remain: a write token (so content can be seeded /
managed programmatically), and CORS.

### 1. Create a write token
https://www.sanity.io/manage → project `i0fv16h3` → **API → Tokens → Add API token**
- Name: e.g. `content-seed`
- Permissions: **Editor** (read + write; not Administrator)

Paste it into `.env.local` (this file is git-ignored — **never** put the token
in chat, a commit, or the deployed frontend):
```
SANITY_API_TOKEN=sk...your_token...
```
`.env.local` should now have:
```
NEXT_PUBLIC_SANITY_PROJECT_ID=i0fv16h3
NEXT_PUBLIC_SANITY_DATASET=production
NEXT_PUBLIC_SANITY_API_VERSION=2025-01-01
SANITY_REVALIDATE_SECRET=any-long-random-string
SANITY_API_TOKEN=sk...            # Editor token — secret
```

### 2. Seed the current site content into Sanity
```bash
npm run sanity:seed
```
This uploads the real images and fills every section with the site's current
text — one-time, idempotent (safe to re-run). After this, the live site reads
its content from Sanity instead of the built-in fallbacks.

### 3. Allow the site to read from Sanity (CORS)
In https://www.sanity.io/manage → project `i0fv16h3` → **API → CORS origins**,
add your site URLs (e.g. `http://localhost:3000` and your production domain).
No credentials needed — read access to content is public.

> **Handing management to Claude:** once `SANITY_API_TOKEN` is in `.env.local`,
> just describe the content change you want ("swap the hero portrait", "reword
> the services cards") and it can be applied by scripting against the same
> token — no manual Studio editing required.

---

## Deploying

`.env.local` is git-ignored, so **nothing in this repo carries your Sanity
credentials to the host.** They have to be entered in the hosting dashboard by
hand. On Vercel: **Settings → Environment Variables**, each one ticked for
**Production** (and Preview, if you want branch deploys to render content):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | `i0fv16h3` |
| `NEXT_PUBLIC_SANITY_DATASET` | `production` |
| `NEXT_PUBLIC_SANITY_API_VERSION` | `2025-01-01` |
| `SANITY_REVALIDATE_SECRET` | same value as in `.env.local` |

`SANITY_API_TOKEN` is **not** needed on the host — it's only used by the
`scripts/sanity/*` tooling, which runs locally.

> ### ⚠ Env vars are baked in at build time — changing one needs a redeploy
>
> `NEXT_PUBLIC_*` values are inlined into the bundle by `next build`, and
> `/work` is prerendered to static HTML during that build. Adding a variable in
> the dashboard afterwards does **not** change the deployment already serving —
> the empty page is frozen in. Always follow an env var change with
> **Deployments → ⋯ → Redeploy**, with *"Use existing Build Cache"* unchecked.
>
> **Symptom of getting this wrong:** `/work` shows its headline and filter pills
> but lists no projects, every `/work/<slug>` case study 404s (nothing was
> prerendered because `getWorkSlugs()` returned an empty array), and CMS images
> are missing site-wide. Meanwhile `/` and `/about` look completely normal,
> because those pages fall back to hardcoded content and `/work` deliberately
> does not.
>
> A build missing `NEXT_PUBLIC_SANITY_PROJECT_ID` now **fails loudly** rather
> than shipping that empty page (see `src/lib/sanity/client.ts`). If a fetch
> fails for some other reason the build still succeeds, so also check the build
> log for lines starting `[sanity]`.

**CORS is not involved in any of this.** All content reads happen server-side
(`import "server-only"`), so the browser never calls Sanity and the CORS origins
list has no bearing on whether the deployed site renders content. Likewise, the
hosted Studio is a separate deployment — it working tells you nothing about
whether the site can read the dataset.

---

## Editing content

### Run the Studio locally
```bash
npm run sanity        # opens the admin at http://localhost:3333
```

### Or deploy a hosted Studio (recommended — always available)
```bash
npm run sanity:deploy
```
The hosted Studio lives at **https://priyanshuroy-portfolio.sanity.studio**
(`studioHost` in `sanity.cli.ts`). That subdomain redirects to the app host,
`https://www.sanity.io/@oXUiTN90f/studio/<appId>` — the same deployment under
two URLs, so **one `deploy` updates both**.

> ### ⚠ Schema changes require a redeploy
>
> Editing anything in `sanity/schemas/` or `sanity/structure.ts` only affects
> the **local** Studio (`npm run sanity`). The hosted Studio serves the bundle
> from its last deploy and will keep doing so indefinitely — the schema is
> baked in at build time, not read from the project at runtime.
>
> **Symptom:** fields you added are missing in the hosted Studio, new document
> types don't appear in the sidebar, and open documents show a yellow
> **"Unknown fields found — Encountered N fields that are not defined in the
> schema"** panel.
>
> **Do NOT click "Remove field"** in that panel. Those fields aren't junk —
> the values are real and sitting in your dataset; the stale Studio just has no
> field definition to render them with. Clicking it permanently deletes the
> value from the document.
>
> **Fix:** run `npm run sanity:deploy`, then hard-reload the hosted Studio (the
> bundle is cached, so a normal reload can serve the old one). Use
> `npx sanity deploy --dry-run` first if you want to confirm the build succeeds
> without publishing anything.

The Studio's left sidebar has one entry per section (Site Settings, Hero,
About / Work, About Page, Services, CTA / Collage, Floating Menu) plus **Tags** and
**Work Projects** (add/reorder as many as you like). Fill in a field to
override the default; leave it empty to keep the built-in value. Click
**Publish** to go live.

---

## Making edits appear on the live site

Published edits refresh automatically within ~60s. For **instant** updates, set
up a webhook:

1. https://www.sanity.io/manage → your project → **API → Webhooks → Create**.
2. URL: `https://YOUR-DOMAIN/api/revalidate` — no query string.
3. HTTP method **POST**. Trigger on: Create / Update / Delete. Dataset: `production`.
4. Under **HTTP Headers**, add:
   `x-sanity-webhook-secret` = the `SANITY_REVALIDATE_SECRET` value from `.env.local`.

The secret travels in a header, not in the URL, and the route is POST-only. URLs
are recorded in access logs, proxy logs and browser history, and leak through
the `Referer` header; a `GET` that mutates cache state is also triggerable by any
`<img>` tag on any page a signed-in browser loads. Please don't "simplify" this
back to `?secret=` — the route only reads the header, so that silently 401s.

`SANITY_REVALIDATE_SECRET` **must be non-empty** — if it is blank the route
returns `500 "Revalidation secret not configured."` and the webhook can never
invalidate anything, so the site keeps serving whatever was cached at build
time. On a host like Vercel, set the same value in the project's environment
variables, not just in local `.env.local`.

The webhook needs a **publicly reachable URL**; it cannot POST to `localhost`.
Until the site is deployed, rely on local dev behaviour (below) or expose the
dev server through a tunnel (e.g. `ngrok http 3000`) and point the webhook at
the tunnel URL.

**Verifying it works:** run the endpoint check, which exercises the same request
Sanity will send plus the rejection cases:

```bash
npm run sanity:check-webhook                      # defaults to localhost:3000
npm run sanity:check-webhook https://YOUR-DOMAIN  # or a deployed/tunnel URL
```

It asserts `200` for a correctly-signed POST and `401`/`405` for the ways a
request should be refused. To check by hand instead:

```bash
curl -i -X POST -H "x-sanity-webhook-secret: YOUR_SECRET" \
  https://YOUR-DOMAIN/api/revalidate
# -> 200 {"revalidated":true,"tag":"site-content",...}
```

Opening the URL in a browser returns **405 Method Not Allowed**. That is correct
behaviour, not a fault — there is deliberately no `GET` handler. After a publish,
the webhook's delivery log in sanity.io/manage should show `200` with the body
above; a `401` there means the header name or value doesn't match.

### Locally (`npm run dev`)

The Sanity CDN is bypassed in development and Next's HMR fetch cache is
disabled, so a published edit shows up on the next page reload (worst case one
more, from the 60s fetch window). If content still looks stale, delete `.next/`
and restart — a stale build cache from an earlier `npm run build` is served
even in dev. `logging.fetches` is on, so the dev console prints a cache
HIT/MISS line for each Sanity request, which tells you immediately whether the
data is being re-fetched or served from cache.

> **Drafts don't render.** The client queries with `perspective: "published"`,
> so a document left unpublished in the Studio shows its last published state
> (or the hardcoded fallback). Hit **Publish** to see a change.

---

## What's editable

| Section (Studio)   | Controls |
|--------------------|----------|
| Site Settings      | Name, contact email, timezone, social links, SEO title/description |
| Hero               | Pill label, heading, paragraph, marquee text, loader text, portrait image |
| About / Work       | Main quote, sub-paragraph, "recent work" rows (name, tag, image) — the *homepage* section |
| About Page         | The `/about` route: title, up to 2 paragraphs, 3 photo slots (image + alt text + blurb), social links, contact email, SEO |
| Services           | Optional heading override, ornament image, landscape image, 3 cards (title, copy, icon) |
| CTA / Collage      | Headline, reveal headline, link text, 6 collage images, both hand images, contact image |
| Floating Menu      | Tag list, left-column image |
| Tags               | Title (slug auto-generated), order — powers the `/work` filter pills |
| Work Projects      | The `/work` archive list (id, title, category, year, order, thumbnail, tags — reference existing Tags or create new ones inline) |

> **About Page slots:** each slot is one photo *plus* the blurb printed beside
> it, edited together so the two can't drift apart. The layout fixes where each
> one sits (slot 1 right with its blurb left, slot 2 left with its blurb right,
> slot 3 like slot 1) — only the content is editable. A slot with no image is
> skipped entirely.
>
> **Accent phrases** (About Page paragraphs and blurbs) render the matching
> words in italic script. They are matched *literally* against the text, so
> they must reproduce it exactly — same wording, same capitalisation. A phrase
> that doesn't appear verbatim is silently ignored.
>
> Notes: the Services card **count is fixed at 3** and the Hero/About text
> animations expect line breaks written as separate lines in the field. Multi-line
> fields split on newlines to match the original layout.
>
> **Tags:** create Tag documents first (or inline while editing a Work
> Project), then assign them to each project's `Tags` field. The `/work`
> page's filter pills are generated from whatever Tags exist — until you
> create some, only "All" will show.
