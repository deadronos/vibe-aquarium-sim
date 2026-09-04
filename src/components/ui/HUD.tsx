import { useEffect, useState, useCallback } from 'react';
import { world } from '../../store';
import { useGameStore } from '../../gameStore';
import type { DecorationType } from '../../domain/types';
import { useQualityStore } from '../../performance/qualityStore';
import { readBoolFromStorage, writeBoolToStorage } from '../../utils/storageUtils';
import * as feedingActions from '../../game/feedingActions';
import { MobileActionRail } from './MobileActionRail';
import './HUD.css';

type HUDProps = {
  onOpenSettings?: (trigger?: HTMLButtonElement) => void;
  shortcutsDisabled?: boolean;
};

const getDefaultPanelOpen = (): boolean => {
  if (typeof window === 'undefined') return true;
  try {
    return !window.matchMedia('(orientation: landscape) and (max-height: 520px)').matches;
  } catch (error) {
    console.warn('Error determining default panel state:', error);
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

export const HUD = ({ onOpenSettings, shortcutsDisabled = false }: HUDProps) => {
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

  const lastFedTime = useGameStore((state) => state.lastFedTime);
  const isPlacingDecoration = useGameStore((state) => state.isPlacingDecoration);
  const selectedDecorationType = useGameStore((state) => state.selectedDecorationType);
  const startPlacingDecoration = useGameStore((state) => state.startPlacingDecoration);
  const stopPlacingDecoration = useGameStore((state) => state.stopPlacingDecoration);

  const calloutText = isPlacingDecoration
    ? 'Click tank floor to place • Esc to cancel'
    : 'Click tank to feed fish';

  const handleFeed = useCallback(() => {
    feedingActions.feedAt(feedingActions.TANK_CENTER);
  }, []);

  const handleToggleDecoration = useCallback(() => {
    if (isPlacingDecoration) {
      stopPlacingDecoration();
    } else {
      startPlacingDecoration(selectedDecorationType);
    }
  }, [isPlacingDecoration, selectedDecorationType, startPlacingDecoration, stopPlacingDecoration]);

  // Poll ECS for entity counts
  useEffect(() => {
    const interval = setInterval(() => {
      setFishCount(world.with('isFish').entities.length);
      setFoodCount(world.with('isFood').entities.length);
      forceUpdate((n) => n + 1); // Update time display
    }, 500);

    return () => clearInterval(interval);
  }, []);

  const handleDecorationClick = useCallback(
    (type: DecorationType) => {
      if (isPlacingDecoration && selectedDecorationType === type) {
        stopPlacingDecoration();
      } else {
        startPlacingDecoration(type);
      }
    },
    [isPlacingDecoration, selectedDecorationType, stopPlacingDecoration, startPlacingDecoration]
  );

  const decorationTypes: { type: DecorationType; icon: string; label: string; shortcut: string }[] =
    [
      { type: 'seaweed', icon: '🌿', label: 'Seaweed', shortcut: '1' },
      { type: 'coral', icon: '🪸', label: 'Coral', shortcut: '2' },
      { type: 'rock', icon: '🪨', label: 'Rock', shortcut: '3' },
    ];

  useEffect(() => {
    if (shortcutsDisabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if user is typing in an input or using a modified shortcut.
      if (
        e.defaultPrevented ||
        e.altKey ||
        e.ctrlKey ||
        e.metaKey ||
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        (e.target instanceof HTMLElement && e.target.isContentEditable)
      )
        return;

      switch (e.key.toLowerCase()) {
        case 'f':
          e.preventDefault();
          handleFeed();
          break;
        case '1':
          handleDecorationClick('seaweed');
          break;
        case '2':
          handleDecorationClick('coral');
          break;
        case '3':
          handleDecorationClick('rock');
          break;
        case 'escape':
          if (isPlacingDecoration) {
            stopPlacingDecoration();
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    isPlacingDecoration,
    selectedDecorationType,
    startPlacingDecoration,
    stopPlacingDecoration,
    handleDecorationClick,
    handleFeed,
    shortcutsDisabled,
  ]);

  return (
    <div className="hud-container">
      <div className={`hud-panel ${panelOpen ? '' : 'is-collapsed'}`}>
        {panelOpen && onOpenSettings && (
          <button
            type="button"
            className="hud-settings"
            onClick={(event) => onOpenSettings(event.currentTarget)}
            aria-label="Open settings"
            title="Settings"
          >
            <span aria-hidden="true">⚙</span>
          </button>
        )}
        <button
          type="button"
          className="hud-handle"
          aria-expanded={panelOpen ? 'true' : 'false'}
          aria-controls="hud-content"
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
            <div className="hud-callout" role="status">
              {calloutText}
            </div>

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
                  <time className="hud-stat-value" dateTime={lastFedTime?.toISOString()}>
                    {formatTimeAgo(lastFedTime)}
                  </time>
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
              </div>
            </details>
          </div>
        )}
      </div>
      <MobileActionRail
        onFeed={handleFeed}
        onToggleDecor={handleToggleDecoration}
        onOpenSettings={onOpenSettings}
        isPlacingDecoration={isPlacingDecoration}
        fishCount={fishCount}
        placementHint={calloutText}
      />
    </div>
  );
};
