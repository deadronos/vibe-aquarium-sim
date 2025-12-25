import { useEffect, useState } from 'react';
import { world } from '../../store';
import { useGameStore } from '../../gameStore';
import type { DecorationType } from '../../gameStore';
import { useQualityStore } from '../../performance/qualityStore';
import './HUD.css';

const readBoolFromStorage = (key: string, fallback: boolean): boolean => {
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw === null) return fallback;
    return raw === 'true';
  } catch {
    return fallback;
  }
};

const writeBoolToStorage = (key: string, value: boolean) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(key, value ? 'true' : 'false');
  } catch {
    // ignore
  }
};

const getDefaultPanelOpen = (): boolean => {
  if (typeof window === 'undefined') return true;
  try {
    return !window.matchMedia('(orientation: landscape) and (max-height: 520px)').matches;
  } catch {
    return true;
  }
};

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

  const [panelOpen, setPanelOpen] = useState(() =>
    readBoolFromStorage('hud.panel.open', getDefaultPanelOpen())
  );

  const fpsEma = useQualityStore((s) => s.fpsEma);
  const qualityLevel = useQualityStore((s) => s.level);

  const [statsOpen, setStatsOpen] = useState(() =>
    readBoolFromStorage('hud.section.stats.open', true)
  );
  const [performanceOpen, setPerformanceOpen] = useState(() =>
    readBoolFromStorage('hud.section.performance.open', true)
  );
  const [decorationsOpen, setDecorationsOpen] = useState(() =>
    readBoolFromStorage('hud.section.decorations.open', true)
  );

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
      <div className={`hud-panel ${panelOpen ? '' : 'is-collapsed'}`}>
        <button
          type="button"
          className="hud-handle"
          onClick={() => {
            const next = !panelOpen;
            setPanelOpen(next);
            writeBoolToStorage('hud.panel.open', next);
          }}
          title={panelOpen ? 'Collapse HUD' : 'Expand HUD'}
        >
          <span className="hud-handle-icon" aria-hidden="true">
            {panelOpen ? '‹' : '›'}
          </span>
          <span className="sr-only">{panelOpen ? 'Collapse HUD' : 'Expand HUD'}</span>
        </button>

        {panelOpen && (
          <div id="hud-content" className="hud-content">
            <details
              className="hud-section"
              open={statsOpen}
              onToggle={(e) => {
                const next = (e.currentTarget as HTMLDetailsElement).open;
                setStatsOpen(next);
                writeBoolToStorage('hud.section.stats.open', next);
              }}
            >
              <summary className="hud-summary">
                <span className="hud-title">Aquarium Stats</span>
              </summary>
              <div className="hud-section-content">
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
              </div>
            </details>

            <div className="hud-divider" />

            <details
              className="hud-section"
              open={performanceOpen}
              onToggle={(e) => {
                const next = (e.currentTarget as HTMLDetailsElement).open;
                setPerformanceOpen(next);
                writeBoolToStorage('hud.section.performance.open', next);
              }}
            >
              <summary className="hud-summary">
                <span className="hud-section-title">Performance</span>
              </summary>
              <div className="hud-section-content">
                <div className="hud-stat">
                  <span className="hud-stat-label">FPS</span>
                  <span className="hud-stat-value">{Math.round(fpsEma)}</span>
                </div>

                <div className="hud-stat">
                  <span className="hud-stat-label">Quality</span>
                  <span className="hud-stat-value">{qualityLevel}</span>
                </div>
              </div>
            </details>

            <div className="hud-divider" />

            <details
              className="hud-section"
              open={decorationsOpen}
              onToggle={(e) => {
                const next = (e.currentTarget as HTMLDetailsElement).open;
                setDecorationsOpen(next);
                writeBoolToStorage('hud.section.decorations.open', next);
              }}
            >
              <summary className="hud-summary">
                <span className="hud-section-title">Decorations</span>
              </summary>
              <div className="hud-section-content">
                <div className="decoration-buttons">
                  {decorationTypes.map(({ type, icon, label }) => (
                    <button
                      key={type}
                      type="button"
                      className={`decoration-btn ${isPlacingDecoration && selectedDecorationType === type ? 'active' : ''}`}
                      onClick={() => handleDecorationClick(type)}
                      title={label}
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
            </details>
          </div>
        )}
      </div>
    </div>
  );
};
