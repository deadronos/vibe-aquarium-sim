import { describe, expect, it } from 'vitest';
import type { DecorationType } from '../src/domain/types';
import type { DecorationType as StoreDecorationType } from '../src/store';

describe('shared domain types', () => {
  it('provides the same decoration union to domain and store consumers', () => {
    const shared: DecorationType = 'coral';
    const compatibility: StoreDecorationType = shared;

    expect(compatibility).toBe('coral');
  });
});
