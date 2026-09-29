import { HudSection } from './HudSection';
import { formatTimeAgo } from './hudTime';

type HudStatsSectionProps = {
  fishCount: number;
  foodCount: number;
  lastFedTime: Date | null;
};

export const HudStatsSection = ({ fishCount, foodCount, lastFedTime }: HudStatsSectionProps) => (
  <HudSection title="Aquarium Stats" storageKey="hud.section.stats.open" titleClassName="hud-title">
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
