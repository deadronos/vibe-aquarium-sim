# Active Context

## Current focus

- Branch: `claude/docs-audit`: bring README, AGENTS.md, agent docs, Copilot instructions and
  the memory bank in line with the v0.2.0 living-room rebuild (TASK020).
- The Pages deploy for `v0.2.0` failed because the boot check grepped the old smoke-test title;
  the fix is PR #168. After it merges, a new tag (for example `v0.2.1`) redeploys.

## Recent changes

- v0.2.0 rebuild merged (PR #167). See DES017 for the architecture and TASK019 for the work log.
- Superseded v0.1 designs (DES002–DES016) and tasks (TASK001–TASK018) moved to `COMPLETED/`.
- v0.1-era docs, plans, specs, reviews and screenshots moved to `docs/archive/v0.1/`.

## Next ideas

- Blender-baked room (lightmaps) replacing the procedural furniture.
- A cat that wanders up to the glass; fish react.
- Tap-the-glass startle; more species; per-fish inspection.

## Active decisions / considerations

- Keep simulation pure TypeScript and unit-tested; keep the scene a thin reader.
- No downloaded textures or room models unless a baked-room pipeline is adopted deliberately.
- Zero allocation in frame loops; instancing and shader-driven motion for anything repeated.
