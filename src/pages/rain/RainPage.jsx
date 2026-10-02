import { useCallback, useEffect, useState } from 'react';
import { CloudRain, RefreshCw, Search } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import Topbar from '../../components/Topbar';
import InmetBar from '../../components/InmetBar';
import WarningModal from '../../components/WarningModal';
import {
  MONITORED,
  fetchJson,
  forecastUrl,
  formatValue,
  geocode,
  isRaining,
} from '../../lib/clima';
import { useInmetAlerts } from '../../lib/useInmetAlerts';
import { useTheme } from '../../lib/useTheme';

export default function RainPage() {
  const { theme, toggle } = useTheme();
  // Read-only: this page never selects a city, it only forwards the one the
  // visitor arrived with so the Topbar and the back link keep it.
  const [params] = useSearchParams();
  const city = params.get('cidade') || '';
  const backParams = new URLSearchParams({ tema: theme });
  if (city) backParams.set('cidade', city);
  const { warnings, ticker, selectedWarning, setSelectedWarning, refresh: refreshInmet, openWarning } =
    useInmetAlerts();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState([]);
  const [message, setMessage] = useState('Atualizando...');

  const refresh = useCallback(async (signal) => {
    try {
      // Every city is fetched concurrently. The previous serial for-of issued 20
      // round trips one after another, so /chuva took as long as the slowest
      // city instead of the sum of all of them. A city that fails is dropped on
      // its own instead of blanking the whole list.
      const results = await Promise.all(
        MONITORED.map(async (name) => {
          try {
            const g = await geocode(name, signal);
            if (!g) return null;
            const f = await fetchJson(forecastUrl(g.latitude, g.longitude, 'current=weather_code,temperature_2m'), signal);
            return isRaining(f.current?.weather_code) ? { name, temp: f.current.temperature_2m } : null;
          } catch (err) {
            if (err.name === 'AbortError') throw err;
            return null;
          }
        }),
      );
      if (signal?.aborted) return;
      const raining = results.filter(Boolean);
      setItems(raining);
      setMessage(
        raining.length
          ? `${raining.length} cidade(s) com chuva agora.`
          : 'Nenhuma cidade da lista está com chuva neste momento.',
      );
    } catch {
      if (signal?.aborted) return;
      setItems([]);
      setMessage('Falha ao atualizar a lista.');
    } finally {
      if (!signal?.aborted) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    // Detached so the effect body itself stays synchronous.
    (async () => {
      await refresh(signal);
    })();
    return () => controller.abort();
  }, [refresh]);

  const handleRefreshList = useCallback(() => {
    setLoading(true);
    refresh();
  }, [refresh]);

  return (
    <main className="app-shell">
      <Topbar theme={theme} onToggle={toggle} city={city} />
      <section className="card">
        <InmetBar warnings={warnings} ticker={ticker} onOpen={openWarning} />
        <button
          type="button"
          className="chip"
          onClick={refreshInmet}
          style={{ marginBottom: 12 }}
          title="Atualizar avisos do INMET"
          aria-label="Atualizar avisos do INMET"
        >
          <RefreshCw size={14} />
        </button>
        <div className="header-row">
          <div>
            <div className="eyebrow">Monitor de chuva</div>
            <h1 className="title">Cidades com chuva agora</h1>
          </div>
          <Link className="link" to={`/?${backParams}`}>
            Voltar ao clima
          </Link>
        </div>
        <button className="search-row full-btn" onClick={handleRefreshList} style={{ width: '100%' }}>
          <Search size={16} /> {loading ? 'Atualizando...' : 'Atualizar lista'}
        </button>
        <div style={{ marginTop: 16 }}>{message}</div>
        <div className="rain-grid">
          {items.map((item) => (
            <div key={item.name} className="rain-card">
              <CloudRain size={22} />
              <h3>{item.name}</h3>
              <div>Chovendo agora</div>
              <div>{formatValue(item.temp, '°C')}</div>
              <Link className="chip" to={`/?cidade=${encodeURIComponent(item.name)}&tema=${theme}`}>
                Ver previsão desta cidade
              </Link>
            </div>
          ))}
        </div>
      </section>
      <WarningModal warning={selectedWarning} onClose={() => setSelectedWarning(null)} />
    </main>
  );
}
