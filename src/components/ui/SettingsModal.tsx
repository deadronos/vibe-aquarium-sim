import { useEffect } from 'react';
import './SettingsModal.css';

type SettingsModalProps = {
  open: boolean;
  onClose: () => void;
  showDebugPanel: boolean;
  setShowDebugPanel: (next: boolean) => void;
};

export function SettingsModal({
  open,
  onClose,
  showDebugPanel,
  setShowDebugPanel,
}: SettingsModalProps) {
  useEffect(() => {
    if (!open) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="vibe-modal-overlay" role="presentation" onMouseDown={onClose}>
      <div
        className="vibe-modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vibe-settings-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="vibe-modal-header">
          <div id="vibe-settings-title" className="vibe-modal-title">
            Settings
          </div>
          <button type="button" className="vibe-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="vibe-modal-content">
          <label className="vibe-toggle">
            <input
              type="checkbox"
              checked={showDebugPanel}
              onChange={(e) => setShowDebugPanel(e.currentTarget.checked)}
            />
            <span className="vibe-toggle-label">Show debug panel</span>
          </label>
        </div>
      </div>
    </div>
  );
}
