# Phase 6 Mobile UX Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the first Phase 6 slice for issue #147: a focused mobile action rail, tank-center keyboard feeding, and verified Settings accessibility while preserving desktop HUD behavior.

**Architecture:** Keep `HUD` as the public entry point and share action callbacks between its existing desktop panel and a new `MobileActionRail`. Move food-spawn side effects into a renderer-independent `feedAt(point)` helper so pointer, rail, and keyboard activation use one path. Make `SettingsModal` own focus scope and background inertness, with `App` providing the invoking element for restoration.

**Tech Stack:** React 19, TypeScript, Zustand, React Testing Library/Vitest, Playwright, CSS media queries, Three.js `Vector3`, existing Miniplex ECS.

---

### Task 1: Extract the shared feeding action

**Files:**

- Create: `src/game/feedingActions.ts`
- Modify: `src/components/FeedingController.tsx`
- Test: `tests/feedingActions.test.ts`

- [ ] **Step 1: Write the failing center-feed test**

Create a focused test that clears only entities created by the test, sets the store's `lastFedTime` to `null`, calls the new action with the tank center, and checks the food entity position and store update:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Vector3 } from 'three';
import { world } from '../src/store';
import { useGameStore } from '../src/gameStore';
import { feedAt } from '../src/game/feedingActions';

describe('feedAt', () => {
  beforeEach(() => {
    world.clear();
    useGameStore.setState({ lastFedTime: null });
  });

  afterEach(() => {
    world.clear();
  });

  it('spawns reachable food at the requested tank center', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);

    feedAt(new Vector3(0, 0, 0));

    const food = world.with('isFood').entities;
    expect(food).toHaveLength(1);
    expect(food[0]?.position?.x).toBe(0);
    expect(food[0]?.position?.z).toBe(0);
    expect(useGameStore.getState().lastFedTime).toEqual(new Date(1_700_000_000_000));
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails for the missing module**

Run: `NODE_OPTIONS='--localstorage-file=/tmp/vibe-aquarium-phase6-feed.localstorage' npm run test -- --run tests/feedingActions.test.ts`

Expected: FAIL with the import/module or `feedAt` symbol missing. Fix only test setup errors before implementing.

- [ ] **Step 3: Implement the minimal shared action**

Move the existing food-side effects into `src/game/feedingActions.ts`, preserving the current bounds, excitement radius, bubble configuration, downward velocity, and store update. Keep the center immutable:

```ts
import { Vector3 } from 'three';
import { world } from '../store';
import { useGameStore } from '../gameStore';
import { SIMULATION_BOUNDS } from '../config/constants';

export const TANK_CENTER = new Vector3(0, 0, 0);

export function feedAt(point: Vector3): void {
  const fishEntities = world.with('isFish', 'position');
  for (const fish of fishEntities) {
    if (!fish.position) continue;
    if (fish.position.distanceToSquared(point) < 4) {
      fish.excitementLevel = 1;
      fish.excitementDecay = 1;
    }
  }

  const x = Math.max(-SIMULATION_BOUNDS.x, Math.min(SIMULATION_BOUNDS.x, point.x));
  const z = Math.max(-SIMULATION_BOUNDS.z, Math.min(SIMULATION_BOUNDS.z, point.z));
  world.add({
    isFood: true,
    position: new Vector3(x, point.y, z),
    velocity: new Vector3((Math.random() - 0.5) * 0.05, -0.08, (Math.random() - 0.5) * 0.05),
    bubbleConfig: createBubbleConfig(),
  });
  useGameStore.getState().setLastFedTime(new Date());
}
```

Use a module-level `createBubbleConfig` helper only for the existing eight-item event-time allocation; do not place allocations in a `useFrame` loop.

- [ ] **Step 4: Delegate pointer feeding and preserve ripples**

In `FeedingController.tsx`, retain pointer-only ripple creation and call `feedAt(point)` for the food/excitement/store side effects. The decoration branch remains unchanged:

```ts
if (isPlacingDecoration) {
  // existing decoration placement
  return;
}

const rippleId = `ripple-${Date.now()}-${Math.random()}`;
setRipples((prev) => [...prev, { id: rippleId, position: point.clone() }]);
feedAt(point);
```

- [ ] **Step 5: Run the focused test and commit**

Run: `NODE_OPTIONS='--localstorage-file=/tmp/vibe-aquarium-phase6-feed.localstorage' npm run test -- --run tests/feedingActions.test.ts`

Expected: PASS. Commit: `git add src/game/feedingActions.ts src/components/FeedingController.tsx tests/feedingActions.test.ts && git commit -m "refactor: share feeding action path"`.

### Task 2: Build the dedicated mobile action rail

**Files:**

- Create: `src/components/ui/MobileActionRail.tsx`
- Modify: `src/components/ui/HUD.css`
- Test: `tests/MobileActionRail.test.tsx`

- [ ] **Step 1: Write the failing component test**

Add a test for native controls, primary labels, and decoration pressed semantics:

```tsx
it('exposes immediate primary actions and decoration state', () => {
  const onFeed = vi.fn();
  const onToggleDecor = vi.fn();
  render(
    <MobileActionRail
      onFeed={onFeed}
      onToggleDecor={onToggleDecor}
      isPlacingDecoration={false}
      fishCount={30}
      placementHint="Click tank to feed fish"
    />
  );

  expect(screen.getByRole('navigation', { name: 'Primary aquarium actions' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Feed fish' }));
  fireEvent.click(screen.getByRole('button', { name: 'Place decoration' }));
  expect(onFeed).toHaveBeenCalledOnce();
  expect(onToggleDecor).toHaveBeenCalledOnce();
  expect(screen.getByRole('button', { name: 'Place decoration' })).toHaveAttribute(
    'aria-pressed',
    'false'
  );
});
```

- [ ] **Step 2: Run the test and verify it fails**

Run: `npm run test -- --run tests/MobileActionRail.test.tsx`

Expected: FAIL because `MobileActionRail` does not exist.

- [ ] **Step 3: Implement the minimal rail**

Render the rail with native buttons and no ECS access:

```tsx
export function MobileActionRail({
  onFeed,
  onToggleDecor,
  onOpenSettings,
  isPlacingDecoration,
  fishCount,
  placementHint,
}: MobileActionRailProps) {
  return (
    <nav className="mobile-action-rail" aria-label="Primary aquarium actions">
      <button
        type="button"
        className="mobile-action-button"
        onClick={onFeed}
        aria-label="Feed fish"
      >
        <span aria-hidden="true">◉</span>
        <span>Feed</span>
      </button>
      <button
        type="button"
        className="mobile-action-button"
        onClick={onToggleDecor}
        aria-pressed={isPlacingDecoration}
        aria-label="Place decoration"
      >
        <span aria-hidden="true">✦</span>
        <span>Decor</span>
      </button>
      {onOpenSettings && (
        <button
          type="button"
          className="mobile-action-button"
          onClick={onOpenSettings}
          aria-label="Open settings"
        >
          <span aria-hidden="true">⚙</span>
          <span>Settings</span>
        </button>
      )}
      <div className="mobile-action-status" role="status" aria-live="polite">
        <span>{fishCount} fish</span>
        <span aria-hidden="true">·</span>
        <span>{placementHint}</span>
      </div>
    </nav>
  );
}
```

- [ ] **Step 4: Add mobile-only visual treatment**

Add hidden-by-default styles and a `max-width: 520px` media query in `HUD.css`. The rail must be fixed to the right edge, use `env(safe-area-inset-right/bottom)`, and give each button at least `44px` in both dimensions. Keep the desktop panel styles untouched.

- [ ] **Step 5: Run the test and commit**

Run: `npm run test -- --run tests/MobileActionRail.test.tsx`

Expected: PASS. Commit: `git add src/components/ui/MobileActionRail.tsx src/components/ui/HUD.css tests/MobileActionRail.test.tsx && git commit -m "feat: add mobile aquarium action rail"`.

### Task 3: Wire HUD actions and keyboard feeding

**Files:**

- Modify: `src/components/ui/HUD.tsx`
- Modify: `src/App.tsx`
- Modify: `tests/HUD.test.tsx`

- [ ] **Step 1: Add failing HUD interaction tests**

Extend `tests/HUD.test.tsx` with a center-feed and `F` test. Spy on `feedAt` and ensure text inputs are ignored:

```tsx
it('feeds at tank center from the rail and F shortcut, but not while typing', () => {
  const feedSpy = vi.spyOn(feedingActions, 'feedAt').mockImplementation(() => {});
  render(<HUD onOpenSettings={vi.fn()} />);

  fireEvent.click(screen.getByRole('button', { name: 'Feed fish' }));
  fireEvent.keyDown(window, { key: 'f' });
  const input = document.createElement('input');
  document.body.appendChild(input);
  fireEvent.keyDown(input, { key: 'f' });

  expect(feedSpy).toHaveBeenCalledTimes(2);
  expect(feedSpy).toHaveBeenNthCalledWith(1, TANK_CENTER);
  expect(feedSpy).toHaveBeenNthCalledWith(2, TANK_CENTER);
  input.remove();
});
```

- [ ] **Step 2: Run the tests and verify the new assertions fail**

Run: `npm run test -- --run tests/HUD.test.tsx`

Expected: FAIL because the rail and `F` handler are not wired.

- [ ] **Step 3: Wire shared actions into HUD**

Import `MobileActionRail`, `feedAt`, and `TANK_CENTER`. Create stable callbacks:

```tsx
const handleFeed = useCallback(() => feedAt(TANK_CENTER), []);
const handleToggleDecoration = useCallback(() => {
  if (isPlacingDecoration) stopPlacingDecoration();
  else startPlacingDecoration(selectedDecorationType);
}, [isPlacingDecoration, selectedDecorationType, startPlacingDecoration, stopPlacingDecoration]);
```

Add `case 'f': handleFeed(); break;` to the existing keydown listener, ignoring text inputs, textareas, contenteditable targets, and modified shortcuts. Render `MobileActionRail` beside the existing panel and pass `fishCount`, the current placement callout, and the optional Settings callback.

- [ ] **Step 4: Pass the Settings trigger through App**

Change the callback type to accept the invoking element:

```tsx
const settingsTriggerRef = useRef<HTMLElement | null>(null);
const openSettings = useCallback((trigger?: HTMLElement) => {
  settingsTriggerRef.current = trigger ?? null;
  setSettingsOpen(true);
}, []);
```

Have both desktop and mobile Settings buttons call `onOpenSettings(event.currentTarget)`, and pass `settingsTriggerRef` to `SettingsModal` as the restoration target.

- [ ] **Step 5: Run HUD tests and commit**

Run: `npm run test -- --run tests/HUD.test.tsx tests/MobileActionRail.test.tsx`

Expected: PASS. Commit: `git add src/components/ui/HUD.tsx src/App.tsx tests/HUD.test.tsx && git commit -m "feat: wire mobile aquarium actions"`.

### Task 4: Make SettingsModal keyboard accessible

**Files:**

- Modify: `src/components/ui/SettingsModal.tsx`
- Modify: `src/components/ui/SettingsModal.css`
- Modify: `src/App.tsx`
- Test: `tests/SettingsModal.test.tsx`

- [ ] **Step 1: Write failing focus tests**

Cover focus entry, wrapping, Escape close, and restoration:

```tsx
it('traps focus and restores it to the opener', () => {
  const opener = document.createElement('button');
  document.body.appendChild(opener);
  const onClose = vi.fn();
  const returnFocusRef = { current: opener };
  render(
    <SettingsModal
      open
      onClose={onClose}
      showDebugPanel={false}
      setShowDebugPanel={vi.fn()}
      returnFocusRef={returnFocusRef}
    />
  );

  expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
  expect(screen.getByRole('checkbox')).toHaveFocus();
  fireEvent.keyDown(document, { key: 'Escape' });
  expect(onClose).toHaveBeenCalledOnce();
  opener.focus();
  expect(opener).toHaveFocus();
  opener.remove();
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm run test -- --run tests/SettingsModal.test.tsx`

Expected: FAIL because focus is not moved or trapped and the return ref prop is not implemented.

- [ ] **Step 3: Implement a bounded focus scope**

Add `dialogRef`, `returnFocusRef`, and a `useLayoutEffect` that focuses the close button on open, handles Escape and Tab/Shift+Tab across the dialog’s focusable descendants, and restores only connected opener elements on cleanup. Keep the existing backdrop click and checkbox behavior.

- [ ] **Step 4: Make the background inert**

Wrap the non-modal App content in a ref-backed shell (`<div ref={appShellRef} id="vibe-app-shell">`) and pass that ref to `SettingsModal`. Set `shell.inert = open` in the modal effect and restore it on cleanup. Add the standard `inert` TypeScript-safe guard used by the project’s DOM typings.

- [ ] **Step 5: Preserve visible focus and reduced-motion styling**

Add `:focus-visible` styling to modal content controls and a `@media (prefers-reduced-motion: reduce)` rule that sets modal/rail transitions and placement pulse animation to `none`.

- [ ] **Step 6: Run focused tests and commit**

Run: `npm run test -- --run tests/SettingsModal.test.tsx tests/HUD.test.tsx`

Expected: PASS. Commit: `git add src/components/ui/SettingsModal.tsx src/components/ui/SettingsModal.css src/App.tsx tests/SettingsModal.test.tsx && git commit -m "fix: trap settings focus on mobile"`.

### Task 5: Add responsive browser coverage

**Files:**

- Modify: `tests/e2e/smoke.spec.ts`
- Modify: `playwright.config.ts` only if a stable mobile project is needed

- [ ] **Step 1: Add the failing 390 × 844 smoke flow**

Add a test that sets the viewport before navigation and checks rail reachability, target size, canvas visibility, keyboard feeding, and Settings focus:

```ts
test('keeps the aquarium dominant and exposes mobile primary actions', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./', { waitUntil: 'domcontentloaded' });

  const rail = page.getByRole('navigation', { name: 'Primary aquarium actions' });
  await expect(rail).toBeVisible();
  await expect(page.locator('canvas')).toBeVisible({ timeout: 20_000 });

  for (const name of ['Feed fish', 'Place decoration', 'Open settings']) {
    const button = page.getByRole('button', { name });
    await expect(button).toBeVisible();
    const box = await button.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }

  await page.keyboard.press('f');
  await page.getByRole('button', { name: 'Place decoration' }).press('Enter');
  await expect(rail).toContainText('Click tank floor to place');
  await page.keyboard.press('Escape');

  await page.getByRole('button', { name: 'Open settings' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close' })).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: 'Close' })).toBeFocused();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('button', { name: 'Open settings' })).toBeFocused();
});
```

- [ ] **Step 2: Run the new browser test and verify it fails**

Run: `CI=1 npx playwright test tests/e2e/smoke.spec.ts -g "aquarium dominant" --workers=1`

Expected: FAIL on the missing rail or missing focus behavior.

- [ ] **Step 3: Add landscape and reduced-motion assertions**

Add a 844 × 390 viewport check that the rail is visible and within the viewport, and use `page.emulateMedia({ reducedMotion: 'reduce' })` to verify the placement hint remains visible and interactive without requiring animation completion.

- [ ] **Step 4: Run the focused browser flow and commit**

Run: `CI=1 npx playwright test tests/e2e/smoke.spec.ts -g "aquarium dominant|landscape" --workers=1`

Expected: PASS. Commit: `git add tests/e2e/smoke.spec.ts playwright.config.ts && git commit -m "test: cover mobile hud and settings accessibility"`.

### Task 6: Full validation, documentation, and handoff

**Files:**

- Modify: `docs/performance/asset-transfer.md` only if the build changes its generated report
- Modify: `memory/activeContext.md` and `memory/progress.md` with the Phase 6 handoff entry
- Modify: `memory/tasks/_index.md` only if a Phase 6 task record is added

- [ ] **Step 1: Run the complete validation matrix**

Run sequentially from the Phase 6 worktree:

```bash
npm run format:check
npm run lint -- --max-warnings=0
npm run typecheck
NODE_OPTIONS='--localstorage-file=/tmp/vibe-aquarium-phase6-full.localstorage' npm run test -- --run
npm run build
npm run check:bundle
CI=1 npm run test:smoke
git diff --check
```

Expected: all commands pass; the full suite retains the pre-phase baseline plus the new UI/accessibility tests, and all browser smoke tests pass at one worker in CI mode.

- [ ] **Step 2: Perform a visual review at required viewports**

Use the real browser at 390 × 844, 844 × 390, and desktop 1280 × 800. Confirm the tank remains the dominant surface, rail controls do not cover the focal center, placement guidance is legible, and desktop HUD behavior is unchanged.

- [ ] **Step 3: Update project documentation**

Add a dated Phase 6 entry to `memory/progress.md` describing the rail, keyboard feeding, modal focus behavior, and validation results. Update `memory/activeContext.md` so the next milestone is #146 art direction or #140 parity after #147 handoff.

- [ ] **Step 4: Commit documentation and prepare the PR**

Commit: `git add memory/activeContext.md memory/progress.md docs/performance/asset-transfer.md && git commit -m "docs: record phase 6 mobile ux validation"`.

Open a PR from `codex/phase6-mobile-ux` to `main` that links #147 and the design/plan documents. Include an executive summary, changed files, before/after viewport evidence, and the complete validation matrix.

## Plan self-review

- Requirements 1–6 from the approved design map to Tasks 2–5 and the full validation matrix in Task 6.
- Desktop HUD, ECS ownership, simulation rules, and renderer policy remain out of scope.
- No task depends on an unspecified new library; focus management uses native DOM APIs and existing test tooling.
- The only intentional new allocation remains event-time food setup, never a render-loop allocation.
