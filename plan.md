# Comp AI CRM × priyanshuroy.com — setup plan

> # ⛔ ABANDONED 2026-10-05 — superseded by `../dossier`
>
> **Do not continue this plan.** Phases 0–2 completed and the install runs, but the agent is
> permanently blocked: Vercel's AI Gateway returns `403 customer_verification_required` and serves no
> model call until a credit card is on file. Every model call in that codebase routes through the
> gateway, so there is no workaround.
>
> The replacement is **Dossier** — the same core loop, built from scratch on infrastructure that
> needs no payment method. **Its plan and log live in its own repo: `../dossier/plan.md` and
> `../dossier/updates.md`.** Read those, not this file, for anything CRM-related.
>
> `../comp-crm` stays on disk as a behavioural reference. Everything below is kept because the
> account setup it describes (Neon, the Google OAuth client) is still in use by Dossier — and
> because the reason it was abandoned is worth not rediscovering.

**Status:** Phases 0–2 complete (2026-10-04), Phase 3 reached and halted. The CRM runs locally
against Neon: app `:3000`, API `:3001`, agent `:2000`, all 56 migrations applied. Sign-in,
onboarding and Gmail/Calendar scopes all went through. The agent cannot run. Nothing in the
portfolio's runtime behaviour was ever changed.

**Two standing facts about running it,** both learned the hard way on 2026-10-04:

- `bun run dev` **fails** — `turbo run dev` needs a TTY for the agent task. Use two commands:
  `bunx turbo run dev --filter=app --filter=api` and `bunx turbo run dev:headless --filter=agent`.
- Every `dev` run needs `ALLOW_REMOTE_DB=1`, because `require-local-db.ts` refuses non-local hosts
  and this install uses Neon rather than Docker. Kept out of `.env` on purpose so the guard still
  protects `db:reset` and friends.

**What this is:** standing up [trycompai/crm](https://github.com/trycompai/crm) (an open-source,
agent-driven CRM) and wiring this portfolio's contact form into it, so enquiries become tracked,
researched contacts instead of one-off emails.

**How the integration actually works:** the CRM has a native website-tracking feature
(`docs/tracking.md` in its repo). You paste a `<script>` tag carrying a site id onto this site; form
submissions POST to the CRM's collector at `/api/t/e`, which turns them into Contacts and queues the
agent to research them. No custom bridge code is needed.

**Decisions made:** run locally first; the CRM lives in a sibling folder `..\comp-crm` with its own
git repo; this file and `updates.md` are the control centre and live here.

---

## Machine prerequisites (checked 2026-10-02)

| Tool | Status |
|---|---|
| `graft` | installed globally |
| `node` / `npm` / `git` | installed |
| `bun` | **missing** — required by the CRM |
| `docker` | **missing** — avoided by using hosted Postgres (Neon) instead |
| `openssl` | **missing** — use Node's crypto to mint secrets |

Shell is Windows PowerShell 5.1: no `&&`, no `cp`. All commands below are written for it.

---

## Phase 0 — Control documents and agent wiring (this repo) ✅

- [x] `plan.md` (this file)
- [x] `updates.md` — the change log
- [x] `CLAUDE.md` rules: read these two files before any work; log every change; use Graft when available
- [x] Graft graph built with `graft build` — 405 nodes / 802 edges over 103 files, written to the
      gitignored `graft/`. Deliberately **not** `graft init`: that wires MCP + four hooks into
      `~/.claude/settings.json`, which would run in every repo on this machine. The CLAUDE.md rule
      plus the CLI (`graft ask`, `graft grep`, `graft map`) covers the same need with no
      machine-wide footprint. Upgrade to full `init` later if the CLI proves clumsy.
- [x] Verified: `graft ask "contact form submission flow…"` returned `submitContact`
      (`src/app/contact/actions.ts:91`) and `RootLayout` (`src/app/layout.tsx:113`) with line ranges.

Re-run `graft build` after any sizeable code change to keep the graph fresh (`graft check` fails if
it's stale).

## Phase 1 — Prerequisites and accounts ✅

- [x] Bun installed (1.4.2)
- [x] Neon project `portfolio-crm` (`steep-snow-81337543`), Singapore, Postgres 18.6, branch
      `production`, database `neondb`. `DATABASE_URL` pooled + `DIRECT_DATABASE_URL` unpooled.
      Docker was never needed.
- [x] `BETTER_AUTH_SECRET`, `AGENT_BRIDGE_SECRET`, `CRON_SECRET` minted
- [x] Google Cloud OAuth client, project `portfolio-crm-510617`:
      - [x] Gmail API + Google Calendar API enabled
      - [x] Consent screen **External + Testing**, sole test user
            `priyanshuroy.official19@gmail.com`
      - [x] Web client, redirect URI `http://localhost:3001/api/auth/callback/google`, confirmed
            against `packages/auth/README.md:74` rather than assumed
      - [ ] Still unconfirmed: whether Google's 7-day Testing-status refresh expiry actually bites.
            Watch for it in Phase 3.
- [x] `AI_GATEWAY_API_KEY` created on the hobby plan and **verified live** — the agent's
      `/eve/v1/info` reports `endpoint.connected: true`. Default model `zai/glm-5.2-fast`.
- [ ] Optional, skippable: `PERPLEXITY_API_KEY`, `GITHUB_TOKEN`, `BLOB_READ_WRITE_TOKEN`

**`ALLOWED_SIGN_IN` is `priyanshuroy.official19@gmail.com`, not the academics address.** The contact
form delivers to official19 (`.env.local`'s `CONTACT_TO_EMAIL`); academics is only
`FALLBACK_TO_EMAIL` in `src/app/contact/actions.ts:35`. The CRM has to read the inbox the enquiries
actually land in.

## Phase 2 — Clone and boot the CRM locally

```powershell
cd "D:\23-09-26 backup Priyanshu\1abc- Proj"
git clone https://github.com/trycompai/crm.git comp-crm
cd comp-crm
Copy-Item .env.example .env
bun install
```

- [x] Fill `.env`: `DATABASE_URL` (Neon), `BETTER_AUTH_SECRET`,
      `ALLOWED_SIGN_IN="priyanshuroy.official19@gmail.com"` (unset means **nobody** can sign in —
      that's the whole auth model), `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `AI_GATEWAY_API_KEY`,
      `AGENT_URL="http://127.0.0.1:2000"` (the docs insist on `127.0.0.1`, not `localhost`),
      `AGENT_BRIDGE_SECRET`, `CRON_SECRET`
- [x] `CRM_TELEMETRY_DISABLED="1"` — confirmed in the API's boot log: *"Anonymous usage telemetry is
      off for this install."*
- [x] Migrated with `bun run db:deploy` — 56 migrations, 61 tables. `db:deploy` is the live script;
      `db:migrate` also exists but is the interactive one.
- [ ] Optional demo data: `bun run db:seed` (find the reset path before trusting real data)
- [x] Boot — **not** `bun run dev`, which fails without a TTY. Two commands, each with
      `ALLOW_REMOTE_DB=1`: `bunx turbo run dev --filter=app --filter=api` and
      `bunx turbo run dev:headless --filter=agent`.
- [ ] `graft init` inside `comp-crm`

**Port conflict:** the CRM app and this portfolio both want `:3000`. When both run, start the
portfolio with `next dev -p 3005`.

**Verify:** `localhost:3000` loads and Google sign-in works; `localhost:3001` responds;
`GET /eve/v1/info` on the agent returns diagnostics.

## Phase 3 — Connect the inbox, watch the agent work

- [ ] Settings → Connections → connect Google (Gmail + Calendar read)
- [ ] Settings → choose the model the agent runs on
- [ ] Trigger a sync rather than waiting: `POST /internal/sync/google` with
      `Authorization: Bearer <CRON_SECRET>` (the README also mentions
      `/internal/sync/mailboxes` — confirm which exists in this version)
- [ ] Review the agent's reasoning tab: what it checked, recorded, and discarded

This is the decision point — judge whether the thing is useful **before** touching the portfolio.

**Verify:** real people from the inbox appear as Contacts with sourced facts. If the agent tab says
"not configured", `AGENT_BRIDGE_SECRET` doesn't match across both processes.

## Phase 4 — Wire this site's contact form into the CRM

- [ ] Register the site in the CRM → get its **site id**; set the host allow list to include
      `localhost` and `priyanshuroy.com`
- [ ] Add the loader tag to `src/app/layout.tsx`. **Placement constraint:** it must come *after* the
      raw `ARM_SCRIPT` `<script>`, which that file documents as required to be the first child of
      `<body>` — breaking that brings back the homepage flash
- [ ] Local end-to-end test: CRM on `:3000`/`:3001`, portfolio on `next dev -p 3005`, submit the
      contact form, confirm `POST /api/t/e` → **204** in DevTools, and a Contact + `AgentTask` in the CRM
- [ ] **Known risk:** the contact form submits via a React Server Action (`useActionState` →
      `submitContact` in `src/app/contact/actions.ts`), not a classic navigation. The tracker hooks
      browser form submits, which *should* fire — verify in a real browser. If it doesn't capture,
      the fallback is a small server-side write from the action, scoped separately.
- [ ] Add a note in `next.config.ts` beside the existing ARM_SCRIPT/CSP warning: a future CSP pass
      must allow the CRM's script origin and the collector endpoint

No action needed, but worth knowing: the tracker drops every `hidden`, `password` and `file` input,
so the honeypot (`website`) and timing (`t`) fields never reach the CRM — the anti-bot setup in
`actions.ts` stays intact. It also stores no IP and no query strings.

**Verify:** a local form submission produces a Contact in the local CRM within seconds, and the
agent picks it up.

## Phase 5 — Deploy (checkpoint: confirm before starting)

This is the first step that puts anything on the public internet.

- [ ] Three Vercel projects from `comp-crm` (app, API, agent) + the same Neon database
- [ ] Shared `DATABASE_URL` + `BETTER_AUTH_SECRET`; set `API_URL`, `APP_URL`, `AGENT_URL`,
      `AUTH_COOKIE_DOMAIN` (only if app and API sit on sibling subdomains), and
      `DIRECT_DATABASE_URL` if `DATABASE_URL` is Neon's pooled string
- [ ] Add the production redirect URI to the Google OAuth client
- [ ] Schedule crons with `CRON_SECRET`: `POST /internal/sync/google`,
      `POST /internal/tracking/retention` (nightly 90-day page-view sweep)
- [ ] Point this site's tracking tag at the deployed API origin and ship

**Verify:** sign-in works on the deployed app; a real submission on priyanshuroy.com becomes a
Contact; cron runs appear in Vercel's logs.

## Phase 6 — Optional upgrades

- [ ] Perplexity / GitHub / Vercel Blob keys for richer research
- [ ] **Redis** — the CRM's docs recommend it once website tracking is live, because the hourly cap
      on contacts-created-from-forms and the per-minute event rate limit are counted per instance
      without it
- [ ] Slack linking

---

## Open questions, to resolve by reading code rather than guessing

- `db:deploy` vs `db:migrate` — read `comp-crm/package.json`
- `/internal/sync/google` vs `/internal/sync/mailboxes` — read the API routes
- Whether the tracker captures a React Server Action form submit (Phase 4)
- Whether Google's 7-day Testing-status refresh expiry actually bites (Phase 3)
- `docs/api.md` says there's no external form endpoint while `docs/tracking.md` documents the
  collector in detail. `tracking.md` is far more specific, so it's the one being trusted; if the code
  disagrees, re-check `tracking.md` first.
