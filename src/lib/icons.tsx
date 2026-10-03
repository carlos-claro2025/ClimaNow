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
import type { ReactNode } from 'react';

const SNOW_CODES = new Set([71, 73, 75, 77, 85, 86]);
const isSnow = (code: number): boolean => SNOW_CODES.has(code);

export function iconFor(code: number, isDay = true, size = 58): ReactNode {
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

export function labelFor(code: number): string {
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