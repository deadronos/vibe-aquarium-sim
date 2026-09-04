import type { MouseEvent } from 'react';

import './HUD.css';

type MobileActionRailProps = {
  onFeed: () => void;
  onToggleDecor: () => void;
  onOpenSettings?: (trigger: HTMLButtonElement) => void;
  isPlacingDecoration: boolean;
  fishCount: number;
  placementHint: string;
};

export function MobileActionRail({
  onFeed,
  onToggleDecor,
  onOpenSettings,
  isPlacingDecoration,
  fishCount,
  placementHint,
}: MobileActionRailProps) {
  const handleSettingsClick = (event: MouseEvent<HTMLButtonElement>) => {
    onOpenSettings?.(event.currentTarget);
  };

  return (
    <nav className="mobile-action-rail" aria-label="Primary aquarium actions">
      <button
        type="button"
        className="mobile-action-button"
        onClick={onFeed}
        aria-label="Feed fish"
      >
        <span className="mobile-action-icon" aria-hidden="true">
          ◉
        </span>
        <span>Feed</span>
      </button>
      <button
        type="button"
        className="mobile-action-button"
        onClick={onToggleDecor}
        aria-pressed={isPlacingDecoration}
        aria-label="Place decoration"
      >
        <span className="mobile-action-icon" aria-hidden="true">
          ✦
        </span>
        <span>Decor</span>
      </button>
      {onOpenSettings && (
        <button
          type="button"
          className="mobile-action-button"
          onClick={handleSettingsClick}
          aria-label="Open settings"
        >
          <span className="mobile-action-icon" aria-hidden="true">
            ⚙
          </span>
          <span>Settings</span>
        </button>
      )}
      <div className="mobile-action-status" role="status" aria-live="polite">
        <span>{fishCount} fish</span>
        <span aria-hidden="true">·</span>
        <span>{placementHint}</span>
      </div>
    </nav>
  );
}
