import { useEffect, useLayoutEffect, useRef } from 'react';
import './SettingsModal.css';

type SettingsModalProps = {
  open: boolean;
  onClose: () => void;
  showDebugPanel: boolean;
  setShowDebugPanel: (next: boolean) => void;
  returnFocusRef?: React.RefObject<HTMLButtonElement | null>;
};

const FOCUSABLE_SELECTOR =
  'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

export function SettingsModal({
  open,
  onClose,
  showDebugPanel,
  setShowDebugPanel,
  returnFocusRef,
}: SettingsModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useLayoutEffect(() => {
    if (!open) return;

    const explicitOpener = returnFocusRef?.current;
    const activeElement = explicitOpener ?? document.activeElement;
    openerRef.current = activeElement instanceof HTMLElement ? activeElement : null;

    closeButtonRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onCloseRef.current();
        return;
      }

      if (e.key !== 'Tab') return;

      const modal = modalRef.current;
      if (!modal) return;

      const focusable = Array.from(modal.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)).filter(
        (element) => !element.hasAttribute('disabled') && element.tabIndex >= 0
      );
      if (focusable.length === 0) return;

      const current = document.activeElement;
      const currentIndex = focusable.indexOf(current as HTMLElement);
      const nextIndex =
        currentIndex < 0
          ? e.shiftKey
            ? focusable.length - 1
            : 0
          : (currentIndex + (e.shiftKey ? -1 : 1) + focusable.length) % focusable.length;

      e.preventDefault();
      focusable[nextIndex].focus();
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);

      const opener = openerRef.current;
      if (opener?.isConnected) opener.focus();
      openerRef.current = null;
    };
  }, [open, returnFocusRef]);

  if (!open) return null;

  return (
    <div
      className="vibe-modal-overlay"
      role="presentation"
      onMouseDown={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div
        ref={modalRef}
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
          <button
            ref={closeButtonRef}
            type="button"
            className="vibe-modal-close"
            onClick={onClose}
            aria-label="Close"
          >
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
