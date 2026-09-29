import { HudSection } from './HudSection';
import { formatTimeAgo } from './hudTime';

type HudStatsSectionProps = {
  fishCount: number;
  foodCount: number;
  lastFedTime: Date | null;
  open: boolean;
  onToggle: (open: boolean) => void;
};

export const HudStatsSection = ({
  fishCount,
  foodCount,
  lastFedTime,
  open,
  onToggle,
}: HudStatsSectionProps) => (
  <HudSection title="Aquarium Stats" open={open} onToggle={onToggle} titleClassName="hud-title">
    <div className="hud-stat">
      <span className="hud-stat-label">Fish</span>
      <span className="hud-stat-value">{fishCount}</span>
    </div>

    <div className="hud-stat">
      <span className="hud-stat-label">Food</span>
      <span className="hud-stat-value">{foodCount}</span>
    </div>

    <div className="hud-stat">
      <span className="hud-stat-label">Last Fed</span>
      <time className="hud-stat-value" dateTime={lastFedTime?.toISOString()}>
        {formatTimeAgo(lastFedTime)}
      </time>
    </div>
  </HudSection>
);
