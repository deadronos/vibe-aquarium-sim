import '@testing-library/jest-dom/vitest';

// Enable React's act() testing environment flag so tests that trigger state updates
// during effects or render are properly wrapped and do not emit warnings.
// See: https://react.dev/reference/react-dom/test-utils#act
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - global test environment flag
globalThis.IS_REACT_ACT_ENVIRONMENT = true;



import { act } from 'react';
import { useQualityStore } from '../src/performance/qualityStore';
import { useGameStore } from '../src/gameStore';

