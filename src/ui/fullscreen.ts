import { useSyncExternalStore } from 'react';

/** iPhone Safari and some embedded browsers have no element fullscreen. */
export const fullscreenSupported = () =>
  typeof document !== 'undefined' &&
  document.fullscreenEnabled === true &&
  typeof document.documentElement.requestFullscreen === 'function';

const subscribe = (onChange: () => void) => {
  document.addEventListener('fullscreenchange', onChange);
  return () => document.removeEventListener('fullscreenchange', onChange);
};

const isFullscreen = () => document.fullscreenElement !== null;

/** Follows `fullscreenchange`, so Esc or the browser's own controls keep the button honest. */
export const useFullscreen = () => useSyncExternalStore(subscribe, isFullscreen, () => false);

/** Must run inside a click or key press: browsers only allow fullscreen on user activation. */
export const toggleFullscreen = () => {
  if (!fullscreenSupported()) return;
  // A refused request (no user activation, or a permissions policy) leaves the page as it was.
  const request = document.fullscreenElement
    ? document.exitFullscreen()
    : document.documentElement.requestFullscreen({ navigationUI: 'hide' });
  void request.catch(() => {});
};
