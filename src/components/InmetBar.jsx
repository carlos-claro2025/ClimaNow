import { AlertTriangle } from 'lucide-react';
import { normalizeWarning } from '../lib/clima';

export default function InmetBar({ warnings, ticker, onOpen }) {
  const displayItems = ticker.length ? ticker : warnings;

  if (displayItems.length === 0) return null;

  return (
    <button
      type="button"
      className="notice-bar inmet-barra"
      onClick={onOpen}
      aria-label="Avisos meteorológicos do INMET"
    >
      <AlertTriangle size={16} color="var(--primary)" />
      <strong>INMET</strong>
      <span className="notice-ticker">
        <span className="notice-ticker-track">
          {displayItems.map((item, index) => {
            const { title, description, link } = normalizeWarning(item);
            const displayText = description ? `${title}: ${description}` : title;
            return (
              <span key={`${index}-${link || title}`} className="notice-ticker-item">
                {displayText}
              </span>
            );
          })}
        </span>
      </span>
    </button>
  );
}
