import type { ReactNode } from 'react';

type HudSectionProps = {
  title: string;
  open: boolean;
  onToggle: (open: boolean) => void;
  titleClassName?: string;
  children: ReactNode;
};

export const HudSection = ({
  title,
  open,
  onToggle,
  titleClassName = 'hud-section-title',
  children,
}: HudSectionProps) => (
  <details
    className="hud-section"
    open={open}
    onToggle={(e) => onToggle((e.currentTarget as HTMLDetailsElement).open)}
  >
    <summary className="hud-summary">
      <span className={titleClassName}>{title}</span>
    </summary>
    <div className="hud-section-content">{children}</div>
  </details>
);
