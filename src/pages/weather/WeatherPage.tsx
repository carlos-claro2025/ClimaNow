import { useCallback, useEffect, useMemo, useState } from 'react';
import { CloudRain, Flame, LoaderCircle, RefreshCw, Search, Snowflake } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import Clock from '../../components/Clock';
import Topbar from '../../components/Topbar';
import InmetBar from '../../components/InmetBar';
import WarningModal from '../../components/WarningModal';
import {
  EMPTY_CEMADEN,
  MONITORED,
  POPULAR,
  fetchCemaden,
  fetchJson,
  forecastUrl,
  formatDate,
  formatValue,
  geocode,
  type CemadenData,
} from '../../lib/clima';
import { iconFor, labelFor } from '../../lib/icons';
import { useInmetAlerts } from '../../lib/useInmetAlerts';
import { useTheme } from '../../lib/useTheme';

interface WeatherData {
  place: string;
  temp: number | null;
  code: number | null;
  isDay: boolean;
  wind: number | null;
  humidity: number | null;
  pressure: number | null;
  latitude: number;
  longitude: number;
}

interface ForecastDay {
  date: string;
  code: number;
  max: number;
  min: number;
}

interface Place {
  name: string | null;
  temp: number | null;
}

const EMPTY_PLACE: Place = { name: null, temp: null };
const DEFAULT_CITY = 'Goiânia';
const MAX_POPULAR = 7;
// The defaults stay on the chips for the whole session; searching a city appends
// to them. Replacing the list with search history left a single chip after the
// first search, hiding São Paulo, Rio, Belo Horizonte and Brasília.
const MAX_TRACKED_CITIES = 20;

export default function WeatherPage() {
  const [params, setParams] = useSearchParams();
  const { theme, toggle } = useTheme();
  // The URL is the single source of truth for the city: one writer (selectCity),
  // one reader (the load effect below). Mirroring it into local state as well made
  // both sides write the other, so the page thrashed between two cities.
  const city = params.get('cidade') || DEFAULT_CITY;
  const [input, setInput] = useState(city);
  const { warnings, ticker, selectedWarning, setSelectedWarning, refresh: refreshInmet, openWarning } =
    useInmetAlerts();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [popular, setPopular] = useState<string[]>([...POPULAR]);
  const [comparison, setComparison] = useState<{ hot: Place; cold: Place }>({ hot: EMPTY_PLACE, cold: EMPTY_PLACE });
  const [cemadem, setCemadem] = useState<CemadenData & { error?: boolean }>(EMPTY_CEMADEN);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
  const [reloadToken, setReloadToken] = useState(0);
  const [searchCounts, setSearchCounts] = useState<Record<string, number>>(() => {
    try {
      return JSON.parse(localStorage.getItem('clima-search-counts') || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const ranked = Object.entries(searchCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name]) => name)
      .filter((name) => !POPULAR.includes(name as (typeof POPULAR)[number]));
    setPopular([...POPULAR, ...ranked].slice(0, MAX_POPULAR));
    // Capped so localStorage cannot grow without bound as cities are searched.
    const kept = Object.fromEntries(
      Object.entries(searchCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, MAX_TRACKED_CITIES),
    );
    localStorage.setItem('clima-search-counts', JSON.stringify(kept));
  }, [searchCounts]);

  const loadData = useCallback(
    async (name: string, signal?: AbortSignal) => {
      const query = (name || '').trim();
      if (!query) return;
      setLoading(true);
      setError('');
      try {
        const g = await geocode(query, signal);
        if (!g) throw new Error('notfound');
        const f = await fetchJson<{
          current?: { temperature_2m?: number; weather_code?: number; is_day?: number; wind_speed_10m?: number; relative_humidity_2m?: number; pressure_msl?: number };
          daily?: { time?: string[]; weather_code?: number[]; temperature_2m_max?: number[]; temperature_2m_min?: number[] };
        }>(
          forecastUrl(
            g.latitude,
            g.longitude,
            'forecast_days=3&current=temperature_2m,weather_code,is_day,wind_speed_10m,relative_humidity_2m,pressure_msl&daily=weather_code,temperature_2m_max,temperature_2m_min',
          ),
          signal,
        );
        if (signal?.aborted) return;
        setWeather({
          place: `${g.name}, ${g.admin1 || g.country || 'Brasil'}`,
          temp: f.current?.temperature_2m,
          code: f.current?.weather_code,
          isDay: !!f.current?.is_day,
          wind: f.current?.wind_speed_10m,
          humidity: f.current?.relative_humidity_2m,
          pressure: Number.isFinite(f.current?.pressure_msl) ? Math.round(f.current.pressure_msl) : null,
          latitude: g.latitude,
          longitude: g.longitude,
        });
        setForecast(
          (f.daily?.time || []).slice(0, 3).map((d, idx) => ({
            date: d,
            code: f.daily!.weather_code![idx],
            max: f.daily!.temperature_2m_max![idx],
            min: f.daily!.temperature_2m_min![idx],
          })),
        );
        setLastUpdate(new Date());
      } catch (e) {
        if (signal?.aborted) return;
        setError(e instanceof Error && e.message === 'notfound' ? 'Cidade não encontrada.' : 'Falha ao consultar clima.');
      } finally {
        if (!signal?.aborted) setLoading(false);
      }
    },
    [],
  );

  const refreshCemaden = useCallback(async (signal?: AbortSignal) => {
    const [cemademResult] = await Promise.allSettled([fetchCemaden(signal)]);
    if (signal?.aborted) return;
    setCemadem(cemademResult.status === 'fulfilled' ? cemademResult.value : { ...EMPTY_CEMADEN, error: true });
  }, []);

  const loadComparison = useCallback(async (signal?: AbortSignal) => {
    try {
      const temps = await Promise.all(
        MONITORED.map(async (name) => {
          const g = await geocode(name, signal);
          if (!g) return null;
          const f = await fetchJson<{ current?: { temperature_2m?: number } }>(forecastUrl(g.latitude, g.longitude, 'current=temperature_2m'), signal);
          const temp = f.current?.temperature_2m;
          return Number.isFinite(temp) ? { name, temp } : null;
        }),
      );
      if (signal?.aborted) return;
      const valid = temps.filter((t): t is Place => t !== null).sort((a, b) => b.temp! - a.temp!);
      setComparison({ hot: valid[0] || EMPTY_PLACE, cold: valid[valid.length - 1] || EMPTY_PLACE });
    } catch {
      if (signal?.aborted) return;
      setComparison({ hot: EMPTY_PLACE, cold: EMPTY_PLACE });
    }
  }, []);

  // Alerts and the hot/cold comparison are global, not per-city, so they load once.
  useEffect(() => {
    const controller = new AbortController();
    const { signal } = controller;
    (async () => {
      await refreshCemaden(signal);
      await loadComparison(signal);
    })();
    return () => controller.abort();
  }, [refreshCemaden, loadComparison]);

  // One load per city. Aborting the previous request means a slow reply for the
  // old city can never land on top of the new one.
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      await loadData(city, controller.signal);
    })();
    return () => controller.abort();
  }, [city, loadData, reloadToken]);

  const selectCity = useCallback(
    (name: string) => {
      const query = (name || '').trim();
      if (!query) return;
      setInput(query);
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('cidade', query);
          return next;
        },
        { replace: true },
      );
      // Counted only on user-initiated searches, so StrictMode's double mount
      // no longer inflates the ranking.
      setSearchCounts((prev) => ({ ...prev, [query]: (prev[query] || 0) + 1 }));
    },
    [setParams],
  );

  const handleRefresh = useCallback(async () => {
    setReloadToken((n) => n + 1);
    refreshInmet();
  }, [refreshInmet]);

  const status = useMemo(() => (weather ? labelFor(weather.code ?? 0) : ''), [weather]);
  // Only blank the readings on the very first load. Blanking them on every
  // refresh is what made the temperature flicker during a city switch.
  const pending = loading && !weather;
  // Windy pinpoints the selected city. It used to carry a hardcoded Goiânia
  // marker, so the radar of São Paulo or Recife opened Goiânia.
  const radarUrl = useMemo(() => {
    const { latitude, longitude } = weather || {};
    const marker =
      Number.isFinite(latitude) && Number.isFinite(longitude)
        ? `&marker=location:${latitude.toFixed(4)},${longitude.toFixed(4)},10`
        : '';
    return `https://www.windy.com/-Rain-radar?metricRad=-mm&metricTemp=C&metricWind=km/h&overlay=radar&level=surface${marker}`;
  }, [weather]);

  return (
    <main className="app-shell">
      <Topbar theme={theme} onToggle={toggle} city={city} />
      <section className="card">
        <InmetBar warnings={warnings} ticker={ticker} onOpen={openWarning} />
        <button
          type="button"
          className="chip"
          onClick={handleRefresh}
          style={{ marginBottom: 12 }}
          title="Atualizar dados"
          aria-label="Atualizar dados"
        >
          <RefreshCw size={14} />
        </button>
        {lastUpdate && (
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>
            Última atualização:{' '}
            {lastUpdate.toLocaleString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        )}
        <div className="header-row">
          <div>
            <div className="eyebrow">Previsão do tempo</div>
            <h1 className="title">{weather?.place || 'Goiânia, Goiás — Brasil'}</h1>
          </div>
          <a className="link link-radar" href={radarUrl} target="_blank" rel="noopener noreferrer">
            <CloudRain size={14} />
            Ver radar de chuva
          </a>
        </div>
        {comparison.hot?.name || comparison.cold?.name ? (
          <div style={{ display: 'flex', gap: 12, margin: '10px 0 6px', flexWrap: 'wrap' }}>
            {comparison.hot?.name && (
              <button className="chip chip-hot" onClick={() => selectCity(comparison.hot.name!)}>
                <Flame size={14} /> Mais quente: {comparison.hot.name} — {formatValue(comparison.hot.temp ?? 0, '°C')}
              </button>
            )}
            {comparison.cold?.name && (
              <button className="chip chip-cold" onClick={() => selectCity(comparison.cold.name!)}>
                <Snowflake size={14} /> Mais frio: {comparison.cold.name} — {formatValue(comparison.cold.temp ?? 0, '°C')}
              </button>
            )}
          </div>
        ) : null}
        <div className="search-row">
          <label htmlFor="city-search" className="sr-only">Buscar cidade</label>
          <input
            id="city-search"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && selectCity(input)}
            placeholder="Digite uma cidade"
          />
          <button onClick={() => selectCity(input)}>
            <Search size={16} /> Buscar
          </button>
        </div>
        <div className="chips">
          {popular.map((c) => (
            <button key={c} className={`chip ${c === city ? 'active' : ''}`} onClick={() => selectCity(c)}>
              {c}
            </button>
          ))}
        </div>
        <div className="current">
          <div className="icon-box">
            {loading ? <LoaderCircle className="spin" /> : iconFor(weather?.code ?? 0, weather?.isDay ?? true)}
          </div>
          <div>
            <div className="temp">{pending ? '--°C' : formatValue(weather?.temp ?? 0, '°C')}</div>
            <div>{pending ? '--' : status}</div>
          </div>
        </div>
        <div className="metrics">
          <div className="metric">
            <div className="label">Vento</div>
            <div className="value">{pending ? '-- km/h' : formatValue(weather?.wind ?? 0, 'km/h')}</div>
          </div>
          <div className="metric">
            <div className="label">Umidade</div>
            <div className="value">{pending ? '-- %' : formatValue(weather?.humidity ?? 0, '%', 0)}</div>
          </div>
          <div className="metric">
            <div className="label">Pressão</div>
            <div className="value">{pending ? '-- hPa' : formatValue(weather?.pressure ?? 0, 'hPa', 0)}</div>
          </div>
          <div className="metric">
            <div className="label">Relógio</div>
            <div className="value">
              <Clock />
            </div>
          </div>
        </div>
        <div className="forecast">
          <div className="eyebrow" style={{ color: 'var(--primary)', marginBottom: 10 }}>
            Próximos 3 dias
          </div>
          <div className="forecast-grid">
            {forecast.map((d) => (
              <div className="forecast-card" key={d.date}>
                <div>{formatDate(new Date(`${d.date}T00:00:00`))}</div>
                <div style={{ margin: '10px 0' }}>{iconFor(d.code, true)}</div>
                <div>{labelFor(d.code)}</div>
                <div>Máx: {formatValue(d.max, '°C')}</div>
                <div>Min: {formatValue(d.min, '°C')}</div>
              </div>
            ))}
          </div>
        </div>
        {error ? <div className="error">{error}</div> : null}

        <div className="cemadem-stats">
          <div className="cemadem-title">⚠️ Alertas CEMADEN</div>
          <div className="cemadem-counts">
            <div className="cemade-card cemade-danger">
              <div className="cemade-num">{cemadem.muitoAlto}</div>
              <div className="cemade-label">Muito Alto</div>
            </div>
            <div className="cemade-card cemade-warning">
              <div className="cemade-num">{cemadem.alto}</div>
              <div className="cemade-label">Alto</div>
            </div>
            <div className="cemade-card cemade-moderado">
              <div className="cemade-num">{cemadem.moderado}</div>
              <div className="cemade-label">Moderado</div>
            </div>
            <div className="cemade-card cemade-geo">
              <div className="cemade-num">{cemadem.geo}</div>
              <div className="cemade-label">Mov. Massa</div>
            </div>
            <div className="cemade-card cemade-hidro">
              <div className="cemade-num">{cemadem.hidro}</div>
              <div className="cemade-label">Risco Hidro.</div>
            </div>
          </div>
          {cemadem.error && (
            <div style={{ color: '#fbbf24', fontSize: 12, marginTop: 8, textAlign: 'center' }}>
              Não foi possível carregar dados do CEMADEN
            </div>
          )}
          {cemadem.atualizado && !cemadem.error && (
            <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 6, textAlign: 'center' }}>
              Atualizado: {cemadem.atualizado}
            </div>
          )}
        </div>
      </section>
      <WarningModal warning={selectedWarning} onClose={() => setSelectedWarning(null)} />
    </main>
  );
}