import { render } from '@testing-library/react';
import { describe, it } from 'vitest';
import { Water } from '../src/components/Water';
import { Canvas } from '@react-three/fiber';
import React from 'react';

// Mock ResizeObserver which is needed by R3F/Three
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

describe('Water', () => {
  it('renders without crashing', () => {
    render(
      <Canvas>
        <Water />
      </Canvas>
    );
  });
});
