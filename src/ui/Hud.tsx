import { useEffect, useState } from 'react';
import { Ambience } from '../audio/ambience';
import { SPECIES } from '../sim/species';
import { formatHour, useAquarium } from '../state/store';
import type { LoadError, Viewpoint } from '../state/store';
import './hud.css';

const VIEWS: { id: Viewpoint; label: string; key: string }[] = [
  { id: 'sofa', label: 'Sofa', key: '1' },
  { id: 'tank', label: 'Tank', key: '2' },
  { id: 'glass', label: 'Up close', key: '3' },
  { id: 'room', label: 'Room', key: '4' },
  { id: 'follow', label: 'Follow a fish', key: '5' },
];

const ambience = new Ambience();
const IDLE_MS = 7000;

const reload = () => window.location.reload();

const LOAD_ERRORS: Record<
  LoadError,
  { title: string; body: string; action: string; retry: 'remount' | 'reload'; busy?: boolean }
> = {
  webgl: {
    title: 'This aquarium needs WebGL',
    body: 'Your browser could not start WebGL, which draws the room and the fish. Turning on hardware acceleration in the browser settings, or opening the page in another browser, usually helps.',
    action: 'Reload',
    retry: 'reload',
  },
  assets: {
    title: 'The fish did not arrive',
    body: 'Their models failed to download. Check your connection and try again.',
    action: 'Retry',
    retry: 'remount',
  },
  timeout: {
    title: 'The fish are taking a while',
    body: 'Their models are still not here after 25 seconds. The connection may be slow or stuck.',
    action: 'Retry',
    retry: 'remount',
  },
  'context-lost': {
    title: 'The graphics were reset',
    body: 'The graphics card dropped the scene. Recovering… If the room does not come back, reload the page.',
    action: 'Reload',
    retry: 'reload',
    busy: true,
  },
  crash: {
    title: 'Something went wrong drawing the room',
    body: 'Reloading the page usually brings it back.',
    action: 'Reload',
    retry: 'reload',
  },
};

const periodOfDay = (hour: number) => {
  if (hour < 5) return 'Night';
  if (hour < 9) return 'Morning';
  if (hour < 12) return 'Late morning';
  if (hour < 17) return 'Afternoon';
  if (hour < 21) return 'Evening';
  return 'Night';
};

export const Hud = () => {
  const state = useAquarium();
  const [idle, setIdle] = useState(false);
  const [hint, setHint] = useState(true);
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    if (state.sound) ambience.start();
    else ambience.stop();
  }, [state.sound]);

  useEffect(() => {
    let timer = window.setTimeout(() => setIdle(true), IDLE_MS);
    const wake = () => {
      setIdle(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(() => setIdle(true), IDLE_MS);
    };
    const hintTimer = window.setTimeout(() => setHint(false), 9000);
    window.addEventListener('pointermove', wake);
    window.addEventListener('pointerdown', wake);
    window.addEventListener('keydown', wake);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(hintTimer);
      window.removeEventListener('pointermove', wake);
      window.removeEventListener('pointerdown', wake);
      window.removeEventListener('keydown', wake);
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      const store = useAquarium.getState();
      const view = VIEWS.find((v) => v.key === event.key);
      if (view) store.setViewpoint(view.id);
      else if (event.key === 'f') store.requestFeed();
      else if (event.key === 'h') setHidden((value) => !value);
      else if (event.key === 'm') store.toggleSound();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const loadError = state.loadError ? LOAD_ERRORS[state.loadError] : null;
  const veiled = !state.ready || loadError !== null;
  const species = SPECIES.map((s) => s.label.toLowerCase()).join(', ');

  return (
    <div className="hud" data-idle={idle} data-hidden={hidden}>
      <div className={`loading ${veiled ? '' : 'loading--done'}`} aria-hidden={!veiled}>
        {(!loadError || loadError.busy) && <div className="loading__ripple" />}
        {loadError ? (
          <div className="loading__error" role="alert">
            <h2>{loadError.title}</h2>
            <p>{loadError.body}</p>
            <button
              className="button button--primary"
              onClick={loadError.retry === 'remount' ? state.retryLoad : reload}
            >
              {loadError.action}
            </button>
          </div>
        ) : (
          <p>Filling the tank…</p>
        )}
      </div>

      <header className="hud__title">
        <h1>Vibe Aquarium</h1>
        {state.ready && (
          <p>
            {state.fishCount} fish · {species}
          </p>
        )}
      </header>

      <p className={`hud__hint ${hint && state.ready ? '' : 'hud__hint--gone'}`}>
        Click the water to feed · drag to look around · scroll to zoom · H hides this panel
      </p>

      <nav className="hud__bar" aria-label="Aquarium controls">
        <section className="hud__group hud__clock">
          <div className="hud__time">
            <span className="hud__hour">{formatHour(state.displayHour)}</span>
            <span className="hud__period">{periodOfDay(state.displayHour)}</span>
          </div>
          <div className="hud__clock-controls">
            <div className="segmented" role="radiogroup" aria-label="Clock">
              {(['live', 'cycle'] as const).map((mode) => (
                <button
                  key={mode}
                  role="radio"
                  aria-checked={state.clockMode === mode}
                  className={state.clockMode === mode ? 'is-active' : ''}
                  onClick={() => state.setClockMode(mode)}
                  title={
                    mode === 'live' ? 'Follow your local time' : 'A full day every six minutes'
                  }
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
              value={state.clockMode === 'manual' ? state.manualHour : state.displayHour}
              onChange={(event) => state.setManualHour(Number(event.target.value))}
              aria-label="Time of day"
            />
          </div>
        </section>

        <section className="hud__group" aria-label="Viewpoint">
          <div className="segmented segmented--views" role="radiogroup">
            {VIEWS.map((view) => (
              <button
                key={view.id}
                role="radio"
                aria-checked={state.viewpoint === view.id}
                className={state.viewpoint === view.id ? 'is-active' : ''}
                onClick={() => state.setViewpoint(view.id)}
                title={`${view.label} (${view.key})`}
              >
                {view.label}
              </button>
            ))}
          </div>
        </section>

        <section className="hud__group hud__actions">
          <button className="button button--primary" onClick={state.requestFeed} title="Feed (F)">
            Feed
          </button>
          <button
            className={`button ${state.sound ? 'is-active' : ''}`}
            onClick={state.toggleSound}
            aria-pressed={state.sound}
            title="Ambient sound (M)"
          >
            {state.sound ? 'Sound on' : 'Sound off'}
          </button>
          <button
            className="button"
            onClick={() => state.setQuality(state.quality === 'high' ? 'low' : 'high')}
            title="Rendering quality"
          >
            {state.quality === 'high' ? 'High quality' : 'Lite'}
          </button>
        </section>
      </nav>
    </div>
  );
};
