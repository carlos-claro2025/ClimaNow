import type { CemadenData } from '../../lib/clima';

export type CemadenState = CemadenData & { error?: boolean };

export default function CemadenStats({ data }: { data: CemadenState }) {
  return (
    <div className="cemadem-stats">
      <div className="cemadem-title">⚠️ Alertas CEMADEN</div>
      <div className="cemadem-counts">
        <div className="cemade-card cemade-danger">
          <div className="cemade-num">{data.muitoAlto}</div>
          <div className="cemade-label">Muito Alto</div>
        </div>
        <div className="cemade-card cemade-warning">
          <div className="cemade-num">{data.alto}</div>
          <div className="cemade-label">Alto</div>
        </div>
        <div className="cemade-card cemade-moderado">
          <div className="cemade-num">{data.moderado}</div>
          <div className="cemade-label">Moderado</div>
        </div>
        <div className="cemade-card cemade-geo">
          <div className="cemade-num">{data.geo}</div>
          <div className="cemade-label">Mov. Massa</div>
        </div>
        <div className="cemade-card cemade-hidro">
          <div className="cemade-num">{data.hidro}</div>
          <div className="cemade-label">Risco Hidro.</div>
        </div>
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
