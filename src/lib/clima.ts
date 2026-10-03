export const MONITORED = ['Goiânia', 'São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Porto Alegre', 'Brasília', 'Salvador', 'Fortaleza', 'Recife'] as const;
export const POPULAR = ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Brasília'] as const;

export interface Coordinates {
  latitude: number;
  longitude: number;
  name?: string;
  admin1?: string;
  country?: string;
}

export interface Warning {
  title: string;
  description: string;
  link: string;
}

export interface CemadenData {
  muitoAlto: number;
  alto: number;
  moderado: number;
  geo: number;
  hidro: number;
  atualizado: string;
}

// One request asks Open-Meteo for the current block, the next 24 hours and the
// coming week together. The API derives every field from the same model run, so
// a single request keeps the headline temperature, the hourly strip and the
// daily cards consistent with each other. Splitting them across requests let
// them disagree by a degree or two whenever an update landed mid-way.
export interface CurrentWeather {
  temperature_2m?: number;
  apparent_temperature?: number;
  relative_humidity_2m?: number;
  is_day?: number;
  weather_code?: number;
  cloud_cover?: number;
  pressure_msl?: number;
  wind_speed_10m?: number;
  wind_direction_10m?: number;
  wind_gusts_10m?: number;
  precipitation?: number;
}

export interface HourlyWeather {
  time?: string[];
  temperature_2m?: number[];
  apparent_temperature?: number[];
  precipitation_probability?: number[];
  weather_code?: number[];
  wind_speed_10m?: number[];
}

export interface DailyWeather {
  time?: string[];
  weather_code?: number[];
  temperature_2m_max?: number[];
  temperature_2m_min?: number[];
  precipitation_probability_max?: number[];
  uv_index_max?: number[];
}

export interface WeatherResponse {
  current?: CurrentWeather;
  hourly?: HourlyWeather;
  daily?: DailyWeather;
}

export const WEATHER_CURRENT_FIELDS = [
  'temperature_2m',
  'apparent_temperature',
  'relative_humidity_2m',
  'is_day',
  'weather_code',
  'cloud_cover',
  'pressure_msl',
  'wind_speed_10m',
  'wind_direction_10m',
  'wind_gusts_10m',
  'precipitation',
] as const;

export const WEATHER_HOURLY_FIELDS = [
  'temperature_2m',
  'apparent_temperature',
  'precipitation_probability',
  'weather_code',
  'wind_speed_10m',
] as const;

export const WEATHER_DAILY_FIELDS = [
  'weather_code',
  'temperature_2m_max',
  'temperature_2m_min',
  'precipitation_probability_max',
  'uv_index_max',
] as const;

export function weatherQuery(forecastDays = 7, forecastHours = 24): string {
  return [
    `forecast_days=${forecastDays}`,
    `forecast_hours=${forecastHours}`,
    `current=${WEATHER_CURRENT_FIELDS.join(',')}`,
    `hourly=${WEATHER_HOURLY_FIELDS.join(',')}`,
    `daily=${WEATHER_DAILY_FIELDS.join(',')}`,
  ].join('&');
}

// Hardcoded coordinates for the monitored cities so the rain page doesn't need
// 10 geocoding requests on every mount. The TTL cache below covers everything
// else, so a city searched once is never re-fetched within the window.
const KNOWN_COORDS: Record<string, Coordinates> = {
  'Goiânia': { latitude: -16.6869, longitude: -49.2648, name: 'Goiânia', admin1: 'Goiás', country: 'Brasil' },
  'São Paulo': { latitude: -23.5505, longitude: -46.6333, name: 'São Paulo', admin1: 'São Paulo', country: 'Brasil' },
  'Rio de Janeiro': { latitude: -22.9068, longitude: -43.1729, name: 'Rio de Janeiro', admin1: 'Rio de Janeiro', country: 'Brasil' },
  'Belo Horizonte': { latitude: -19.9167, longitude: -43.9333, name: 'Belo Horizonte', admin1: 'Minas Gerais', country: 'Brasil' },
  'Curitiba': { latitude: -25.4284, longitude: -49.2733, name: 'Curitiba', admin1: 'Paraná', country: 'Brasil' },
  'Porto Alegre': { latitude: -30.0346, longitude: -51.2177, name: 'Porto Alegre', admin1: 'Rio Grande do Sul', country: 'Brasil' },
  'Brasília': { latitude: -15.7942, longitude: -47.8822, name: 'Brasília', admin1: 'Distrito Federal', country: 'Brasil' },
  'Salvador': { latitude: -12.9714, longitude: -38.5014, name: 'Salvador', admin1: 'Bahia', country: 'Brasil' },
  'Fortaleza': { latitude: -3.7312, longitude: -38.5267, name: 'Fortaleza', admin1: 'Ceará', country: 'Brasil' },
  'Recife': { latitude: -8.0476, longitude: -34.8770, name: 'Recife', admin1: 'Pernambuco', country: 'Brasil' },
};

const GEOCODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const geocodeCache = new Map<string, { result: Coordinates | null; at: number }>();

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const INMET_ACTIVE_URL = 'https://apiprevmet3.inmet.gov.br/avisos/ativos';
const INMET_RSS_URL = 'https://apiprevmet3.inmet.gov.br/avisos/rss';

const REQUEST_TIMEOUT_MS = 10000;
const INMET_HOME = 'https://avisos.inmet.gov.br/';

const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);

export const isRaining = (code: number): boolean => RAIN_CODES.has(code);

export const INMET_OFFLINE: Warning = { title: 'Sem conexão com o INMET', description: '', link: '' };

// CEMADEN sends no CORS headers, so the browser can only reach it through a
// proxy. The Vite dev server and nginx.conf serve `/api/cemaden`; the Wasmer
// Edge worker covers hosts that cannot run a server-side proxy. The first base
// that answers wins, and VITE_CEMADEN_BASE overrides the list entirely.
export const CEMADEN_BASES: string[] = [
  import.meta.env.VITE_CEMADEN_BASE,
  '/api/cemaden',
  'https://cemaden-proxy.wasmer.app',
].filter((base): base is string => Boolean(base));

export const EMPTY_CEMADEN: CemadenData = { muitoAlto: 0, alto: 0, moderado: 0, geo: 0, hidro: 0, atualizado: '' };

// The caller's signal stays the one that distinguishes abort from failure (the
// pages check `signal.aborted` to skip state updates after unmount), so the
// deadline is merged into a derived controller instead of replacing it. Without
// a deadline a hung upstream left the promise pending and the UI stuck on
// "loading" forever.
async function fetchWithTimeout(url: string, signal?: AbortSignal, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const forwardAbort = () => controller.abort(signal?.reason);
  if (signal?.aborted) controller.abort(signal.reason);
  else signal?.addEventListener('abort', forwardAbort, { once: true });
  const timer = setTimeout(
    () => controller.abort(new DOMException('Tempo limite excedido', 'TimeoutError')),
    REQUEST_TIMEOUT_MS,
  );
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener('abort', forwardAbort);
  }
}

export async function fetchJson<T = unknown>(url: string, signal?: AbortSignal): Promise<T> {
  const res = await fetchWithTimeout(url, signal);
  if (!res.ok) throw new Error('network');
  return res.json() as Promise<T>;
}

// Warning links come from a remote RSS feed, so the scheme is untrusted:
// window.open('javascript:...') would execute in this page's origin. Only plain
// web URLs survive, anything else falls back to the official INMET page.
export function safeExternalUrl(link: string, fallback = INMET_HOME): string {
  try {
    const url = new URL(link);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : fallback;
  } catch {
    return fallback;
  }
}

export async function geocode(name: string, signal?: AbortSignal): Promise<Coordinates | null> {
  const known = KNOWN_COORDS[name];
  if (known) return known;

  const cached = geocodeCache.get(name);
  if (cached && Date.now() - cached.at < GEOCODE_TTL_MS) return cached.result;

  const data = await fetchJson<{ results?: Coordinates[] }>(`${GEOCODE_URL}?name=${encodeURIComponent(name)}&count=1&language=pt&format=json`, signal);
  const result = data.results?.[0] || null;
  geocodeCache.set(name, { result, at: Date.now() });
  return result;
}

export function forecastUrl(latitude: number, longitude: number, params: string): string {
  return `${FORECAST_URL}?latitude=${latitude}&longitude=${longitude}&timezone=auto&${params}`;
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(date);
}

// Open-Meteo returns naive local timestamps ("2026-10-03T13:00") already shifted
// into the city's own timezone. Handing those to `new Date()` would re-read them
// as the visitor's local time and shift every hour by the difference between the
// two, so the label is cut straight off the string instead.
function hourOf(isoTime: string): number {
  return Number(isoTime.slice(11, 13));
}

export function formatHour(isoTime: string): string {
  const hour = hourOf(isoTime);
  return Number.isFinite(hour) ? `${String(hour).padStart(2, '0')}h` : '--h';
}

// The hourly strip renders one icon per hour and `iconFor` needs to know whether
// to draw the sun or the moon. The 24-hour block always starts at the current
// hour, so it runs past 18:00 and wraps past midnight. Night is therefore
// 18:00-05:59: treating it as strictly "after 18:00" would leave the 00:00-05:00
// cards showing a sun at three in the morning.
export function isNightHour(isoTime: string): boolean {
  const hour = hourOf(isoTime);
  if (!Number.isFinite(hour)) return false;
  return hour >= 18 || hour < 6;
}

// Eight-point compass in Portuguese, which is what Brazilian forecasts print.
const COMPASS_8 = ['N', 'NE', 'L', 'SE', 'S', 'SO', 'O', 'NO'] as const;

export function windDirectionLabel(degrees?: number | null): string {
  if (degrees == null || !Number.isFinite(degrees)) return '--';
  const normalized = ((degrees % 360) + 360) % 360;
  return COMPASS_8[Math.round(normalized / 45) % 8];
}

export function uvLabel(uv?: number | null): string {
  if (uv == null || !Number.isFinite(uv)) return '--';
  if (uv < 3) return 'Baixo';
  if (uv < 6) return 'Moderado';
  if (uv < 8) return 'Alto';
  if (uv < 11) return 'Muito alto';
  return 'Extremo';
}

function cleanText(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatValue(value: number, unit = '', digits = 1): string {
  if (!Number.isFinite(value)) return unit ? `-- ${unit}` : '--';
  return unit ? `${value.toFixed(digits)} ${unit}` : value.toFixed(digits);
}

export function normalizeWarning(item: string | Partial<Warning> | null | undefined): Warning {
  if (!item) return { title: '', description: '', link: '' };
  if (typeof item === 'string') {
    const [title, ...rest] = item.split(' — ');
    return { title: cleanText(title || ''), description: cleanText(rest.join(' — ')), link: '' };
  }
  return {
    title: cleanText(String(item.title || '')),
    description: cleanText(String(item.description || '')),
    // Sanitized at the single choke point every warning passes through, so no
    // call site can open an unvalidated remote URL.
    link: item.link ? safeExternalUrl(item.link, '') : '',
  };
}

export function parseRss(xmlText: string): Warning[] {
  const doc = new DOMParser().parseFromString(xmlText, 'text/xml');
  return Array.from(doc.querySelectorAll('item'))
    .slice(0, 8)
    .map((item) => ({
      title: cleanText(item.querySelector('title')?.textContent || '') || 'Aviso meteorológico',
      description: cleanText(item.querySelector('description')?.textContent || ''),
      link: item.querySelector('link')?.textContent?.trim() || '',
    }));
}

export async function fetchInmetWarnings(signal?: AbortSignal): Promise<Warning[]> {
  const data = await fetchJson<Record<string, unknown> | unknown[]>(INMET_ACTIVE_URL, signal);
  const list = Array.isArray(data) ? data : Object.values(data || {});
  return list.slice(0, 3).map((x) => {
    const obj = x as Record<string, unknown>;
    return normalizeWarning({
      title: (obj.descricao || obj.titulo || obj.hazard || obj.urgencia || 'Aviso meteorológico') as string,
      description: [obj.severidade || obj.nivel || obj.description, obj.validade || obj.valid_until || obj.fim || obj.fim_vigencia]
        .filter(Boolean)
        .join(' • '),
      link: (obj.link || obj.url || '') as string,
    });
  });
}

export async function fetchRss(signal?: AbortSignal): Promise<Warning[]> {
  const res = await fetchWithTimeout(INMET_RSS_URL, signal);
  if (!res.ok) throw new Error('network');
  return parseRss(await res.text());
}

export async function fetchCemaden(signal?: AbortSignal): Promise<CemadenData> {
  let json: Record<string, unknown> | null = null;
  for (const base of CEMADEN_BASES) {
    try {
      json = await fetchJson<Record<string, unknown>>(`${base}/wsAlertas2`, signal);
      break;
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') throw err;
    }
  }
  if (!json) throw new Error('network');

  const alertas = Array.isArray(json.alertas) ? (json.alertas as Array<Record<string, unknown>>) : [];
  return {
    muitoAlto: alertas.filter((a) => a.nivel === 'Muito Alto').length,
    alto: alertas.filter((a) => a.nivel === 'Alto').length,
    moderado: alertas.filter((a) => a.nivel === 'Moderado').length,
    geo: alertas.filter((a) => String(a.evento || '').startsWith('Mov')).length,
    hidro: alertas.filter((a) => /Enx|Ris|Hidro/i.test(String(a.evento))).length,
    atualizado: (json.atualizado as string) || '',
  };
}