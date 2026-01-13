# Phase 6 Complete: HUD Readability

Phase 6 improves HUD readability by adding a clear, state-aware instruction callout, enhancing contrast (including `prefers-contrast: more` support), and adding test coverage for the new behavior.

**Files created/changed:**

- src/components/ui/HUD.tsx
- src/components/ui/HUD.css
- tests/HUD.test.tsx
- tests/setup.ts

**Functions created/changed:**

- HUD (instruction callout + a11y toggle attributes)

**Tests created/changed:**

- HUD - callout text (default and decoration placement)
- HUD - collapse/expand toggles aria-expanded and content visibility

**Review Status:** APPROVED

**Git Commit Message:**
feat: improve hud readability

- Add clear instruction callout and prefers-contrast styling
- Improve HUD a11y toggle semantics
- Add deterministic HUD tests
