import type { CemadenData } from '../../lib/clima';

export type CemadenState = CemadenData & { error?: boolean };

export default function CemadenStats({ data }: { data: CemadenState }) {
  const hasAlerts = data.muitoAlto > 0 || data.alto > 0 || data.moderado > 0 || data.geo > 0 || data.hidro > 0;

  return (
    <div className="cemadem-stats" style={{ opacity: hasAlerts ? 1 : 0.6, transition: 'opacity 0.3s ease' }}>
      <div className="cemadem-title">⚠️ Alertas CEMADEN</div>
      <div className="cemadem-counts">
        <div className="cemade-card cemade-danger" title="Risco Muito Alto de desastres naturais">
          <div className="cemade-num">{data.muitoAlto > 0 ? `!!! ${data.muitoAlto}` : data.muitoAlto}</div>
          <div className="cemade-label">Muito Alto</div>
        </div>
        <div className="cemade-card cemade-warning" title="Risco Alto de desastres naturais">
          <div className="cemade-num">{data.alto > 0 ? `!! ${data.alto}` : data.alto}</div>
          <div className="cemade-label">Alto</div>
        </div>
        <div className="cemade-card cemade-moderado" title="Risco Moderado de desastres naturais">
          <div className="cemade-num">{data.moderado > 0 ? `! ${data.moderado}` : data.moderado}</div>
          <div className="cemade-label">Moderado</div>
        </div>
        <div className="cemade-card cemade-geo" title="Movimentação de Massa: Risco de deslizamentos de terra">
          <div className="cemade-num">{data.geo}</div>
          <div className="cemade-label">Mov. Massa</div>
        </div>
        <div className="cemade-card cemade-hidro" title="Risco Hidrológico: Risco de inundações e enchentes">
          <div className="cemade-num">{data.hidro}</div>
          <div className="cemade-label">Risco Hidro.</div>
        </div>
      </div>
      <div style={{ textAlign: 'center', marginTop: 8 }}>
        <a 
          href="https://www.cemaden.gov.br/" 
          target="_blank" 
          rel="noopener noreferrer" 
          style={{ fontSize: 11, color: 'var(--primary)', textDecoration: 'none', opacity: 0.8 }}
          onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
          onMouseLeave={(e) => e.currentTarget.style.opacity = '0.8'}
        >
          Ver mapa completo no CEMADEN →
        </a>
      </div>
      {data.error && (
        <div style={{ color: '#fbbf24', fontSize: 12, marginTop: 8, textAlign: 'center' }}>
          Não foi possível carregar dados do CEMADEN
        </div>
      )}
      {data.atualizado && !data.error && (
        <div style={{ color: 'var(--muted)', fontSize: 11, marginTop: 6, textAlign: 'center' }}>
          Atualizado: {data.atualizado}
        </div>
      )}
    </div>
  );
}
