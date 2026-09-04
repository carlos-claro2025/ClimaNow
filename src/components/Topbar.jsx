import { Sun, Moon } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Topbar({ theme, onToggle }) {
  return (
    <header className="topbar">
      <Link to="/" className="brand">
        <span className="brand-icon">🌤️</span>
        <span>ClimaNow</span>
      </Link>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <Link className="chip" to="/chuva">
          Monitor de Chuva
        </Link>
        <button
          type="button"
          className="theme-btn"
          onClick={onToggle}
          aria-label="Alternar tema"
        >
          {theme === 'claro' ? <Moon size={18} /> : <Sun size={18} />}
        </button>
      </div>
    </header>
  );
}
