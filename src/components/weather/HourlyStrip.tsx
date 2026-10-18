import { iconFor } from '../../lib/icons';
import { formatHour, isNightHour } from '../../lib/clima';
import type { HourPoint } from '../../lib/weatherTypes';

export default function HourlyStrip({ hours }: { hours: HourPoint[] }) {
  if (hours.length === 0) return null;

  return (
    <div className="hourly">
      <div className="eyebrow" style={{ color: 'var(--primary)', marginBottom: 10 }}>
        Próximas 24 horas
      </div>
      <div className="hourly-strip">
        {hours.map((h) => (
          <div className="hourly-item" key={h.time}>
            <div className="hourly-time">{formatHour(h.time)}</div>
            <div>{iconFor(h.code ?? 0, !isNightHour(h.time))}</div>
            <div className="hourly-temp">{h.temp != null ? `${Math.round(h.temp)}°` : '--'}</div>
            {h.rainChance != null && h.rainChance > 0 && (
              <div className="hourly-rain">{h.rainChance}%</div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
