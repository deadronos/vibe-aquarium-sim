# Test typechecking

The application typecheck intentionally covers `src/` through
`npm run typecheck`. Most existing Vitest and Playwright files are transformed
by their runners rather than compiled as one TypeScript project, so a broad
test-only `tsconfig` currently reports unrelated legacy typing errors.

Issue-specific evidence suites should still have a compile gate. The Issue
#141 trajectory suite uses `tsconfig.issue141.json`, which includes the focused
test and its support harness plus the shared declarations they rely on:

```bash
npm run typecheck:issue141
```

CI runs this focused gate alongside the application typecheck. Expand the
scoped config when adding new strongly typed evidence suites; do not weaken the
application `strict` settings to make test fixtures compile.
