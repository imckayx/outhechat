# Group Trip Planner — POC Documentation

This repo contains specs for a lightweight, link-based group trip planner. Designed to be picked up by an AI coding agent (Claude Code, Cursor) and built end-to-end.

## Documents

- **[PRD.md](./PRD.md)** — Product requirements: what we're building, for whom, and why. Includes user flows, in-scope / out-of-scope features, and the future LLM layer.
- **[TECH_SPEC.md](./TECH_SPEC.md)** — Technical specification: stack, data model, API routes, algorithms, validation rules, and constraints.
- **[BUILD_PLAN.md](./BUILD_PLAN.md)** — Sequenced milestones with acceptance criteria. Each milestone is independently shippable. Build in order.

## How to use these with an AI coding agent

1. Start with `BUILD_PLAN.md` and tackle one milestone at a time.
2. Reference `TECH_SPEC.md` for the exact data model, routes, and types.
3. Reference `PRD.md` when making UX or scope decisions.
4. Do NOT build features listed under "Out of scope" in either doc. They are explicitly deferred to v2.

## Core decisions already made (do not relitigate)

- **No auth.** Link-based access via opaque tokens.
- **Web app first, not native.** iMessage embedding is a v2 enhancement; rich link previews fill the gap.
- **Members mark unavailability, not availability.** Default is free; mark conflicts only.
- **Binary availability only for v1.** No "maybe" state, no preference weighting.
- **Top-N windows surfaced, not a single winner.** Group makes the final call.
