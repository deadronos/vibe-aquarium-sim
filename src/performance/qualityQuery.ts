import type { QualityLevel } from './qualityPresets';

const QUALITY_LEVELS: readonly QualityLevel[] = ['low', 'medium', 'high', 'ultra'];

export const resolveQualityLevel = (search: string): QualityLevel | null => {
  const requested = new URLSearchParams(search).get('quality')?.toLowerCase();
  return requested && QUALITY_LEVELS.includes(requested as QualityLevel)
    ? (requested as QualityLevel)
    : null;
};
