import { Sun, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Topbar({ theme, onToggle, city }) {
  const homeParams = new URLSearchParams({ tema: theme });
  if (city) homeParams.set('cidade', city);

  return (
    <header className="topbar">
      <Link to={`/?${homeParams}`} className="brand">
        <span className="brand-icon">🌤️</span>
        <span>ClimaNow</span>
      </Link>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        {/* Carries the current city across, so going back to the weather page
            from the rain monitor does not reset the selection. */}
        <Link className="chip" to={`/chuva/?${homeParams}`}>
          Monitor de Chuva
        </Link>
        <button type="button" className="theme-btn" onClick={onToggle} aria-label="Alternar tema">
          {theme === 'claro' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </div>
    </header>
  );
}
