import { useEffect, useMemo, useState } from 'react';
import { CloudDrizzle, CloudFog, CloudLightning, CloudMoon, CloudRain, CloudSun, LoaderCircle, Moon, SunMedium, ThermometerSun, Droplets, Wind, Gauge, Clock3, Flame, Snowflake, Search, RefreshCw } from 'lucide-react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import Topbar from '../../components/Topbar';
import InmetBar from '../../components/InmetBar';

const MONITORED = ['Goiânia', 'São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Porto Alegre', 'Brasília', 'Salvador', 'Fortaleza', 'Recife'];
const POPULAR = ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Brasília'];

function getThemeFromUrl(urlTheme) {
  return urlTheme === 'claro' ? 'claro' : 'escuro';
}

function themeToUrl(theme) {
  return theme === 'claro' ? 'claro' : 'escuro';
}

function formatDate(date) {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(date);
}

function iconFor(code, isDay) {
  if (code === 0) return isDay ? <SunMedium size={58} color="#fbbf24" /> : <Moon size={58} color="#c4b5fd" />;
  if (code === 1 || code === 2) return isDay ? <CloudSun size={58} color="#fbbf24" /> : <CloudMoon size={58} color="#c4b5fd" />;
  if (code === 3) return <CloudSun size={58} color={isDay ? '#fbbf24' : '#c4b5fd'} />;
  if (code >= 45 && code <= 48) return <CloudFog size={58} />;
  if (code >= 51 && code <= 57) return <CloudDrizzle size={58} />;
  if (code >= 61 && code <= 82) return <CloudRain size={58} />;
  if (code >= 71 && code <= 86) return <Snowflake size={58} />;
  if (code >= 95) return <CloudLightning size={58} />;
  return isDay ? <SunMedium size={58} color="#fbbf24" /> : <Moon size={58} color="#c4b5fd" />;
}

function labelFor(code) {
  if (code === 0) return 'Céu limpo';
  if (code === 1 || code === 2) return 'Parcialmente nublado';
  if (code === 3) return 'Nublado';
  if (code >= 45 && code <= 48) return 'Neblina';
  if (code >= 51 && code <= 57) return 'Garoa';
  if (code >= 61 && code <= 82) return 'Chuva';
  if (code >= 71 && code <= 86) return 'Neve';
  if (code >= 95) return 'Tempestade';
  return 'Condição variável';
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error('network');
  return res.json();
}

export default function WeatherPage() {
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [theme, setTheme] = useState(getThemeFromUrl(params.get('tema') || 'escuro'));
  const [city, setCity] = useState(params.get('cidade') || 'Goiânia');
  const [input, setInput] = useState(params.get('cidade') || 'Goiânia');
  const [warnings, setWarnings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState([]);
  const [popular, setPopular] = useState(POPULAR);
  const [comparison, setComparison] = useState({ hot: { name: null, temp: null }, cold: { name: null, temp: null } });
  const [clock, setClock] = useState('--:--:--');
  const [selectedWarning, setSelectedWarning] = useState(null);
  const [ticker, setTicker] = useState([]);
  const [cemadem, setCemadem] = useState([]);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [searchCounts, setSearchCounts] = useState(() => {
    try { return JSON.parse(localStorage.getItem('clima-search-counts') || '{}'); } catch { return {}; }
  });

  useEffect(() => {
    localStorage.setItem('clima-theme', theme);
    document.documentElement.setAttribute('data-theme', theme);
    setParams({ cidade: city, tema: themeToUrl(theme) }, { replace: true });
  }, [theme]);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('pt-BR', { hour12: false }));
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    const list = Object.entries(searchCounts).sort((a, b) => b[1] - a[1]).map(([k]) => k).slice(0, 4);
    setPopular(list.length ? list : POPULAR);
    localStorage.setItem('clima-search-counts', JSON.stringify(searchCounts));
  }, [searchCounts]);

  useEffect(() => {
    loadData(city);
    loadWarnings();
    loadComparison();
    loadTicker();
    loadCemadem();
    setLastUpdate(new Date());
  }, []);

  useEffect(() => {
    const cityFromUrl = params.get('cidade');
    if (cityFromUrl && decodeURIComponent(cityFromUrl) !== city) {
      loadData(decodeURIComponent(cityFromUrl));
    }
  }, [params, city]);

  async function loadWarnings() {
    try {
      const data = await fetchJson('https://apiprevmet3.inmet.gov.br/avisos/ativos');
      const items = Array.isArray(data) ? data : Object.values(data || {});
      const mapped = items.slice(0, 3).map((x) => {
        const title = x.descricao || x.titulo || x.hazard || x.urgencia || 'Aviso meteorológico';
        const level = x.severidade || x.nivel || x.description || '';
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
        const link = item.querySelector('link')?.textContent?.trim() || '';
        // Clean HTML from description
        const cleanDesc = desc.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        return { title, description: cleanDesc, link };
      });
      setTicker(items);
    } catch {
      setTicker([]);
    }
  }

  async function loadCemadem() {
    try {
      const res = await fetch('/api/cemaden/wsAlertas2');
      if (!res.ok) throw new Error('network');
      const json = await res.json();
      const alertas = Array.isArray(json.alertas) ? json.alertas : [];
      if (alertas.length > 0) {
        setCemadem({
          muitoAlto: alertas.filter(a => a.nivel === 'Muito Alto').length,
          alto: alertas.filter(a => a.nivel === 'Alto').length,
          moderado: alertas.filter(a => a.nivel === 'Moderado').length,
          geo: alertas.filter(a => (a.evento || '').startsWith('Mov')).length,
          hidro: alertas.filter(a => /Enx|Ris|Hidro/i.test(a.evento)).length,
          atualizado: json.atualizado || ''
        });
      } else {
        setCemadem({ muitoAlto: 0, alto: 0, moderado: 0, geo: 0, hidro: 0, atualizado: '' });
      }
    } catch {
      setCemadem({ muitoAlto: 0, alto: 0, moderado: 0, geo: 0, hidro: 0, atualizado: '', error: true });
    }
  }

  async function handleRefreshWarnings() {
    await Promise.all([loadWarnings(), loadTicker(), loadCemadem()]);
    setLastUpdate(new Date());
  }

  function handleOpenWarnings() {
    if (ticker.length > 0) {
      setSelectedWarning(ticker[0]);
      return;
    }
    if (warnings.length > 0) {
      setSelectedWarning(warnings[0]);
      return;
    }
    window.open('https://avisos.inmet.gov.br/', '_blank', 'noopener,noreferrer');
  }

  async function loadComparison() {
    try {
      const cities = await Promise.all(MONITORED.map(async (name) => {
        const geo = await fetchJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=pt&format=json`);
        const g = geo.results && geo.results[0];
        if (!g) return null;
        const forecast = await fetchJson(`https://api.open-meteo.com/v1/forecast?latitude=${g.latitude}&longitude=${g.longitude}&current=temperature_2m&timezone=auto`);
        return { name, temp: forecast.current.temperature_2m };
      }));
      const valid = cities.filter(Boolean).sort((a, b) => b.temp - a.temp);
      setComparison({ hot: valid[0] || { name: null, temp: null }, cold: valid[valid.length - 1] || { name: null, temp: null } });
    } catch {
      setComparison({ hot: { name: null, temp: null }, cold: { name: null, temp: null } });
    }
  }

  async function loadData(name) {
    setLoading(true);
    setError('');
    try {
      const geo = await fetchJson(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(name)}&count=1&language=pt&format=json`);
      const g = geo.results && geo.results[0];
      if (!g) throw new Error('notfound');
      const f = await fetchJson(`https://api.open-meteo.com/v1/forecast?latitude=${g.latitude}&longitude=${g.longitude}&timezone=auto&forecast_days=3&current=temperature_2m,weather_code,is_day,wind_speed_10m,relative_humidity_2m,pressure_msl&daily=weather_code,temperature_2m_max,temperature_2m_min&hourly=temperature_2m`);
      const currentTime = f.current.time;
      setWeather({
        place: `${g.name}, ${g.admin1 || g.country || 'Brasil'}`,
        temp: f.current.temperature_2m,
        code: f.current.weather_code,
        isDay: !!f.current.is_day,
        wind: f.current.wind_speed_10m,
        humidity: f.current.relative_humidity_2m,
        pressure: Math.round(f.current.pressure_msl),
        clock: new Date(f.current.time).toLocaleTimeString('pt-BR', { hour12: false }),
        latitude: g.latitude,
        longitude: g.longitude
      });
      setForecast((f.daily.time || []).slice(0, 3).map((d, idx) => ({
        date: d,
        code: f.daily.weather_code[idx],
        max: f.daily.temperature_2m_max[idx],
        min: f.daily.temperature_2m_min[idx]
      })));
      setCity(name);
      setInput(name);
      const currentCity = params.get('cidade');
      if (!currentCity || decodeURIComponent(currentCity) !== name) {
        setParams({ cidade: encodeURIComponent(name), tema: themeToUrl(theme) }, { replace: true });
      }
      setSearchCounts((prev) => ({ ...prev, [name]: (prev[name] || 0) + 1 }));
    } catch (e) {
      setError(e.message === 'notfound' ? 'Cidade não encontrada.' : 'Falha ao consultar clima.');
    } finally {
      setLoading(false);
    }
  }

  const status = useMemo(() => weather ? labelFor(weather.code) : '', [weather]);

  return (
    <main className="app-shell">
      <Topbar theme={theme} onToggle={() => setTheme(theme === 'claro' ? 'escuro' : 'claro')} />
      <section className="card">
        <InmetBar warnings={warnings} ticker={ticker} onOpen={handleOpenWarnings} />
        <button type="button" className="chip" onClick={handleRefreshWarnings} style={{ marginBottom: 12 }} title="Atualizar dados">
          <RefreshCw size={14} />
        </button>
        {lastUpdate && (
          <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 10 }}>
            Última atualização: {lastUpdate.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
          </div>
        )}
        <div className="header-row">
          <div>
            <div className="eyebrow">Previsão do tempo</div>
            <h1 className="title">{weather?.place || 'Goiânia, Goiás — Brasil'}</h1>
          </div>
          <a className="link link-radar" href="https://www.windy.com/-Rain-radar?metricRad=-mm&metricTemp=C&metricWind=km/h&overlay=radar&level=surface&marker=location:-16.68,-49.26,10" target="_blank" rel="noopener noreferrer">
            <CloudRain size={14} />
            Ver radar de chuva
          </a>
        </div>
        {comparison.hot?.name || comparison.cold?.name ? (
          <div style={{ display: 'flex', gap: 12, margin: '10px 0 6px', flexWrap: 'wrap' }}>
            {comparison.hot?.name && (
              <button className="chip chip-hot" onClick={() => loadData(comparison.hot.name)}>
                <Flame size={14} /> Mais quente: {comparison.hot.name} — {comparison.hot.temp.toFixed(1)} °C
              </button>
            )}
            {comparison.cold?.name && (
              <button className="chip chip-cold" onClick={() => loadData(comparison.cold.name)}>
                <Snowflake size={14} /> Mais frio: {comparison.cold.name} — {comparison.cold.temp.toFixed(1)} °C
              </button>
            )}
          </div>
        ) : null}
        <div className="search-row">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadData(input.trim())}
            placeholder="Digite uma cidade"
          />
          <button onClick={() => loadData(input.trim())}>
            <Search size={16} /> Buscar
          </button>
        </div>
        <div className="chips">
          {popular.map((c) => (
            <button key={c} className={`chip ${c === city ? 'active' : ''}`} onClick={() => loadData(c)}>
              {c}
            </button>
          ))}
        </div>
        <div className="current">
          <div className="icon-box">
            {loading ? <LoaderCircle className="spin" /> : iconFor(weather?.code || 0, weather?.isDay ?? true)}
          </div>
          <div>
            <div className="temp">{loading ? '--°C' : `${weather?.temp?.toFixed(1)}°C`}</div>
            <div>{loading ? '--' : status}</div>
          </div>
        </div>
        <div className="metrics">
          <div className="metric">
            <div className="label">Vento</div>
            <div className="value">{loading || !weather ? '-- km/h' : `${weather.wind.toFixed(1)} km/h`}</div>
          </div>
          <div className="metric">
            <div className="label">Umidade</div>
            <div className="value">{loading || !weather ? '-- %' : `${Math.round(weather.humidity)} %`}</div>
          </div>
          <div className="metric">
            <div className="label">Pressão</div>
            <div className="value">{loading || !weather ? '-- hPa' : `${weather.pressure} hPa`}</div>
          </div>
          <div className="metric">
            <div className="label">Relógio</div>
            <div className="value">{loading ? '--:--:--' : clock}</div>
          </div>
        </div>
        <div className="forecast">
          <div className="eyebrow" style={{ color: 'var(--primary)', marginBottom: 10 }}>Próximos 3 dias</div>
          <div className="forecast-grid">
            {forecast.map((d) => (
              <div className="forecast-card" key={d.date}>
                <div>{formatDate(new Date(`${d.date}T00:00:00`))}</div>
                <div style={{ margin: '10px 0' }}>{iconFor(d.code, true)}</div>
                <div>{labelFor(d.code)}</div>
                <div>Máx: {d.max.toFixed(1)} °C</div>
                <div>Min: {d.min.toFixed(1)} °C</div>
              </div>
            ))}
          </div>
        </div>
        {error ? <div className="error">{error}</div> : null}

        {/* CEMADEM Alert Bar */}
        {/* CEMADEM Alert Stats */}
        <div className="cemadem-stats">
          <div className="cemadem-title">⚠️ Alertas CEMADEN</div>
          <div className="cemadem-counts">
            <div className={`cemade-card cemade-danger`}>
              <div className="cemade-num">{cemadem?.muitoAlto ?? 0}</div>
              <div className="cemade-label">Muito Alto</div>
            </div>
            <div className={`cemade-card cemade-warning`}>
              <div className="cemade-num">{cemadem?.alto ?? 0}</div>
              <div className="cemade-label">Alto</div>
            </div>
            <div className={`cemade-card cemade-moderado`}>
              <div className="cemade-num">{cemadem?.moderado ?? 0}</div>
              <div className="cemade-label">Moderado</div>
            </div>
            <div className={`cemade-card cemade-geo`}>
              <div className="cemade-num">{cemadem?.geo ?? 0}</div>
              <div className="cemade-label">Mov. Massa</div>
            </div>
            <div className={`cemade-card cemade-hidro`}>
              <div className="cemade-num">{cemadem?.hidro ?? 0}</div>
              <div className="cemade-label">Risco Hidro.</div>
            </div>
          </div>
          {cemadem?.error && <div style={{ color: '#fbbf24', fontSize: 12, marginTop: 8, textAlign: 'center' }}>Não foi possível carregar dados do CEMADEN</div>}
          {cemadem?.atualizado && !cemadem.error && <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 6, textAlign: 'center' }}>Atualizado: {cemadem.atualizado}</div>}
        </div>
      </section>
      {selectedWarning ? (
        <div className="warning-modal" role="dialog" aria-modal="true" onClick={() => setSelectedWarning(null)}>
          <div className="warning-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="header-row">
              <strong>{selectedWarning.title || 'Detalhes do aviso'}</strong>
              <button className="chip" type="button" onClick={() => setSelectedWarning(null)}>Fechar</button>
            </div>
            {selectedWarning.description && (
              <p style={{ marginTop: 12, whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{selectedWarning.description}</p>
            )}
            {selectedWarning.link ? (
              <button className="chip" type="button" onClick={() => window.open(selectedWarning.link, '_blank', 'noopener,noreferrer')}>
                Abrir no INMET
              </button>
            ) : (
              <button className="chip" type="button" onClick={() => window.open('https://avisos.inmet.gov.br/', '_blank', 'noopener,noreferrer')}>
                Abrir no INMET
              </button>
            )}
          </div>
        </div>
      ) : null}
    </main>
  );
}
