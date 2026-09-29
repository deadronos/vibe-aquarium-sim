import type { DecorationType } from '../../domain/types';
import { HudSection } from './HudSection';

type HudDecorationsSectionProps = {
  isPlacingDecoration: boolean;
  selectedDecorationType: DecorationType;
  onDecorationClick: (type: DecorationType) => void;
};

const decorationTypes: { type: DecorationType; icon: string; label: string; shortcut: string }[] = [
  { type: 'seaweed', icon: '🌿', label: 'Seaweed', shortcut: '1' },
  { type: 'coral', icon: '🪸', label: 'Coral', shortcut: '2' },
  { type: 'rock', icon: '🪨', label: 'Rock', shortcut: '3' },
];

export const HudDecorationsSection = ({
  isPlacingDecoration,
  selectedDecorationType,
  onDecorationClick,
}: HudDecorationsSectionProps) => (
  <HudSection title="Decorations" storageKey="hud.section.decorations.open">
    <div className="decoration-buttons">
      {decorationTypes.map(({ type, icon, label }) => (
        <button
          key={type}
          type="button"
          className={`decoration-btn ${isPlacingDecoration && selectedDecorationType === type ? 'active' : ''}`}
          onClick={() => onDecorationClick(type)}
          title={`${label} (${decorationTypes.find((d) => d.type === type)?.shortcut})`}
        >
          <span className="decoration-btn-shortcut">
            {decorationTypes.find((d) => d.type === type)?.shortcut}
          </span>
          <span className="decoration-btn-icon">{icon}</span>
          {label}
        </button>
      ))}
    </div>

    {isPlacingDecoration && (
      <div className="placement-hint" role="status">
        Click on tank floor to place
      </div>
    )}
  </HudSection>
);
