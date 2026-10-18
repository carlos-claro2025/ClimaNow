import { describe, expect, it } from 'vitest';
import { buildWeatherAlert } from './weatherAlerts';
import type { CurrentWeather, DailyWeather } from './clima';

const current = (over: Partial<CurrentWeather> = {}): CurrentWeather => ({
  weather_code: 0,
  precipitation: 0,
  wind_speed_10m: 0,
  ...over,
});

const daily = (uv?: number): DailyWeather => (uv === undefined ? {} : { uv_index_max: [uv] });

describe('buildWeatherAlert', () => {
  it('returns null for calm conditions', () => {
    expect(buildWeatherAlert(current(), daily(3), 'Goiânia')).toBeNull();
  });

  it('returns null when the API omits every field', () => {
    expect(buildWeatherAlert(undefined, undefined, 'Goiânia')).toBeNull();
  });

  it('reports severe rain with the hourly accumulation', () => {
    const alert = buildWeatherAlert(current({ weather_code: 82, precipitation: 12.34 }), daily(2), 'Recife');
    expect(alert).toEqual({
      title: 'Chuva Intensa',
      description: 'Chuva intensa esperada (código 82, 12.3 mm na última hora)',
      link: '/chuva',
      dedupeKey: 'Recife|Chuva Intensa',
    });
  });

  it('reports a thunderstorm and links to the rain page', () => {
    const alert = buildWeatherAlert(current({ weather_code: 95 }), daily(2), 'Curitiba');
    expect(alert?.title).toBe('Tempestade');
    expect(alert?.description).toBe('Tempestade com código 95');
    expect(alert?.link).toBe('/chuva');
  });

  it('reports ordinary rain codes as heavy rain', () => {
    const alert = buildWeatherAlert(current({ weather_code: 61 }), daily(2), 'Salvador');
    expect(alert?.title).toBe('Chuva Forte');
    expect(alert?.description).toBe('Chuva forte esperada (código 61)');
  });

  it('reports high wind with the rounded speed', () => {
    const alert = buildWeatherAlert(current({ wind_speed_10m: 37.6 }), daily(2), 'Porto Alegre');
    expect(alert).toEqual({
      title: 'Vento Forte',
      description: 'Ventos de 38 km/h',
      link: '/',
      dedupeKey: 'Porto Alegre|Vento Forte',
    });
  });

  it('reports a high UV index', () => {
    const alert = buildWeatherAlert(current(), daily(11), 'Fortaleza');
    expect(alert?.title).toBe('UV Alto');
    expect(alert?.description).toBe('Índice UV alto (11)');
    expect(alert?.link).toBe('/');
  });

  it('treats the thresholds as exclusive', () => {
    // Exactly at the limit is not an alert; one unit above is.
    expect(buildWeatherAlert(current({ wind_speed_10m: 20 }), daily(8), 'São Paulo')).toBeNull();
    expect(buildWeatherAlert(current({ wind_speed_10m: 20.1 }), daily(8), 'São Paulo')).not.toBeNull();
    expect(buildWeatherAlert(current(), daily(8.1), 'São Paulo')).not.toBeNull();
  });

  it('prefers the most dangerous condition when several apply', () => {
    // Thunderstorm code with storm-force wind and extreme UV: only the
    // thunderstorm is reported, never a lesser label.
    const alert = buildWeatherAlert(
      current({ weather_code: 99, wind_speed_10m: 90 }),
      daily(11),
      'Manaus',
    );
    expect(alert?.title).toBe('Tempestade');
  });

  it('prefers severe rain over thunderstorm and wind', () => {
    const alert = buildWeatherAlert(
      current({ weather_code: 67, wind_speed_10m: 90 }),
      daily(11),
      'Manaus',
    );
    expect(alert?.title).toBe('Chuva Intensa');
  });

  it('scopes the dedupe key per city and per condition', () => {
    const a = buildWeatherAlert(current({ wind_speed_10m: 40 }), daily(2), 'A');
    const b = buildWeatherAlert(current({ wind_speed_10m: 40 }), daily(2), 'B');
    const c = buildWeatherAlert(current(), daily(10), 'A');
    expect(a?.dedupeKey).toBe('A|Vento Forte');
    expect(b?.dedupeKey).toBe('B|Vento Forte');
    expect(c?.dedupeKey).toBe('A|UV Alto');
    expect(a?.dedupeKey).not.toBe(c?.dedupeKey);
  });

  it('ignores a missing daily block when reading the UV index', () => {
    expect(buildWeatherAlert(current(), undefined, 'A')).toBeNull();
    expect(buildWeatherAlert(current(), {}, 'A')).toBeNull();
  });
});
