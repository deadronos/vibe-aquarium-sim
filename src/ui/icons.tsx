import type { ReactNode } from 'react';

/** Line icons for the compact phone bar. Drawn inline: the HUD ships no image assets. */
const Icon = ({ children }: { children: ReactNode }) => (
  <svg
    className="hud__icon"
    viewBox="0 0 24 24"
    width="20"
    height="20"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.6"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
  >
    {children}
  </svg>
);

export const SofaIcon = () => (
  <Icon>
    <path d="M5 11V8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3" />
    <path d="M3 12.5a1.5 1.5 0 0 1 3 0V14h12v-1.5a1.5 1.5 0 0 1 3 0V17H3z" />
    <path d="M5 17v2M19 17v2" />
  </Icon>
);

export const TankIcon = () => (
  <Icon>
    <rect x="3" y="5" width="18" height="14" rx="1.5" />
    <path d="M3 9.5c3 1.5 6-1.5 9 0s6 1.5 9 0" />
  </Icon>
);

export const CloseUpIcon = () => (
  <Icon>
    <circle cx="10.5" cy="10.5" r="6" />
    <path d="M20 20l-5-5" />
  </Icon>
);

export const RoomIcon = () => (
  <Icon>
    <path d="M4 11l8-6 8 6v8H4z" />
    <path d="M10 19v-5h4v5" />
  </Icon>
);

export const FollowIcon = () => (
  <Icon>
    <path d="M3 12c3-4.5 8.5-5.5 12.5-2L20 7v10l-4.5-3C11.5 17.5 6 16.5 3 12z" />
    <circle cx="7.5" cy="11.5" r="0.6" fill="currentColor" />
  </Icon>
);

export const FeedIcon = () => (
  <Icon>
    <circle cx="8" cy="6" r="1.2" />
    <circle cx="14.5" cy="5" r="1.2" />
    <circle cx="11" cy="11" r="1.2" />
    <circle cx="16.5" cy="13" r="1.2" />
    <circle cx="7" cy="16" r="1.2" />
    <path d="M3 20h18" />
  </Icon>
);

export const SoundIcon = ({ on }: { on: boolean }) => (
  <Icon>
    <path d="M4 9h3l5-4v14l-5-4H4z" />
    {on ? (
      <path d="M16 9a4 4 0 0 1 0 6M18.5 6.5a7.5 7.5 0 0 1 0 11" />
    ) : (
      <path d="M16 9l5 6M21 9l-5 6" />
    )}
  </Icon>
);

export const AmbientIcon = () => (
  <Icon>
    <path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.5" />
    <path d="M20 4v4.5h-4.5" />
    <path d="M20 12a8 8 0 0 1-13.7 5.6L4 15.5" />
    <path d="M4 20v-4.5h4.5" />
  </Icon>
);

export const FullscreenIcon = ({ on }: { on: boolean }) => (
  <Icon>
    {on ? (
      <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" />
    ) : (
      <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
    )}
  </Icon>
);
