import { useEffect } from 'react';
import type { DecorationType } from '../../domain/types';

type UseHudShortcutsParams = {
  shortcutsDisabled: boolean;
  isPlacingDecoration: boolean;
  selectedDecorationType: DecorationType;
  startPlacingDecoration: (type: DecorationType) => void;
  stopPlacingDecoration: () => void;
  handleDecorationClick: (type: DecorationType) => void;
  handleFeed: () => void;
};

export const useHudShortcuts = ({
  shortcutsDisabled,
  isPlacingDecoration,
  selectedDecorationType,
  startPlacingDecoration,
  stopPlacingDecoration,
  handleDecorationClick,
  handleFeed,
}: UseHudShortcutsParams) => {
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
};
