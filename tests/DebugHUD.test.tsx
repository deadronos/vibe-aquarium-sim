import React from 'react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render } from '@testing-library/react';
import DebugHUD from '../src/components/DebugHUD';

describe('DebugHUD telemetry opt-in', () => {
  beforeEach(() => {
    delete window.__vibe_debug;
    delete window.__vibe_renderStatus;
    delete window.__vibe_schedStatus;
  });

  afterEach(() => {
    delete window.__vibe_debug;
    delete window.__vibe_renderStatus;
    delete window.__vibe_schedStatus;
  });

  it('creates the collector while visible and removes it when hidden', () => {
    const { unmount } = render(<DebugHUD />);

    expect(window.__vibe_debug).toBeDefined();
    expect(window.__vibe_debug?.simulateStep).toBeDefined();

    unmount();

    expect(window.__vibe_debug).toBeUndefined();
  });
});
