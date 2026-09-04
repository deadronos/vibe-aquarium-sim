# Phase 6 Mobile UX Design

## Goal

Deliver the first Phase 6 slice for issue #147: preserve the aquarium as the dominant visual surface on narrow screens while making the three primary actions immediately reachable and keyboard accessible.

## Scope

This slice covers mobile composition, the primary action rail, keyboard feeding, decoration-state feedback, reduced-motion behavior, and Settings dialog accessibility. It does not redesign the desktop HUD, add new decoration types, or change simulation rules.

## Visual thesis

A quiet, edge-hugging instrument rail that feels like part of the aquarium glass: translucent, compact, high-contrast, and subordinate to the tank rather than a panel floating over it.

## Content plan

- **Primary workspace:** full-bleed aquarium canvas remains unobstructed at 390 × 844 and common landscape-phone sizes.
- **Orientation/status:** a small bottom status strip communicates fish count and placement guidance without exposing the full stats panel.
- **Primary actions:** Feed, Decor, and Settings are the only persistent mobile controls.
- **Secondary detail:** existing stats, performance values, and decoration-type controls remain in the expanded desktop-oriented HUD path.

## Interaction thesis

1. Tapping a rail action does the thing immediately; there is no intermediate action menu.
2. Decoration placement has a clear active state and a reversible Escape path.
3. Motion reinforces state only when motion is allowed; reduced-motion users get the same actions and feedback without pulsing or sliding transitions.

## Requirements (EARS)

1. **WHEN** the viewport is below the mobile breakpoint, **THE SYSTEM SHALL** render a right-edge action rail containing Feed, Decor, and Settings without rendering the full expanded HUD over the tank. **Acceptance:** a 390 × 844 browser check finds all primary buttons reachable and confirms the canvas remains the dominant surface.
2. **WHEN** a user activates Feed by pointer, rail button, or the `F` key outside a text input, **THE SYSTEM SHALL** spawn food at the tank center and update the existing feeding state. **Acceptance:** unit coverage observes a center-point feed action and keyboard coverage ignores text inputs.
3. **WHEN** a user activates Decor, **THE SYSTEM SHALL** enter or exit the existing decoration-placement mode and expose the state through pressed semantics and visible guidance. **Acceptance:** unit/browser coverage checks `aria-pressed`, Escape cancellation, and the status strip.
4. **WHEN** Settings opens, **THE SYSTEM SHALL** move focus into the dialog, trap Tab/Shift+Tab within it, close on Escape or backdrop/close activation, and restore focus to the invoking rail button. **Acceptance:** a real browser flow verifies entry, trapping, close, and restoration.
5. **WHEN** `prefers-reduced-motion: reduce` matches, **THE SYSTEM SHALL** preserve all controls and state changes while disabling nonessential rail transitions and placement pulsing. **Acceptance:** browser CSS/media coverage confirms no required interaction depends on animation.
6. **WHEN** the viewport includes a safe-area inset or narrow landscape height, **THE SYSTEM SHALL** keep the rail and status strip within the usable viewport and avoid covering the tank focal center. **Acceptance:** browser checks run at 390 × 844 and a landscape-phone viewport.

## Architecture

```text
HUD
├── Desktop HUD (existing panel behavior)
└── MobileActionRail (narrow viewport only)
    ├── Feed button ────────┐
    ├── Decor button         ├── shared action callbacks
    └── Settings button ────┘

Pointer / F key ──> feedAt(point)
                    ├── update excitement
                    ├── add food entity
                    └── update last-fed state

Settings button ──> App settingsOpen ──> SettingsModal focus scope
```

### Component boundaries

- `src/components/ui/HUD.tsx` remains the public HUD entry point and owns the existing desktop behavior, persisted panel state, keyboard decoration shortcuts, and shared action callbacks.
- `src/components/ui/MobileActionRail.tsx` owns only narrow-screen presentation and native-button semantics. It receives action callbacks and read-only placement/status state; it does not mutate ECS state directly.
- `src/components/FeedingController.tsx` delegates both pointer and keyboard/rail feeding to a shared `feedAt(point)` action boundary so all feeding side effects stay consistent.
- `src/components/ui/SettingsModal.tsx` owns dialog focus entry, focus trapping, inert background behavior, and focus restoration through an optional opener ref.
- `src/components/ui/HUD.css` and `src/components/ui/SettingsModal.css` define the breakpoint, safe-area offsets, focus-visible treatment, and reduced-motion overrides.

### Responsive policy

- Use a single narrow-screen breakpoint chosen from the existing 520px mobile rules; keep the C-style rail active below that breakpoint.
- Preserve the desktop panel DOM and behavior above the breakpoint.
- Do not change the simulation camera in this slice. The full-bleed Canvas already owns the viewport; the rail/status overlay is positioned at the edge and therefore avoids the need for camera-state coupling.
- Use `env(safe-area-inset-top/right/bottom)` in fixed-position offsets and a minimum 44px target size for touch controls.

## Data flow and interfaces

```ts
type PrimaryActionHandlers = {
  onFeed: () => void;
  onToggleDecor: () => void;
  onOpenSettings?: () => void;
};

type MobileActionRailProps = PrimaryActionHandlers & {
  isPlacingDecoration: boolean;
  fishCount: number;
  placementHint: string;
};

function feedAt(point: THREE.Vector3): void;
```

- Rail `onFeed` calls `feedAt(TANK_CENTER)`, where `TANK_CENTER` is a stable zero vector created outside event/frame loops.
- Pointer feeding passes the clicked intersection point to the same helper.
- The `F` key listener is installed once by the HUD action layer and ignores `HTMLInputElement`/`HTMLTextAreaElement` targets.
- Settings receives a ref to the invoking button, or a callback-based restore target, so focus restoration remains correct after a mobile/desktop presentation change.

## Error and edge-case handling

| Situation                                    | Required behavior                                                                                |
| -------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Settings callback is absent                  | Omit the Settings rail control; Feed and Decor remain available.                                 |
| User presses `F` while typing                | Ignore the key and do not spawn food.                                                            |
| User presses `F` during decoration placement | Feed remains an explicit action; placement mode is unchanged until Escape or Decor is activated. |
| User activates Decor twice                   | Second activation exits placement mode, matching existing desktop behavior.                      |
| Dialog opener unmounts                       | Keep dialog focus on its close button; do not attempt to focus a detached node.                  |
| Tab reaches the dialog boundary              | Wrap to the first/last dialog control; background remains inert.                                 |
| Reduced-motion preference changes            | Keep behavior intact and let CSS remove nonessential transitions/pulses.                         |
| Very narrow viewport                         | Rail remains edge anchored with safe-area padding and does not expand into a full panel.         |

## Validation matrix

### Unit/component tests

- Extend `tests/HUD.test.tsx` for rail action labels, `aria-pressed`, `F` handling, input-target exclusion, and placement cancellation.
- Add `tests/FeedingController.test.tsx` or a focused feeding-action test for deterministic tank-center feeding and shared pointer/keyboard side effects.
- Extend Settings modal coverage with focus entry, Tab/Shift+Tab wrapping, Escape close, backdrop close, and opener restoration.

### Browser checks

- Add a 390 × 844 smoke flow that verifies the rail, canvas visibility, 44px target bounds, primary actions, `F` feeding, and decoration guidance.
- Add a landscape-phone flow with safe-area/height constraints.
- Verify Settings dialog accessibility with real keyboard navigation and no page errors.
- Verify reduced-motion media behavior without asserting implementation-specific animation durations.

### Existing gates

Run `npm run format:check`, `npm run lint -- --max-warnings=0`, `npm run typecheck`, `NODE_OPTIONS='--localstorage-file=/tmp/vibe-aquarium-phase6.localstorage' npm run test -- --run`, `npm run build`, `npm run check:bundle`, and `CI=1 npm run test:smoke`.

## Success criteria

- The mobile rail keeps the aquarium visually dominant at the issue’s target viewport.
- Feed works immediately from pointer, rail, and `F` with tank-center placement for non-pointer activation.
- Decoration and Settings retain existing behavior while gaining explicit mobile and keyboard affordances.
- Settings focus behavior is verifiable in a real browser, not only inferred from unit mocks.
- Desktop behavior, ECS ownership, simulation state, and renderer-independent rules remain unchanged.
