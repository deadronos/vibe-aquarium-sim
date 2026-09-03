import { describe, expect, it } from 'vitest';
import { resolveQualityLevel } from '../src/performance/qualityQuery';

describe('resolveQualityLevel', () => {
  it('accepts a supported quality override', () => {
    expect(resolveQualityLevel('?quality=low')).toBe('low');
    expect(resolveQualityLevel('?quality=ULTRA')).toBe('ultra');
  });

  it('ignores missing and invalid quality overrides', () => {
    expect(resolveQualityLevel('')).toBeNull();
    expect(resolveQualityLevel('?quality=cinematic')).toBeNull();
    expect(resolveQualityLevel('?quality=')).toBeNull();
  });
});
