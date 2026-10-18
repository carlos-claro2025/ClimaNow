import Clock from '../Clock';
import { formatValue, windDirectionLabel } from '../../lib/clima';
import type { WeatherData } from '../../lib/weatherTypes';

// `pending` is true only on the very first load, so the readings show dashes
// instead of flickering back to zero on every refresh.
export default function CurrentMetrics({
  weather,
  pending,
}: {
  weather: WeatherData | null;
  pending: boolean;
}) {
  return (
    <div className="metrics">
      <div className="metric">
        <div className="label">Vento</div>
        <div className="value">{pending ? '-- km/h' : formatValue(weather?.wind ?? 0, 'km/h')}</div>
        {!pending && weather?.windDirection != null && (
          <div className="metric-sub">{windDirectionLabel(weather.windDirection)}</div>
        )}
      </div>
      <div className="metric">
        <div className="label">Rajadas</div>
        <div className="value">{pending ? '-- km/h' : formatValue(weather?.gusts ?? 0, 'km/h')}</div>
      </div>
      <div className="metric">
        <div className="label">Umidade</div>
        <div className="value">{pending ? '-- %' : formatValue(weather?.humidity ?? 0, '%', 0)}</div>
      </div>
      <div className="metric">
        <div className="label">Pressão</div>
        <div className="value">{pending ? '-- hPa' : formatValue(weather?.pressure ?? 0, 'hPa', 0)}</div>
      </div>
      <div className="metric">
        <div className="label">Nuvens</div>
        <div className="value">{pending ? '-- %' : formatValue(weather?.cloudCover ?? 0, '%', 0)}</div>
      </div>
      <div className="metric">
        <div className="label">Chuva (1h)</div>
        <div className="value">{pending ? '-- mm' : formatValue(weather?.precipitation ?? 0, 'mm')}</div>
      </div>
      <div className="metric">
        <div className="label">Relógio</div>
        <div className="value">
          <Clock />
        </div>
      </div>
      <div className="metric">
        <div className="label">Fonte</div>
        <div className="value" style={{ fontSize: '0.8rem' }}>
          Open-Meteo
        </div>
      </div>
    </div>
  );
}
