import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

describe('example', () => {
  it('renders basic JSX', () => {
    render(<div>Hello world</div>);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });
});
