import { useState, type ReactNode } from 'react';
import { readBoolFromStorage, writeBoolToStorage } from '../../utils/storageUtils';

type HudSectionProps = {
  title: string;
  storageKey: string;
  defaultOpen?: boolean;
  titleClassName?: string;
  children: ReactNode;
};

export const HudSection = ({
  title,
  storageKey,
  defaultOpen = true,
  titleClassName = 'hud-section-title',
  children,
}: HudSectionProps) => {
  const [open, setOpen] = useState(() => readBoolFromStorage(storageKey, defaultOpen));

  return (
    <details
      className="hud-section"
      open={open}
      onToggle={(e) => {
        const next = (e.currentTarget as HTMLDetailsElement).open;
        setOpen(next);
        writeBoolToStorage(storageKey, next);
      }}
    >
      <summary className="hud-summary">
        <span className={titleClassName}>{title}</span>
      </summary>
      <div className="hud-section-content">{children}</div>
    </details>
  );
};
