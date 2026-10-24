import { useEffect, useRef, useState } from 'react';
import { Ambience } from '../audio/ambience';
import { SPECIES } from '../sim/species';
import { effectsBlocked, formatHour, useAquarium } from '../state/store';
import type { EffectsNotice, LoadError, Viewpoint } from '../state/store';
import { fullscreenSupported, toggleFullscreen, useFullscreen } from './fullscreen';
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
const NOTICE_MS = 8000;

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

/** Shown when High quality fell back to Lite, so the switch is never silent. */
const EFFECTS_NOTICES: Record<EffectsNotice, string> = {
  retry:
    'The High quality effects did not download, so the room is on Lite. Choose High quality to try again.',
  reload: 'The High quality effects did not download. Reload the page to try again.',
  update: 'A new version of the aquarium is available. Reload to get High quality back.',
  crash: 'The High quality effects stopped working, so the room switched to Lite.',
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
  const barRef = useRef<HTMLElement>(null);
  const fullscreen = useFullscreen();
  const [canFullscreen] = useState(fullscreenSupported);

  useEffect(() => {
    if (state.sound) ambience.start();
    else ambience.stop();
  }, [state.sound]);

  useEffect(() => {
    const bar = barRef.current;
    // A mouse or pen resting on the bar, or keyboard focus inside it, keeps the HUD awake: an
    // idle bar would swallow the click that is about to come. Touch has no hover, so a faded bar
    // still takes one tap to wake.
    let hovered = false;
    const heldAwake = () => hovered || bar?.querySelector(':focus-visible') != null;
    const sleep = () => {
      if (!heldAwake()) setIdle(true);
    };
    let timer = window.setTimeout(sleep, IDLE_MS);
    const wake = () => {
      setIdle(false);
      window.clearTimeout(timer);
      timer = window.setTimeout(sleep, IDLE_MS);
    };
    const enter = (event: PointerEvent) => {
      if (event.pointerType !== 'touch') hovered = true;
    };
    // Leaving the bar or its focus re-arms the timer that a held bar skipped.
    const leave = (event: PointerEvent) => {
      if (event.pointerType === 'touch') return;
      hovered = false;
      wake();
    };
    // An idle bar's controls ignore hits, so a press that wakes it lands on the bar itself. A tap
    // re-targets its click after that press has woken the bar, which would reach the control
    // underneath, so drop that one click.
    let swallowClick = false;
    const press = (event: PointerEvent) => {
      swallowClick = event.target === bar;
    };
    const click = (event: MouseEvent) => {
      if (!swallowClick) return;
      swallowClick = false;
      event.stopPropagation();
    };
    const key = () => {
      swallowClick = false;
    };
    const hintTimer = window.setTimeout(() => setHint(false), 9000);
    window.addEventListener('pointermove', wake);
    window.addEventListener('pointerdown', wake);
    window.addEventListener('pointerdown', press);
    window.addEventListener('keydown', wake);
    window.addEventListener('keydown', key);
    bar?.addEventListener('pointerenter', enter);
    bar?.addEventListener('pointerleave', leave);
    bar?.addEventListener('focusout', wake);
    bar?.addEventListener('click', click, true);
    return () => {
      window.clearTimeout(timer);
      window.clearTimeout(hintTimer);
      window.removeEventListener('pointermove', wake);
      window.removeEventListener('pointerdown', wake);
      window.removeEventListener('pointerdown', press);
      window.removeEventListener('keydown', wake);
      window.removeEventListener('keydown', key);
      bar?.removeEventListener('pointerenter', enter);
      bar?.removeEventListener('pointerleave', leave);
      bar?.removeEventListener('focusout', wake);
      bar?.removeEventListener('click', click, true);
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement) return;
      // Browser shortcuts (Ctrl/Cmd+F and friends) are not ours.
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const store = useAquarium.getState();
      const view = VIEWS.find((v) => v.key === event.key);
      if (view) store.setViewpoint(view.id);
      else if (event.key === 'f') store.requestFeed();
      else if (event.key === 'F') toggleFullscreen();
      else if (event.key === 'a') store.setAmbient(!store.ambient);
      else if (event.key === 'h') setHidden((value) => !value);
      else if (event.key === 'm') store.toggleSound();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // The Lite notice clears itself; the Lite label on the quality button stays as the record.
  useEffect(() => {
    if (!state.qualityNotice) return;
    const timer = window.setTimeout(useAquarium.getState().dismissQualityNotice, NOTICE_MS);
    return () => window.clearTimeout(timer);
  }, [state.qualityNotice]);

  const loadError = state.loadError ? LOAD_ERRORS[state.loadError] : null;
  const effectsNotice = state.effectsNotice;
  const highBlocked = effectsBlocked(effectsNotice);
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

      {effectsNotice && (
        <div className="hud__notice" role="status">
          <p>{EFFECTS_NOTICES[effectsNotice]}</p>
          {highBlocked ? (
            <button className="button button--primary" onClick={reload}>
              Reload
            </button>
          ) : (
            <button className="button" onClick={() => state.setEffectsNotice(null)}>
              Dismiss
            </button>
          )}
        </div>
      )}

      <p className={`hud__hint ${hint && state.ready ? '' : 'hud__hint--gone'}`}>
        Click the water to feed · drag to look around · scroll to zoom · H hides this panel
      </p>

      {/* The post-stack notice above says more, so this one waits while it shows. */}
      <div className="hud__toast" role="status">
        {state.qualityNotice && !effectsNotice && (
          <button
            className="hud__toast-text"
            onClick={state.dismissQualityNotice}
            title="The frame rate stayed low, so post-processing is off. Dismiss"
          >
            Switched to Lite for performance
          </button>
        )}
      </div>

      <nav className="hud__bar" aria-label="Aquarium controls" ref={barRef}>
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
          <button
            className={`button ${state.ambient ? 'is-active' : ''}`}
            onClick={() => state.setAmbient(!state.ambient)}
            aria-pressed={state.ambient}
            title="Ambient mode: drift through the shots on its own (A)"
          >
            Ambient
          </button>
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
            disabled={highBlocked && state.quality === 'low'}
            title="Rendering quality"
          >
            {state.quality === 'high' ? 'High quality' : 'Lite'}
          </button>
          {canFullscreen && (
            <button
              className={`button ${fullscreen ? 'is-active' : ''}`}
              onClick={toggleFullscreen}
              aria-pressed={fullscreen}
              title="Fullscreen (Shift+F)"
            >
              Fullscreen
            </button>
          )}
        </section>
      </nav>
    </div>
  );
};
