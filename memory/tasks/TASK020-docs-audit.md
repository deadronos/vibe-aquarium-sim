# [TASK020] - Audit docs and agent guidance after the rebuild

**Status:** Completed (2026-10-23)
**Added:** 2026-10-23
**Updated:** 2026-10-23

## Original request

After the v0.2.0 rebuild, review README, docs, specs and agent guidance (AGENTS.md and friends),
highlight what is outdated, and update it for the new sim.

## Implementation

- Rewrote the memory bank core files (brief, product, patterns, tech, requirements, progress,
  active context) for the new architecture; added DES017 and TASK019.
- Moved superseded designs/tasks into the `COMPLETED/` archives and marked them superseded.
- Moved v0.1-era docs, plans, specs, reviews and screenshots to `docs/archive/v0.1/` with an
  index; deleted stray debug artifacts.
- Updated README (deploy, contributing), AGENTS.md, `docs/agents/*` and
  `.github/copilot-instructions.md`; added `docs/README.md`.
- Found the broken Pages boot check (fixed separately in PR #168).

## Validation

- `npm run format:check`; link check over the living docs.
