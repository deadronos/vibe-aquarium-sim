import { useEffect, useState } from 'react';
import { world } from '../../store';
import { useGameStore } from '../../gameStore';
import type { DecorationType } from '../../gameStore';
import './HUD.css';

const formatTimeAgo = (date: Date | null): string => {
  if (!date) return 'Never';

  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 5) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  return `${hours}h ago`;
};

export const HUD = () => {
  const [fishCount, setFishCount] = useState(0);
  const [foodCount, setFoodCount] = useState(0);
  const [, forceUpdate] = useState(0);

  const {
    lastFedTime,
    isPlacingDecoration,
    selectedDecorationType,
    startPlacingDecoration,
    stopPlacingDecoration,
  } = useGameStore();

  // Poll ECS for entity counts
  useEffect(() => {
    const interval = setInterval(() => {
      setFishCount(world.with('isFish').entities.length);
      setFoodCount(world.with('isFood').entities.length);
      forceUpdate((n) => n + 1); // Update time display
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const handleDecorationClick = (type: DecorationType) => {
    if (isPlacingDecoration && selectedDecorationType === type) {
      stopPlacingDecoration();
    } else {
      startPlacingDecoration(type);
    }
  };

  const decorationTypes: { type: DecorationType; icon: string; label: string }[] = [
    { type: 'seaweed', icon: '🌿', label: 'Seaweed' },
    { type: 'coral', icon: '🪸', label: 'Coral' },
    { type: 'rock', icon: '🪨', label: 'Rock' },
  ];

  return (
    <div className="hud-container">
      <div className="hud-panel">
        <h2 className="hud-title">Aquarium Stats</h2>

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
          <span className="hud-stat-value">{formatTimeAgo(lastFedTime)}</span>
        </div>

        <div className="hud-divider" />

        <h3 className="hud-section-title">Decorations</h3>
        <div className="decoration-buttons">
          {decorationTypes.map(({ type, icon, label }) => (
            <button
              key={type}
              type="button"
              className={`decoration-btn ${isPlacingDecoration && selectedDecorationType === type ? 'active' : ''}`}
              onClick={() => handleDecorationClick(type)}
              title={label}
              aria-pressed={isPlacingDecoration && selectedDecorationType === type}
            >
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
      </div>
    </div>
  );
};
