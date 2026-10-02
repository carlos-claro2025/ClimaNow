export const MONITORED = ['Goiânia', 'São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Curitiba', 'Porto Alegre', 'Brasília', 'Salvador', 'Fortaleza', 'Recife'];
export const POPULAR = ['São Paulo', 'Rio de Janeiro', 'Belo Horizonte', 'Brasília'];

// Hardcoded coordinates for the monitored cities so the rain page doesn't need
// 10 geocoding requests on every mount. The TTL cache below covers everything
// else, so a city searched once is never re-fetched within the window.
const KNOWN_COORDS = {
  'Goiânia': { latitude: -16.6869, longitude: -49.2648 },
  'São Paulo': { latitude: -23.5505, longitude: -46.6333 },
  'Rio de Janeiro': { latitude: -22.9068, longitude: -43.1729 },
  'Belo Horizonte': { latitude: -19.9167, longitude: -43.9333 },
  'Curitiba': { latitude: -25.4284, longitude: -49.2733 },
  'Porto Alegre': { latitude: -30.0346, longitude: -51.2177 },
  'Brasília': { latitude: -15.7942, longitude: -47.8822 },
  'Salvador': { latitude: -12.9714, longitude: -38.5014 },
  'Fortaleza': { latitude: -3.7312, longitude: -38.5267 },
  'Recife': { latitude: -8.0476, longitude: -34.8770 },
};

const GEOCODE_TTL_MS = 10 * 60 * 1000; // 10 minutes
const geocodeCache = new Map();

const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const INMET_ACTIVE_URL = 'https://apiprevmet3.inmet.gov.br/avisos/ativos';
const INMET_RSS_URL = 'https://apiprevmet3.inmet.gov.br/avisos/rss';

const REQUEST_TIMEOUT_MS = 10000;
const INMET_HOME = 'https://avisos.inmet.gov.br/';

const RAIN_CODES = new Set([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82, 95, 96, 99]);

export const isRaining = (code) => RAIN_CODES.has(code);

export const INMET_OFFLINE = { title: 'Sem conexão com o INMET', description: '', link: '' };

// CEMADEN sends no CORS headers, so the browser can only reach it through a
// proxy. The Vite dev server and nginx.conf serve `/api/cemaden`; the Wasmer
// Edge worker covers hosts that cannot run a server-side proxy. The first base
// that answers wins, and VITE_CEMADEN_BASE overrides the list entirely.
export const CEMADEN_BASES = [
  import.meta.env.VITE_CEMADEN_BASE,
  '/api/cemaden',
  'https://cemaden-proxy.wasmer.app',
].filter(Boolean);

export const EMPTY_CEMADEN = { muitoAlto: 0, alto: 0, moderado: 0, geo: 0, hidro: 0, atualizado: '' };

// The caller's signal stays the one that distinguishes abort from failure (the
// pages check `signal.aborted` to skip state updates after unmount), so the
// deadline is merged into a derived controller instead of replacing it. Without
// a deadline a hung upstream left the promise pending and the UI stuck on
// "loading" forever.
async function fetchWithTimeout(url, signal, init = {}) {
  const controller = new AbortController();
  const forwardAbort = () => controller.abort(signal.reason);
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

export async function fetchJson(url, signal) {
  const res = await fetchWithTimeout(url, signal);
  if (!res.ok) throw new Error('network');
  return res.json();
}

// Warning links come from a remote RSS feed, so the scheme is untrusted:
// window.open('javascript:...') would execute in this page's origin. Only plain
// web URLs survive, anything else falls back to the official INMET page.
export function safeExternalUrl(link, fallback = INMET_HOME) {
  try {
    const url = new URL(link);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : fallback;
  } catch {
    return fallback;
  }
}

export async function geocode(name, signal) {
  const known = KNOWN_COORDS[name];
  if (known) return known;

  const cached = geocodeCache.get(name);
  if (cached && Date.now() - cached.at < GEOCODE_TTL_MS) return cached.result;

  const data = await fetchJson(`${GEOCODE_URL}?name=${encodeURIComponent(name)}&count=1&language=pt&format=json`, signal);
  const result = data.results?.[0] || null;
  geocodeCache.set(name, { result, at: Date.now() });
  return result;
}

export function forecastUrl(latitude, longitude, params) {
  return `${FORECAST_URL}?latitude=${latitude}&longitude=${longitude}&timezone=auto&${params}`;
}

export function formatDate(date) {
  return new Intl.DateTimeFormat('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' }).format(date);
}

function cleanText(html) {
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

export function formatValue(value, unit = '', digits = 1) {
  if (!Number.isFinite(value)) return unit ? `-- ${unit}` : '--';
  return unit ? `${value.toFixed(digits)} ${unit}` : value.toFixed(digits);
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
    // Sanitized at the single choke point every warning passes through, so no
    // call site can open an unvalidated remote URL.
    link: item.link ? safeExternalUrl(item.link, '') : '',
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
  const res = await fetchWithTimeout(INMET_RSS_URL, signal);
  if (!res.ok) throw new Error('network');
  return parseRss(await res.text());
}

export async function fetchCemaden(signal) {
  let json = null;
  for (const base of CEMADEN_BASES) {
    try {
      json = await fetchJson(`${base}/wsAlertas2`, signal);
      break;
    } catch (err) {
      if (err.name === 'AbortError') throw err;
    }
  }
  if (!json) throw new Error('network');

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
