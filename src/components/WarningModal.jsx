import { safeExternalUrl } from '../lib/clima';

// The INMET detail modal, identical in WeatherPage and RainPage before this
// extraction. Takes the selected (normalized) warning plus the state that
// opens and closes it, so both pages can reuse one source of truth.
export default function WarningModal({ warning, onClose }) {
  if (!warning) return null;

  return (
    <div className="warning-modal" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="warning-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="header-row">
          <strong>{warning.title || 'Detalhes do aviso'}</strong>
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
