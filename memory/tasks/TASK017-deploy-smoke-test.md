# [TASK017] - Add deployment smoke test for console errors

**Status:** Pending  
**Added:** 2026-01-14

## Original request

Add an automated smoke test that validates a deployed build by loading the production URL and checking for any console errors or unhandled exceptions (catch regressions like the `zustand` / `three` chunk initialization bug).

## Motivation

A small runtime dependency-evaluation ordering issue on GitHub Pages caused a `ReferenceError` and later a `TypeError` to appear only on the deployed site. A lightweight deployment smoke test will catch such issues automatically and prevent regressions.

## Acceptance criteria

- A Playwright / Playwright Test (or equivalent) script that:
  - Loads a provided deployed URL (configurable via env or test config).
  - Waits until the app stabilizes (e.g., simulation autostarts or initial UI loads).
  - Asserts that no console error-level messages were logged during that loading period.
- A GitHub Action that runs the smoke test against the deployed preview URL after a successful deploy (or as a scheduled/regression check).
- The test should be fast and non-flaky (use timeouts and retries conservatively).

## Implementation plan

1. Create `tests/e2e/deploy-smoke.spec.ts` using Playwright test APIs to load the URL and record console events.
2. Add a small helper in `package.json` scripts: `test:smoke` to run the smoke test locally or in CI.
3. Create a GitHub Actions workflow (e.g., `.github/workflows/deploy-smoke.yml`) that runs after the deployment job and fails if console errors are found.
4. Document configuration (env var for deployed URL) and add the TASK to CI tracking.

## Notes

- The smoke test should be permissive about non-error console logs but should fail on `error` and `exception` levels.
- Make the deployed URL configurable so the test can target PR previews, feature environments, and the final production URL.
