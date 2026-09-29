import { useCallback, useState } from 'react';
import { useGameStore } from '../../gameStore';
import type { DecorationType } from '../../domain/types';
import { useQualityStore } from '../../performance/qualityStore';
import { readBoolFromStorage, writeBoolToStorage } from '../../utils/storageUtils';
import * as feedingActions from '../../game/feedingActions';
import { MobileActionRail } from './MobileActionRail';
import { HudDecorationsSection } from './HudDecorationsSection';
import { HudPerformanceSection } from './HudPerformanceSection';
import { HudStatsSection } from './HudStatsSection';
import { getDefaultPanelOpen } from './hudTime';
import { useHudEntityCounts } from './useHudEntityCounts';
import { useHudShortcuts } from './useHudShortcuts';
import { usePersistentToggle } from './usePersistentToggle';
import './HUD.css';

type HUDProps = {
  onOpenSettings?: (trigger?: HTMLButtonElement) => void;
  shortcutsDisabled?: boolean;
};

export const HUD = ({ onOpenSettings, shortcutsDisabled = false }: HUDProps) => {
  const { fishCount, foodCount } = useHudEntityCounts();

  const [panelOpen, setPanelOpen] = useState(() =>
    readBoolFromStorage('hud.panel.open', getDefaultPanelOpen())
  );

  const fpsEma = useQualityStore((s) => s.fpsEma);
  const qualityLevel = useQualityStore((s) => s.level);

  const [statsOpen, setStatsOpen] = usePersistentToggle('hud.section.stats.open', true);
  const [performanceOpen, setPerformanceOpen] = usePersistentToggle(
    'hud.section.performance.open',
    true
  );
  const [decorationsOpen, setDecorationsOpen] = usePersistentToggle(
    'hud.section.decorations.open',
    true
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

  useHudShortcuts({
    shortcutsDisabled,
    isPlacingDecoration,
    selectedDecorationType,
    startPlacingDecoration,
    stopPlacingDecoration,
    handleDecorationClick,
    handleFeed,
  });

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

            <HudStatsSection
              fishCount={fishCount}
              foodCount={foodCount}
              lastFedTime={lastFedTime}
              open={statsOpen}
              onToggle={setStatsOpen}
            />

            <div className="hud-divider" />

            <HudPerformanceSection
              fpsEma={fpsEma}
              qualityLevel={qualityLevel}
              open={performanceOpen}
              onToggle={setPerformanceOpen}
            />

            <div className="hud-divider" />

            <HudDecorationsSection
              isPlacingDecoration={isPlacingDecoration}
              selectedDecorationType={selectedDecorationType}
              onDecorationClick={handleDecorationClick}
              open={decorationsOpen}
              onToggle={setDecorationsOpen}
            />
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
