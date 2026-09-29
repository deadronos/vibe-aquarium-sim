import type { QualityLevel } from '../../performance/qualityPresets';
import { HudSection } from './HudSection';

type HudPerformanceSectionProps = {
  fpsEma: number;
  qualityLevel: QualityLevel;
  open: boolean;
  onToggle: (open: boolean) => void;
};

export const HudPerformanceSection = ({
  fpsEma,
  qualityLevel,
  open,
  onToggle,
}: HudPerformanceSectionProps) => (
  <HudSection title="Performance" open={open} onToggle={onToggle}>
    <div className="hud-stat">
      <span className="hud-stat-label">FPS</span>
      <span className="hud-stat-value">{Math.round(fpsEma)}</span>
    </div>

    <div className="hud-stat">
      <span className="hud-stat-label">Quality</span>
      <span className="hud-stat-value">{qualityLevel}</span>
    </div>
  </HudSection>
);
