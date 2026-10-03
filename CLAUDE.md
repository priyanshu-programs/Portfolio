@AGENTS.md

# Working rules

## Read `plan.md` and `updates.md` before working

`plan.md` is the phased plan for the Comp AI CRM initiative; `updates.md` is the log of what has
actually been done. Read both before starting work on it — don't work from memory of either, and
don't assume a phase is incomplete because an earlier session left it that way.

After any change, append an entry to `updates.md`: what changed, files touched, how it was verified,
what's next. Newest first. When the plan itself changes, edit `plan.md` rather than letting it drift
out of date.

## Use Graft when it's available

[Graft](https://github.com/trailhq/Graft) (`graft`, installed globally) keeps a navigable graph of a
repo so an agent doesn't re-explore it from scratch. Prefer it over cold searching:

- `graft ask "<task>"` to orient before touching an unfamiliar area
- `graft grep "<regex>"` in place of a blind search
- `graft map` for structure

If its MCP tools or `.claude/skills/graft/SKILL.md` are present, use those instead of the CLI. If the
graph is missing or stale, run `graft init` (or `graft build --deep` for LLM-written summaries). This
applies to this repo and to the `comp-crm` clone alongside it.
