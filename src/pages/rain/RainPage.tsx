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

interface RainItem {
  name: string;
  temp: number;
  precipitation: number;
  cloudCover: number;
  confidence: 'alta' | 'média' | 'baixa';
}

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
  const [items, setItems] = useState<RainItem[]>([]);
  const [message, setMessage] = useState('Atualizando...');

  const refresh = useCallback(async (signal?: AbortSignal) => {
    try {
      // Every city is fetched concurrently. The previous serial for-of issued 20
      // round trips one after another, so /chuva took as long as the slowest
      // city instead of the sum of all of them. A city that fails is dropped on
      // its own instead of blanking the whole list.
      const results = await Promise.all(
        MONITORED.map(async (name): Promise<RainItem | null> => {
          try {
            const g = await geocode(name, signal);
            if (!g) return null;
            const f = await fetchJson<{
              current?: {
                weather_code?: number;
                temperature_2m?: number;
                precipitation_1h?: number;
                cloud_cover?: number;
              };
            }>(
              forecastUrl(
                g.latitude,
                g.longitude,
                'current=weather_code,temperature_2m,precipitation_1h,cloud_cover',
              ),
              signal,
            );
            const current = f.current;
            if (!current) return null;

            const weatherCode = current.weather_code ?? 0;
            const precipitation = current.precipitation_1h ?? 0;
            const cloudCover = current.cloud_cover ?? 0;
            const temp = current.temperature_2m ?? 0;

            // Determine if it's really raining using multiple signals:
            // 1. Weather code indicates precipitation
            // 2. Actual precipitation in the last hour > 0
            // 3. Cloud cover is high (supports rain)
            const codeSaysRain = isRaining(weatherCode);
            const hasPrecipitation = precipitation > 0;
            const cloudy = cloudCover >= 50;

            // Confidence levels:
            // - Alta: weather code says rain AND actual precipitation > 0
            // - Média: weather code says rain OR (precipitation > 0 AND cloudy)
            // - Baixa: only one signal indicates rain
            let confidence: 'alta' | 'média' | 'baixa' | null = null;
            if (codeSaysRain && hasPrecipitation) {
              confidence = 'alta';
            } else if (codeSaysRain || (hasPrecipitation && cloudy)) {
              confidence = 'média';
            } else if (codeSaysRain || hasPrecipitation) {
              confidence = 'baixa';
            }

            if (!confidence) return null;

            return { name, temp, precipitation, cloudCover, confidence };
          } catch (err) {
            if (err instanceof Error && err.name === 'AbortError') throw err;
            return null;
          }
        }),
      );
      if (signal?.aborted) return;
      const raining = results.filter((r): r is RainItem => r !== null);
      // Sort by confidence: alta first, then média, then baixa
      const confidenceOrder = { alta: 0, média: 1, baixa: 2 };
      raining.sort((a, b) => confidenceOrder[a.confidence] - confidenceOrder[b.confidence]);
      setItems(raining);
      const highConfidence = raining.filter((r) => r.confidence === 'alta').length;
      setMessage(
        raining.length
          ? `${raining.length} cidade(s) com chuva agora (${highConfidence} com confirmação alta).`
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
              <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                {item.precipitation > 0
                  ? `${item.precipitation.toFixed(1)} mm/h`
                  : 'Sem medição'}
                {' · '}
                {item.cloudCover}% nuvens
              </div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  marginTop: 6,
                  color:
                    item.confidence === 'alta'
                      ? '#22c55e'
                      : item.confidence === 'média'
                        ? '#eab308'
                        : '#94a3b8',
                }}
              >
                Confiança: {item.confidence}
              </div>
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