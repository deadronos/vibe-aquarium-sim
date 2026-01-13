# TASK014 - Add unit tests for Tank material defaults

**Status:** Pending
**Added:** 2026-01-13

## Original Request
Add tests that assert the Tank mesh uses the expected MeshTransmissionMaterial defaults, and verify caustics overlay uniforms remain as documented.

## Acceptance Criteria
- Unit test verifies Mesh exists and its `material` is a `MeshTransmissionMaterial` (or has expected property shape in test env).
- Test asserts default `opacity`, `ior`, `attenuationColor`, `clearcoat`, and `transmission` values match `DES015`.
- Existing `TankCausticsOverlay` tests remain passing (they already check caustics uniforms are present and time updates correctly).

## Implementation Plan
- Create `tests/TankMaterial.test.ts` using `ReactThreeTestRenderer`.
- Mock `useQualityStore` as needed to provide stable `transmissionResolution`/`transmissionSamples` values.
- Add assertions for material properties.

## Notes
- This task is intentionally small and should be done as a single PR with tests and a short note in the PR description linking `DES015`.
