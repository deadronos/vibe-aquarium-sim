# Requirements (EARS-style)

1. WHEN the app starts, THE SYSTEM SHALL show the living room with the tank and spawn every fish
   defined in `SPECIES` (19 by default).
   Acceptance: `tests/school.test.ts` (spawn count); smoke test sees "19 fish".

2. WHILE fish swim, THE SYSTEM SHALL keep every fish inside the water volume, above the sand and
   clear of rocks and driftwood.
   Acceptance: `tests/school.test.ts` bounds and obstacle tests after 60–90 simulated seconds.

3. WHEN food is sprinkled, THE SYSTEM SHALL float it, sink it, settle it on the sand, let hungry
   fish eat it, and dissolve uneaten flakes.
   Acceptance: `tests/food.test.ts`; `tests/school.test.ts` "eats food".

4. WHILE the tank light is off (night), THE SYSTEM SHALL slow the fish and settle them lower.
   Acceptance: `tests/school.test.ts` "swims more slowly at night".

5. WHEN the hour changes, THE SYSTEM SHALL update sun, sky, lamp, tank LED, moonlight and fish
   activity continuously (no jumps).
   Acceptance: `tests/timeOfDay.test.ts`.

6. WHEN the user feeds, switches viewpoint or changes the clock mode, THE SYSTEM SHALL respond
   without a reload and without console errors.
   Acceptance: `tests/e2e/smoke.spec.ts`.

7. WHEN frame rate declines, THE SYSTEM SHALL switch to Lite quality.
   Acceptance: manual check (drei `PerformanceMonitor` → `setQuality('low')`).

8. GIVEN the same seed, THE SYSTEM SHALL produce the same simulation.
   Acceptance: `tests/school.test.ts` determinism; `tests/aquascape.test.ts` scatter.
