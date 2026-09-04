import { AlertTriangle } from 'lucide-react';

export default function InmetBar({ warnings, ticker, onOpen }) {
  const clean = (text) =>
    String(text).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();

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
          {displayItems.map((item, index) => (
            <span key={`${index}-${item}`} className="notice-ticker-item">
              {clean(item)}
            </span>
          ))}
        </span>
      </span>
    </button>
  );
}
