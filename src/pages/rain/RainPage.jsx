import { useEffect, useState } from 'react';
import { CloudRain, RefreshCw, Search } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Topbar from '../../components/Topbar';
import InmetBar from '../../components/InmetBar';

const MONITORED = ['Goiânia', 'São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Porto Alegre', 'Brasília', 'Salvador', 'Fortaleza', 'Recife'];
const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('network');
  return res.json();
}

export default function RainPage() {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const [theme, setTheme] = useState(params.get('tema') === 'claro' ? 'claro' : 'escuro');
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState('Atualizando...');
  const [selectedWarning, setSelectedWarning] = useState(null);
  const [ticker, setTicker] = useState([]);

  useEffect(() => {
    loadWarnings();
    refresh();
    loadTicker();
  }, []);

  async function loadWarnings() {
    try {
      const data = await fetchJson('https://apiprevmet3.inmet.gov.br/avisos/ativos');
      const list = Array.isArray(data) ? data : Object.values(data || {});
      const mapped = list.slice(0, 3).map((x) => {
        const title = x.descricao || x.titulo || 'Aviso meteorológico';
        const level = x.urgencia || x.severidade || x.nivel || x.description || '';
        const valid = x.validade || x.valid_until || x.fim || x.fim_vigencia || '';
        return [title, level, valid].filter(Boolean).join(' — ');
      });
      setWarnings(mapped);
    } catch {
      setWarnings(['Sem conexão com o INMET']);
    }
  }

  async function loadTicker() {
    try {
      const res = await fetch('https://apiprevmet3.inmet.gov.br/avisos/rss');
      if (!res.ok) throw new Error('network');
      const text = await res.text();
      const doc = new DOMParser().parseFromString(text, 'text/xml');
      const items = Array.from(doc.querySelectorAll('item')).slice(0, 8).map((item) => {
        const title = item.querySelector('title')?.textContent?.trim() || 'Aviso meteorológico';
        const desc = item.querySelector('description')?.textContent?.trim() || '';
        return [title, desc].filter(Boolean).join(' — ');
      });
      setTicker(items);
    } catch {
      setTicker([]);
    }
  }

  async function handleRefreshWarnings() {
    await loadWarnings();
  }

  function handleOpenWarnings() {
    if (warnings.length > 0) {
      setSelectedWarning(warnings[0]);
      return;
    }
    window.open('https://avisos.inmet.gov.br/', '_blank', 'noopener,noreferrer');
  }

  async function refresh() {
    setLoading(true);
    try {
      const result = [];
      for (const name of MONITORED) {
        const geo = await fetchJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=pt&format=json`);
        const g = geo.results && geo.results[0];
        if (!g) continue;
        const forecast = await fetchJson(`https://api.open-meteo.com/v1/forecast?latitude=${g.latitude}&longitude=${g.longitude}&timezone=auto&current=weather_code,temperature_2m`);
        if (RAIN_CODES.has(forecast.current.weather_code)) {
          result.push({ name, temp: forecast.current.temperature_2m });
        }
      }
      setItems(result);
      setMessage(result.length ? `${result.length} cidade(s) com chuva agora.` : 'Nenhuma cidade da lista está com chuva neste momento.');
    } catch {
      setItems([]);
      setMessage('Falha ao atualizar a lista.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="app-shell">
      <Topbar theme={theme} onToggle={() => setTheme(theme === 'claro' ? 'escuro' : 'claro')} />
      <section className="card">
        <InmetBar warnings={warnings} ticker={ticker} onOpen={handleOpenWarnings} />
        <button type="button" className="chip" onClick={handleRefreshWarnings} style={{ marginBottom: 12 }}>
          <RefreshCw size={14} /> Atualizar avisos do INMET
        </button>
        <div className="header-row">
          <div>
            <div className="eyebrow">Monitor de chuva</div>
            <h1 className="title">Cidades com chuva agora</h1>
          </div>
          <Link className="link" to={`/?tema=${theme}`}>Voltar ao clima</Link>
        </div>
        <button className="search-row full-btn" onClick={refresh} style={{ width: '100%' }}>
          <Search size={16} /> {loading ? 'Atualizando...' : 'Atualizar lista'}
        </button>
        <div style={{ marginTop: 16 }}>{message}</div>
        <div className="rain-grid">
          {items.map((item) => (
            <div key={item.name} className="rain-card">
              <CloudRain size={22} />
              <h3>{item.name}</h3>
              <div>Chovendo agora</div>
              <div>{item.temp.toFixed(1)} °C</div>
              <button
                className="chip"
                onClick={() => navigate(`/?cidade=${encodeURIComponent(item.name)}&tema=${theme}`)}
              >
                Ver previsão desta cidade
              </button>
            </div>
          ))}
        </div>
      </section>
      {selectedWarning ? (
        <div className="warning-modal" role="dialog" aria-modal="true" onClick={() => setSelectedWarning(null)}>
          <div className="warning-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="header-row">
              <strong>Detalhes do aviso</strong>
              <button className="chip" type="button" onClick={() => setSelectedWarning(null)}>Fechar</button>
            </div>
            <p style={{ marginTop: 12 }}>{selectedWarning}</p>
            <button
              className="chip"
              type="button"
              onClick={() => window.open('https://avisos.inmet.gov.br/', '_blank', 'noopener,noreferrer')}
            >
              Abrir no INMET
            </button>
          </div>
        </div>
      ) : null}
    </main>
  );
}
