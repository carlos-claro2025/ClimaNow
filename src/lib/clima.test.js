import { describe, expect, it } from 'vitest';
import {
  EMPTY_CEMADEN,
  INMET_OFFLINE,
  MONITORED,
  POPULAR,
  forecastUrl,
  formatDate,
  formatValue,
  isRaining,
  normalizeWarning,
  parseRss,
  safeExternalUrl,
} from '../lib/clima';

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