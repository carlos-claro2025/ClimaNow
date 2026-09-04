import { AlertTriangle } from 'lucide-react';

export default function InmetBar({ warnings, ticker, onOpen }) {
  const displayItems = ticker.length ? ticker : warnings;

  if (displayItems.length === 0) return null;

  // Format warning string items (backward compatibility)
  const formatWarning = (item) => {
    if (typeof item === 'string') {
      const parts = item.split(' — ');
      return { title: parts[0] || '', description: parts.slice(1).join(' — ') || '', link: '' };
    }
    return item;
  };

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
            const { title, description, link } = formatWarning(item);
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
