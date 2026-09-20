import {
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudMoon,
  CloudRain,
  CloudSun,
  Moon,
  Snowflake,
  SunMedium,
} from 'lucide-react';

export const MONITORED = ['Goiânia', 'São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Porto Alegre', 'Brasília', 'Salvador', 'Fortaleza', 'Recife'];
export const POPULAR = ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Brasília'];

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const INMET_ACTIVE_URL = 'https://apiprevmet3.inmet.gov.br/avisos/ativos';
const INMET_RSS_URL = 'https://apiprevmet3.inmet.gov.br/avisos/rss';

const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);
const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);

const isSnow = (code) => SNOW_CODES.has(code);

export const isRaining = (code) => RAIN_CODES.has(code);

export const INMET_OFFLINE = { title: 'Sem conexão com o INMET', description: '', link: '' };

// Deployments without the Vite dev proxy must set VITE_CEMADEN_BASE to a
// reverse-proxied path or a CORS-enabled endpoint.
export const CEMADEN_BASE = import.meta.env.VITE_CEMADEN_BASE || '/api/cemaden';

export const EMPTY_CEMADEN = { muitoAlto: 0, alto: 0, moderado: 0, geo: 0, hidro: 0, atualizado: '' };

export async function fetchJson(url, signal) {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error('network');
  return res.json();
}

export async function geocode(name, signal) {
  const data = await fetchJson(`${GEOCODE_URL}?name=${encodeURIComponent(name)}&count=1&language=pt&format=json`, signal);
  return data.results?.[0] || null;
}

export function forecastUrl(latitude, longitude, params) {
  return `${FORECAST_URL}?latitude=${latitude}&longitude=${longitude}&timezone=auto&${params}`;
}

export function formatDate(date) {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(date);
}

export function formatValue(value, unit = '', digits = 1) {
  if (!Number.isFinite(value)) return unit ? `-- ${unit}` : '--';
  return unit ? `${value.toFixed(digits)} ${unit}` : value.toFixed(digits);
}

export function iconFor(code, isDay = true, size = 58) {
  const sun = <SunMedium size={size} color="#fbbf24" />;
  const moon = <Moon size={size} color="#c4b5fd" />;
  if (code === 0) return isDay ? sun : moon;
  if (code === 1 || code === 2) return isDay ? <CloudSun size={size} color="#fbbf24" /> : <CloudMoon size={size} color="#c4b5fd" />;
  if (code === 3) return <CloudSun size={size} color={isDay ? '#fbbf24' : '#c4b5fd'} />;
  // Snow must be checked before the rain ranges: 71-77 and 85-86 overlap 61-82.
  if (isSnow(code)) return <Snowflake size={size} />;
  if (code >= 45 && code <= 48) return <CloudFog size={size} />;
  if (code >= 51 && code <= 57) return <CloudDrizzle size={size} />;
  if (code >= 61 && code <= 82) return <CloudRain size={size} />;
  if (code >= 95) return <CloudLightning size={size} />;
  return isDay ? sun : moon;
}

export function labelFor(code) {
  if (code === 0) return 'Céu limpo';
  if (code === 1 || code === 2) return 'Parcialmente nublado';
  if (code === 3) return 'Nublado';
  if (isSnow(code)) return 'Neve';
  if (code >= 45 && code <= 48) return 'Neblina';
  if (code >= 51 && code <= 57) return 'Garoa';
  if (code >= 61 && code <= 82) return 'Chuva';
  if (code >= 95) return 'Tempestade';
  return 'Condição variável';
}

function cleanText(html) {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export function normalizeWarning(item) {
  if (!item) return { title: '', description: '', link: '' };
  if (typeof item === 'string') {
    const [title, ...rest] = item.split(' — ');
    return { title: cleanText(title || ''), description: cleanText(rest.join(' — ')), link: '' };
  }
  return {
    title: cleanText(String(item.title || '')),
    description: cleanText(String(item.description || '')),
    link: item.link || '',
  };
}

export function parseRss(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
  return Array.from(doc.querySelectorAll('item'))
    .slice(0, 8)
    .map((item) => ({
      title: cleanText(item.querySelector('title')?.textContent || '') || 'Aviso meteorológico',
      description: cleanText(item.querySelector('description')?.textContent || ''),
      link: item.querySelector('link')?.textContent?.trim() || '',
    }));
}

export async function fetchInmetWarnings(signal) {
  const data = await fetchJson(INMET_ACTIVE_URL, signal);
  const list = Array.isArray(data) ? data : Object.values(data || {});
  return list.slice(0, 3).map((x) =>
    normalizeWarning({
      title: x.descricao || x.titulo || x.hazard || x.urgencia || 'Aviso meteorológico',
      description: [x.severidade || x.nivel || x.description, x.validade || x.valid_until || x.fim || x.fim_vigencia]
        .filter(Boolean)
        .join(' • '),
      link: x.link || x.url || '',
    }),
  );
}

export async function fetchRss(signal) {
  const res = await fetch(INMET_RSS_URL, { signal });
  if (!res.ok) throw new Error('network');
  return parseRss(await res.text());
}

export async function fetchCemaden(signal) {
  const json = await fetchJson(`${CEMADEN_BASE}/wsAlertas2`, signal);
  const alertas = Array.isArray(json.alertas) ? json.alertas : [];
  return {
    muitoAlto: alertas.filter((a) => a.nivel === 'Muito Alto').length,
    alto: alertas.filter((a) => a.nivel === 'Alto').length,
    moderado: alertas.filter((a) => a.nivel === 'Moderado').length,
    geo: alertas.filter((a) => (a.evento || '').startsWith('Mov')).length,
    hidro: alertas.filter((a) => /Enx|Ris|Hidro/i.test(a.evento)).length,
    atualizado: json.atualizado || '',
  };
}
