import { formatDate, formatValue, uvLabel } from '../../lib/clima';
import { iconFor, labelFor } from '../../lib/icons';
import type { ForecastDay } from '../../lib/weatherTypes';

export default function ForecastGrid({ days }: { days: ForecastDay[] }) {
  return (
    <div className="forecast">
      <div className="eyebrow" style={{ color: 'var(--primary)', marginBottom: 10 }}>
        Próximos 7 dias
      </div>
      <div className="forecast-grid forecast-grid-7">
        {days.map((d) => (
          <div className="forecast-card" key={d.date}>
            <div>{formatDate(new Date(`${d.date}T00:00:00`))}</div>
            <div style={{ margin: '10px 0' }}>{iconFor(d.code, true)}</div>
            <div>{labelFor(d.code)}</div>
            <div>Máx: {formatValue(d.max, '°C')}</div>
            <div>Min: {formatValue(d.min, '°C')}</div>
            {d.rainChance != null && d.rainChance > 0 && (
              <div className="forecast-rain">Chuva: {d.rainChance}%</div>
            )}
            {d.uv != null && d.uv >= 3 && (
              <div className="forecast-uv">UV: {uvLabel(d.uv)}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
