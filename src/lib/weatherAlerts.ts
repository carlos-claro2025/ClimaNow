import type { CurrentWeather, DailyWeather } from './clima';

/** Shape accepted by NotificationService.addAlert (id/timestamp/read are added there). */
export interface WeatherAlertInput {
  title: string;
  description: string;
  link: string;
  dedupeKey: string;
}

/** WMO weather codes Open-Meteo returns, grouped by the severity we alert on. */
const SEVERE_RAIN_CODES = [65, 66, 67, 80, 81, 82];
const THUNDERSTORM_CODES = [95, 96, 99];
const RAIN_CODES = [51, 53, 55, 56, 57, 61, 63, ...SEVERE_RAIN_CODES, ...THUNDERSTORM_CODES];

/** Sustained wind above this (km/h) is worth an alert. */
const HIGH_WIND_KMH = 20;
/** UV index above this is worth an alert. */
const HIGH_UV_INDEX = 8;

const RAIN_LINK = '/chuva';

/**
 * Derives the single most severe weather alert for a city, or null when
 * conditions are unremarkable.
 *
 * Pure so the severity thresholds can be unit-tested without React or the
 * network: WeatherPage used to carry this logic inline, which left the rules
 * untestable and invisible to any other page that needs them.
 */
export function buildWeatherAlert(
  current: CurrentWeather | undefined,
  daily: DailyWeather | undefined,
  city: string,
): WeatherAlertInput | null {
  const weatherCode = current?.weather_code ?? 0;
  const precipitation = current?.precipitation ?? 0;
  const windSpeed = current?.wind_speed_10m ?? 0;
  const uvIndex = daily?.uv_index_max?.[0] ?? 0;

  const isSevereRain = SEVERE_RAIN_CODES.includes(weatherCode);
  const isThunderstorm = THUNDERSTORM_CODES.includes(weatherCode);
  const isHeavyRain = RAIN_CODES.includes(weatherCode);
  const isHighWind = windSpeed > HIGH_WIND_KMH;
  const isHighUV = uvIndex > HIGH_UV_INDEX;

  // Priority order: the most dangerous condition wins, so a thunderstorm is
  // never downgraded to "heavy rain" and heavy rain never to "wind".
  const alert = isSevereRain
    ? {
        title: 'Chuva Intensa',
        description: `Chuva intensa esperada (código ${weatherCode}, ${precipitation.toFixed(1)} mm na última hora)`,
        link: RAIN_LINK,
      }
    : isThunderstorm
      ? {
          title: 'Tempestade',
          description: `Tempestade com código ${weatherCode}`,
          link: RAIN_LINK,
        }
      : isHeavyRain
        ? {
            title: 'Chuva Forte',
            description: `Chuva forte esperada (código ${weatherCode})`,
            link: RAIN_LINK,
          }
        : isHighWind
          ? {
              title: 'Vento Forte',
              description: `Ventos de ${Math.round(windSpeed)} km/h`,
              link: '/',
            }
          : isHighUV
            ? {
                title: 'UV Alto',
                description: `Índice UV alto (${Math.round(uvIndex)})`,
                link: '/',
              }
            : null;

  if (!alert) return null;

  // The city keeps one city's storm from silencing another's, and the title
  // keeps distinct conditions for the same city independent.
  return { ...alert, dedupeKey: `${city}|${alert.title}` };
}
