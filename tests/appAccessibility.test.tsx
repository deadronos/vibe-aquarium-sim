// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@react-three/fiber', () => ({
  Canvas: ({
    children,
    'aria-label': label,
    'aria-describedby': describedBy,
    role,
  }: {
    children?: ReactNode;
    'aria-label'?: string;
    'aria-describedby'?: string;
    role?: string;
  }) => (
    <canvas aria-label={label} aria-describedby={describedBy} role={role}>
      {children}
    </canvas>
  ),
}));

vi.mock('../src/scene/ErrorBoundary', () => ({
  ErrorBoundary: ({ children }: { children: ReactNode }) => children,
}));
vi.mock('../src/scene/Experience', () => ({ Experience: () => null }));
vi.mock('../src/ui/Hud', () => ({ Hud: () => null }));

const { default: App } = await import('../src/App');
const { useAquarium } = await import('../src/state/store');

describe('aquarium accessibility', () => {
  beforeEach(() => useAquarium.setState({ loadError: null }));

  it('names and describes the interactive canvas', () => {
    render(<App />);
    const canvas = screen.getByRole('img', { name: 'Interactive aquarium scene' });
    expect(canvas.getAttribute('aria-describedby')).toBe('aquarium-scene-description');
    expect(screen.getByText(/planted living-room aquarium/).id).toBe('aquarium-scene-description');
  });
});
