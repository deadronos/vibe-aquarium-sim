# Development Workflow

## 🧠 Memory Bank

The project uses a memory bank in the `memory/` folder to track design decisions and task progress.

- Consult `.github/instructions/memory-bank.instructions.md` for conventions.
- Start with `memory/activeContext.md` and `memory/progress.md`. Records in `memory/*/COMPLETED/`
  are history from the pre-rebuild v0.1 codebase.
- New specs and plans go in `docs/superpowers/` or `plans/` as the tools expect; the v0.1 ones
  live in `docs/archive/v0.1/`.

## 🛠️ Spec-Driven Workflow

We follow an **Analyze → Design → Implement → Validate → Reflect → Handoff** cycle.

- Consult `.github/instructions/spec-driven-workflow-v1.instructions.md` for details.

## 🧪 Testing & Linting

### Linting & Formatting

Always run linting before submitting changes.

```bash
npm run format      # Fix formatting with Prettier
npm run lint -- --max-warnings=0  # Run ESLint (extra -- is required to pass flags)
```

### Type Checking

```bash
npm run typecheck   # App + test typecheck
```

### Tests

```bash
npm run test        # Run unit tests with Vitest
npm run build && npm run test:smoke   # Boot the production build in Chromium
```

Unit tests cover `src/sim/` (pure TypeScript). For visual changes, run `npm run dev` and
check every viewpoint at a day hour and a night hour (drag the time slider).

## 🚢 Releases

1. Merge to `main` with CI green.
2. Tag the tip of `main` and push the tag: `git tag -a v0.2.1 -m "…" && git push origin v0.2.1`.
3. `deploy-pages.yml` checks that the tag is on `main`, runs `tests/e2e/smoke.spec.ts` against the
   build under Xvfb + software Vulkan, then deploys to GitHub Pages. If you rename or split the
   smoke test, check that workflow's command still selects it.
