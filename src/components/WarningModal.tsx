import { useEffect, useRef } from 'react';
import { safeExternalUrl, type Warning } from '../lib/clima';

interface WarningModalProps {
  warning: Warning | null;
  onClose: () => void;
}

// The INMET detail modal, identical in WeatherPage and RainPage before this
// extraction. Takes the selected (normalized) warning plus the state that
// opens and closes it, so both pages can reuse one source of truth.
export default function WarningModal({ warning, onClose }: WarningModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  // Close on Escape and trap focus inside the modal while it's open.
  useEffect(() => {
    if (!warning) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'Tab' && cardRef.current) {
        const focusable = cardRef.current.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
        if (focusable.length === 0) return;
        const first = focusable[0] as HTMLElement;
        const last = focusable[focusable.length - 1] as HTMLElement;
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKey);
    // Focus the first button when the modal opens.
    const timer = setTimeout(() => {
      const first = cardRef.current?.querySelector('button');
      first?.focus();
    }, 0);
    return () => {
      document.removeEventListener('keydown', handleKey);
      clearTimeout(timer);
    };
  }, [warning, onClose]);

  if (!warning) return null;

  return (
    <div className="warning-modal" role="dialog" aria-modal="true" aria-labelledby="warning-modal-title" onClick={onClose}>
      <div className="warning-modal-card" ref={cardRef} onClick={(e) => e.stopPropagation()}>
        <div className="header-row">
          <strong id="warning-modal-title">{warning.title || 'Detalhes do aviso'}</strong>
          <button className="chip" type="button" onClick={onClose}>
            Fechar
          </button>
        </div>
        {warning.description && (
          <p style={{ marginTop: 12, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{warning.description}</p>
        )}
        <button
          className="chip"
          type="button"
          onClick={() => window.open(safeExternalUrl(warning.link), '_blank', 'noopener,noreferrer')}
        >
          Abrir no INMET
        </button>
      </div>
    </div>
  );
}