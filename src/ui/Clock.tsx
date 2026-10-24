import { useShallow } from 'zustand/react/shallow';
import { formatHour, useAquarium } from '../state/store';

const periodOfDay = (hour: number) => {
  if (hour < 5) return 'Night';
  if (hour < 9) return 'Morning';
  if (hour < 12) return 'Late morning';
  if (hour < 17) return 'Afternoon';
  if (hour < 21) return 'Evening';
  return 'Night';
};

/**
 * The time readout and its controls. The scene publishes `displayHour` a few times a second in
 * Day cycle, so this is the only part of the HUD that subscribes to it.
 */
export const Clock = () => {
  const { clockMode, manualHour, displayHour, setClockMode, setManualHour } = useAquarium(
    useShallow((s) => ({
      clockMode: s.clockMode,
      manualHour: s.manualHour,
      displayHour: s.displayHour,
      setClockMode: s.setClockMode,
      setManualHour: s.setManualHour,
    }))
  );

  return (
    <section className="hud__group hud__clock">
      <div className="hud__time">
        <span className="hud__hour">{formatHour(displayHour)}</span>
        <span className="hud__period">{periodOfDay(displayHour)}</span>
      </div>
      <div className="hud__clock-controls">
        <div className="segmented" role="radiogroup" aria-label="Clock">
          {(['live', 'cycle'] as const).map((mode) => (
            <button
              key={mode}
              role="radio"
              aria-checked={clockMode === mode}
              className={clockMode === mode ? 'is-active' : ''}
              onClick={() => setClockMode(mode)}
              title={mode === 'live' ? 'Follow your local time' : 'A full day every six minutes'}
            >
              {mode === 'live' ? 'Live' : 'Day cycle'}
            </button>
          ))}
        </div>
        <input
          className="hud__slider"
          type="range"
          min={0}
          max={23.98}
          step={0.02}
          value={clockMode === 'manual' ? manualHour : displayHour}
          onChange={(event) => setManualHour(Number(event.target.value))}
          aria-label="Time of day"
        />
      </div>
    </section>
  );
};
