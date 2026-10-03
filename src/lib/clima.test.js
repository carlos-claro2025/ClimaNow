import { describe, expect, it } from 'vitest';
import {
  EMPTY_CEMADEN,
  INMET_OFFLINE,
  MONITORED,
  POPULAR,
  forecastUrl,
  formatDate,
  formatHour,
  formatValue,
    isNightHour,
    isRaining,
    normalizeWarning,
  parseRss,
  safeExternalUrl,
  uvLabel,
  weatherQuery,
  windDirectionLabel,
} from '../lib/clima';

describe('formatHour', () => {
  it('reads the hour straight off the naive local timestamp', () => {
    expect(formatHour('2026-10-03T13:00')).toBe('13h');
  });

  it('zero-pads single-digit hours', () => {
    expect(formatHour('2026-10-03T07:00')).toBe('07h');
  });

  it('keeps midnight at 00h rather than rolling over to 24h', () => {
    expect(formatHour('2026-10-03T00:00')).toBe('00h');
  });

  it('falls back when the string is malformed', () => {
    expect(formatHour('not-a-timestamp')).toBe('--h');
  });
});

  describe('isNightHour', () => {
    it('treats 18:00 onward as night', () => {
      expect(isNightHour('2026-10-03T18:00')).toBe(true);
      expect(isNightHour('2026-10-03T21:00')).toBe(true);
      expect(isNightHour('2026-10-03T23:00')).toBe(true);
    });

    it('treats the small hours as night too, so 03:00 is not drawn with a sun', () => {
      expect(isNightHour('2026-10-04T00:00')).toBe(true);
      expect(isNightHour('2026-10-04T03:00')).toBe(true);
      expect(isNightHour('2026-10-04T05:00')).toBe(true);
    });

    it('treats daytime as day', () => {
      expect(isNightHour('2026-10-03T06:00')).toBe(false);
      expect(isNightHour('2026-10-03T13:00')).toBe(false);
      expect(isNightHour('2026-10-03T17:00')).toBe(false);
    });

    it('defaults to day when the timestamp is malformed', () => {
      expect(isNightHour('not-a-timestamp')).toBe(false);
    });
  });

describe('windDirectionLabel', () => {
  it('maps the eight cardinal points in Portuguese', () => {
    expect(windDirectionLabel(0)).toBe('N');
    expect(windDirectionLabel(45)).toBe('NE');
    expect(windDirectionLabel(90)).toBe('L');
    expect(windDirectionLabel(180)).toBe('S');
    expect(windDirectionLabel(270)).toBe('O');
  });

  it('rounds to the nearest point', () => {
    expect(windDirectionLabel(20)).toBe('N');
    expect(windDirectionLabel(340)).toBe('N');
  });

  it('normalises out-of-range degrees', () => {
    expect(windDirectionLabel(360)).toBe('N');
    expect(windDirectionLabel(450)).toBe('L');
  });

  it('returns -- when there is no reading', () => {
    expect(windDirectionLabel(null)).toBe('--');
    expect(windDirectionLabel(undefined)).toBe('--');
    expect(windDirectionLabel(NaN)).toBe('--');
  });
});

describe('uvLabel', () => {
  it('uses the standard UV risk bands', () => {
    expect(uvLabel(1)).toBe('Baixo');
    expect(uvLabel(4)).toBe('Moderado');
    expect(uvLabel(7)).toBe('Alto');
    expect(uvLabel(10)).toBe('Muito alto');
    expect(uvLabel(12)).toBe('Extremo');
  });

  it('returns -- without a reading', () => {
    expect(uvLabel(null)).toBe('--');
  });
});

describe('weatherQuery', () => {
  it('asks for current, hourly and daily in one request', () => {
    const query = weatherQuery();
    expect(query).toContain('current=');
    expect(query).toContain('hourly=');
    expect(query).toContain('daily=');
  });

  it('defaults to a week and 24 hours', () => {
    expect(weatherQuery()).toContain('forecast_days=7');
    expect(weatherQuery()).toContain('forecast_hours=24');
  });

  it('honours custom windows', () => {
    expect(weatherQuery(3, 12)).toContain('forecast_days=3');
    expect(weatherQuery(3, 12)).toContain('forecast_hours=12');
  });

  it('includes the fields the page renders', () => {
    const query = weatherQuery();
    expect(query).toContain('apparent_temperature');
    expect(query).toContain('precipitation_probability');
    expect(query).toContain('wind_gusts_10m');
    expect(query).toContain('uv_index_max');
  });
});

describe('formatValue', () => {
  it('formats a number with unit', () => {
    expect(formatValue(23.456, '°C')).toBe('23.5 °C');
  });

  it('formats a number without unit', () => {
    expect(formatValue(23.456)).toBe('23.5');
  });

  it('returns -- for non-finite values', () => {
    expect(formatValue(NaN, '°C')).toBe('-- °C');
    expect(formatValue(Infinity)).toBe('--');
  });

  it('respects custom digit count', () => {
    expect(formatValue(23.456, '', 2)).toBe('23.46');
  });
});

describe('formatDate', () => {
  it('formats a date in pt-BR', () => {
    const date = new Date('2025-01-15T12:00:00');
    const result = formatDate(date);
    expect(result).toContain('15');
    expect(result).toContain('01');
  });
});

describe('forecastUrl', () => {
  it('builds a valid URL', () => {
    const url = forecastUrl(-16.68, -49.26, 'current=temperature_2m');
    expect(url).toContain('latitude=-16.68');
    expect(url).toContain('longitude=-49.26');
    expect(url).toContain('timezone=auto');
    expect(url).toContain('current=temperature_2m');
  });
});

describe('isRaining', () => {
  it('returns true for rain codes', () => {
    expect(isRaining(61)).toBe(true);
    expect(isRaining(63)).toBe(true);
    expect(isRaining(80)).toBe(true);
    expect(isRaining(95)).toBe(true);
  });

  it('returns false for non-rain codes', () => {
    expect(isRaining(0)).toBe(false);
    expect(isRaining(1)).toBe(false);
    expect(isRaining(71)).toBe(false); // snow
  });
});

describe('safeExternalUrl', () => {
  it('allows http and https URLs', () => {
    expect(safeExternalUrl('https://example.com')).toBe('https://example.com/');
    expect(safeExternalUrl('http://example.com')).toBe('http://example.com/');
  });

  it('blocks javascript: URLs', () => {
    expect(safeExternalUrl('javascript:alert(1)')).toBe('https://avisos.inmet.gov.br/');
  });

  it('blocks data: URLs', () => {
    expect(safeExternalUrl('data:text/html,<script>alert(1)</script>')).toBe('https://avisos.inmet.gov.br/');
  });

  it('returns fallback for invalid URLs', () => {
    expect(safeExternalUrl('not-a-url')).toBe('https://avisos.inmet.gov.br/');
  });

  it('uses custom fallback', () => {
    expect(safeExternalUrl('javascript:alert(1)', 'https://fallback.com')).toBe('https://fallback.com');
  });
});

describe('normalizeWarning', () => {
  it('handles null/undefined', () => {
    expect(normalizeWarning(null)).toEqual({ title: '', description: '', link: '' });
    expect(normalizeWarning(undefined)).toEqual({ title: '', description: '', link: '' });
  });

  it('parses a string with em-dash separator', () => {
    const result = normalizeWarning('Aviso de chuva — severidade alta');
    expect(result.title).toBe('Aviso de chuva');
    expect(result.description).toBe('severidade alta');
  });

  it('parses an object with title and description', () => {
    const result = normalizeWarning({ title: 'Teste', description: 'Descrição', link: 'https://example.com' });
    expect(result.title).toBe('Teste');
    expect(result.description).toBe('Descrição');
    expect(result.link).toBe('https://example.com/');
  });

  it('sanitizes javascript: links', () => {
    const result = normalizeWarning({ title: 'Teste', link: 'javascript:alert(1)' });
    expect(result.link).toBe('');
  });

  it('strips HTML tags from title and description', () => {
    const result = normalizeWarning({ title: '<b>Teste</b>', description: '<i>Desc</i>' });
    expect(result.title).toBe('Teste');
    expect(result.description).toBe('Desc');
  });
});

describe('parseRss', () => {
  // DOMParser is not available in Node.js; these tests require a browser-like
  // environment (jsdom or happy-dom). Skipped for now.
  it.skip('parses RSS XML into warning objects', () => {
    const xml = `<?xml version="1.0"?>
<rss><channel>
  <item><title>Aviso 1</title><description>Desc 1</description><link>https://example.com/1</link></item>
  <item><title>Aviso 2</title><description>Desc 2</description><link>https://example.com/2</link></item>
</channel></rss>`;
    const result = parseRss(xml);
    expect(result).toHaveLength(2);
    expect(result[0].title).toBe('Aviso 1');
    expect(result[0].description).toBe('Desc 1');
    expect(result[0].link).toBe('https://example.com/1');
  });

  it.skip('returns empty array for invalid XML', () => {
    expect(parseRss('not xml')).toEqual([]);
  });
});

describe('constants', () => {
  it('MONITORED has 10 cities', () => {
    expect(MONITORED).toHaveLength(10);
  });

  it('POPULAR has 4 cities', () => {
    expect(POPULAR).toHaveLength(4);
  });

  it('EMPTY_CEMADEN has zero counts', () => {
    expect(EMPTY_CEMADEN.muitoAlto).toBe(0);
    expect(EMPTY_CEMADEN.alto).toBe(0);
    expect(EMPTY_CEMADEN.moderado).toBe(0);
  });

  it('INMET_OFFLINE has a title', () => {
    expect(INMET_OFFLINE.title).toBe('Sem conexão com o INMET');
  });
});