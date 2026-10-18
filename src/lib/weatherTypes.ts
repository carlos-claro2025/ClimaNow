// View models shared between WeatherPage and the presentational components it
// renders. They are deliberately separate from the raw Open-Meteo shapes in
// clima.ts: these are already-normalised, null-tolerant values ready to render.
export interface WeatherData {
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

export interface ForecastDay {
  date: string;
  code: number;
  max: number;
  min: number;
  rainChance: number | null;
  uv: number | null;
}

export interface HourPoint {
  time: string;
  temp: number | null;
  rainChance: number | null;
  code: number | null;
}

export interface Place {
  name: string | null;
  temp: number | null;
}
