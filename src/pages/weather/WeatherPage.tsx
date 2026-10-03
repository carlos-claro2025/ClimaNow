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
  formatHour,
  isNightHour,
  forecastUrl,
  formatDate,
  formatValue,
  geocode,
  uvLabel,
  weatherQuery,
  windDirectionLabel,
  type CemadenData,
  type WeatherResponse,
} from '../../lib/clima';
import { iconFor, labelFor } from '../../lib/icons';
import { useInmetAlerts } from '../../lib/useInmetAlerts';
import { useTheme } from '../../lib/useTheme';

interface WeatherData {
  place: string;
  temp: number | null;
  feelsLike: number | null;
  code: number | null;
  isDay: boolean;
  wind: number | null;
  windDirection: number | null;
  gusts: number | null;
  humidity: number | null;
  pressure: number | null;
  cloudCover: number | null;
  precipitation: number | null;
  latitude: number;
  longitude: number;
}

interface ForecastDay {
  date: string;
  code: number;
  max: number;
  min: number;
  rainChance: number | null;
  uv: number | null;
}

interface HourPoint {
  time: string;
  temp: number | null;
  rainChance: number | null;
  code: number | null;
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
const AUTO_REFRESH_MS = 10 * 60 * 1000;

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
    const [hourly, setHourly] = useState<HourPoint[]>([]);
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
                // Single request for current + 24h + 7d. `forecast_hours` is relative to
                // the current hour, so the strip always starts at "now" in the city's
                // own timezone without any client-side slicing.
                const f = await fetchJson<WeatherResponse>(
                  forecastUrl(g.latitude, g.longitude, weatherQuery()),
                  signal,
                );
                if (signal?.aborted) return;
                const current = f.current || {};
                setWeather({
                  place: `${g.name}, ${g.admin1 || g.country || 'Brasil'}`,
                                  temp: current.temperature_2m ?? null,
                                  feelsLike: current.apparent_temperature ?? null,
                                  code: current.weather_code ?? null,
                  isDay: !!current.is_day,
                                  wind: current.wind_speed_10m ?? null,
                                  windDirection: current.wind_direction_10m ?? null,
                                  gusts: current.wind_gusts_10m ?? null,
                                  humidity: current.relative_humidity_2m ?? null,
                                  pressure: Number.isFinite(current.pressure_msl) ? Math.round(current.pressure_msl!) : null,
                                  cloudCover: current.cloud_cover ?? null,
                                  precipitation: current.precipitation ?? null,
                  latitude: g.latitude,
                  longitude: g.longitude,
                });

                const daily = f.daily || {};
                setForecast(
                  (daily.time || []).slice(0, 7).map((date, idx) => ({
                    date,
                    code: daily.weather_code?.[idx] ?? 0,
                    max: daily.temperature_2m_max?.[idx] ?? 0,
                    min: daily.temperature_2m_min?.[idx] ?? 0,
                    rainChance: daily.precipitation_probability_max?.[idx] ?? null,
                    uv: daily.uv_index_max?.[idx] ?? null,
                  })),
                );

                const hours = f.hourly || {};
                setHourly(
                  (hours.time || []).map((time, idx) => ({
                    time,
                    temp: hours.temperature_2m?.[idx] ?? null,
                    rainChance: hours.precipitation_probability?.[idx] ?? null,
                    code: hours.weather_code?.[idx] ?? null,
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
          MONITORED.map(async (name): Promise<Place | null> => {
          const g = await geocode(name, signal);
          if (!g) return null;
          const f = await fetchJson<{ current?: { temperature_2m?: number } }>(forecastUrl(g.latitude, g.longitude, 'current=temperature_2m'), signal);
          const temp = f.current?.temperature_2m;
                    return typeof temp === 'number' ? { name, temp } : null;
        }),
      );
      if (signal?.aborted) return;
        const valid = temps.filter((t): t is Place => t !== null).sort((a, b) => (b.temp ?? 0) - (a.temp ?? 0));
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

    // Open-Meteo publishes a new model run roughly every 15 minutes. Polling at 10
    // catches the update without hammering the API, and a stale reading is worse
    // than a slightly slower page — the whole point is that the numbers on screen
    // match what a commercial app would show.
    useEffect(() => {
      const timer = setInterval(() => setReloadToken((n) => n + 1), AUTO_REFRESH_MS);
      return () => clearInterval(timer);
    }, []);

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
      if (!weather) {
        return 'https://www.windy.com/-Rain-radar?metricRad=-mm&metricTemp=C&metricWind=km/h&overlay=radar&level=surface';
      }
      const { latitude, longitude } = weather;
    // Zoom level 10 gives a good city-level view; 8 is regional, 12 is street-level.
    const zoom = 10;
    return `https://www.windy.com/-Rain-radar?lat=${latitude.toFixed(4)}&lon=${longitude.toFixed(4)}&zoom=${zoom}&metricRad=-mm&metricTemp=C&metricWind=km/h&overlay=radar&level=surface`;
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
                    {!pending && weather?.feelsLike != null && (
                      <div className="feels-like">Sensação {formatValue(weather.feelsLike, '°C')}</div>
                    )}
                  </div>
                </div>
                <div className="metrics">
                  <div className="metric">
                    <div className="label">Vento</div>
                    <div className="value">{pending ? '-- km/h' : formatValue(weather?.wind ?? 0, 'km/h')}</div>
                    {!pending && weather?.windDirection != null && (
                      <div className="metric-sub">{windDirectionLabel(weather.windDirection)}</div>
                    )}
                  </div>
                  <div className="metric">
                    <div className="label">Rajadas</div>
                    <div className="value">{pending ? '-- km/h' : formatValue(weather?.gusts ?? 0, 'km/h')}</div>
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
                    <div className="label">Nuvens</div>
                    <div className="value">{pending ? '-- %' : formatValue(weather?.cloudCover ?? 0, '%', 0)}</div>
                  </div>
                  <div className="metric">
                    <div className="label">Chuva (1h)</div>
                    <div className="value">{pending ? '-- mm' : formatValue(weather?.precipitation ?? 0, 'mm')}</div>
                  </div>
                  <div className="metric">
                    <div className="label">Relógio</div>
                    <div className="value">
                      <Clock />
                    </div>
                  </div>
                  <div className="metric">
                    <div className="label">Fonte</div>
                    <div className="value" style={{ fontSize: '0.8rem' }}>
                      Open-Meteo
                    </div>
                  </div>
                </div>
                {hourly.length > 0 && (
                  <div className="hourly">
                    <div className="eyebrow" style={{ color: 'var(--primary)', marginBottom: 10 }}>
                      Próximas 24 horas
                    </div>
                    <div className="hourly-strip">
                      {hourly.map((h) => (
                        <div className="hourly-item" key={h.time}>
                          <div className="hourly-time">{formatHour(h.time)}</div>
                          <div>{iconFor(h.code ?? 0, !isNightHour(h.time))}</div>
                          <div className="hourly-temp">{h.temp != null ? `${Math.round(h.temp)}°` : '--'}</div>
                          {h.rainChance != null && h.rainChance > 0 && (
                            <div className="hourly-rain">{h.rainChance}%</div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="forecast">
                  <div className="eyebrow" style={{ color: 'var(--primary)', marginBottom: 10 }}>
                    Próximos 7 dias
                  </div>
                  <div className="forecast-grid forecast-grid-7">
                    {forecast.map((d) => (
                      <div className="forecast-card" key={d.date}>
                        <div>{formatDate(new Date(`${d.date}T00:00:00`))}</div>
                        <div style={{ margin: '10px 0' }}>{iconFor(d.code, true)}</div>
                        <div>{labelFor(d.code)}</div>
                        <div>Máx: {formatValue(d.max, '°C')}</div>
                        <div>Min: {formatValue(d.min, '°C')}</div>
                        {d.rainChance != null && d.rainChance > 0 && (
                          <div className="forecast-rain">Chuva: {d.rainChance}%</div>
                        )}
                        {d.uv != null && d.uv >= 3 && (
                          <div className="forecast-uv">UV: {uvLabel(d.uv)}</div>
                        )}
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