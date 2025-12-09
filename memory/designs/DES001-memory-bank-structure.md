# DES001 - Memory Bank: core files and guidelines

**Status:** Completed  
**Added:** 2025-12-09  
**Updated:** 2025-12-09

## Goal

Provide a minimal, reproducible memory bank for the repository that documents project intent, technical patterns, active work, progress and testable requirements. The memory bank serves as the canonical source for onboarding, planning, and handoffs.

## Design decisions

- Keep a small, clear set of core files at `memory/`: `projectbrief.md`, `productContext.md`, `activeContext.md`, `systemPatterns.md`, `techContext.md`, `progress.md`, and `requirements.md`.
- Tasks and designs live in `memory/tasks/` and `memory/designs/` respectively. Each must use the `TASKNNN-` or `DESNNN-` numbering scheme with zero-padded ascending integers.
- Index files (`_index.md`) in `memory/tasks` and `memory/designs` are the primary navigational surface for discovering active work and history.
- When creating new task/design IDs, check both active and `COMPLETED` folders to avoid collisions.

## Acceptance

- The memory bank contains all core files and an initial task and design entry (this PR).
- Index files list the entries and statuses.

## Notes

- This design is intentionally minimal to be easy to maintain.
- Larger design documents or migration plans should be created as additional DESNNN files and cross-linked from the index.
