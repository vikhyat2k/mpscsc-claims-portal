import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getTranslations } from '../../utils/translations';

function formatInr(n) {
  return '₹' + Math.round(n || 0).toLocaleString('en-IN');
}

export default function TypeDonut({ claims = [] }) {
  const { language } = useLanguage();
  const t = getTranslations(language);

  const types = [
    { key: 'ta', label: t.dashboard.ty_ta, colorVar: 'var(--t-ta)' },
    { key: 'transfer', label: t.dashboard.ty_transfer, colorVar: 'var(--t-transfer)' },
    { key: 'medical', label: t.dashboard.ty_medical, colorVar: 'var(--t-medical)' }
  ];

  const typeRows = types.map((type) => {
    const matching = claims.filter((c) => {
      const ct = (c.type || c.claim_type || '').toLowerCase();
      if (type.key === 'ta') return ct === 'ta' || ct === 'ta_da';
      if (type.key === 'transfer') return ct === 'transfer';
      if (type.key === 'medical') return ct === 'medical';
      return false;
    });

    const totalAmt = matching.reduce((acc, c) => acc + (c.amt || 0), 0);
    return {
      ...type,
      count: matching.length,
      amount: totalAmt
    };
  });

  const grandTotal = typeRows.reduce((acc, r) => acc + r.amount, 0);
  const totalClaimsCount = typeRows.reduce((acc, r) => acc + r.count, 0);

  // Donut geometry
  const R = 62;
  const C = 2 * Math.PI * R; // ~389.55
  let runningOffset = 0;

  const slices = typeRows.map((r) => {
    if (!r.amount || grandTotal === 0) return null;
    const len = Math.max((r.amount / grandTotal) * C - 3, 1);
    const offset = runningOffset;
    runningOffset += (r.amount / grandTotal) * C;

    return (
      <circle
        key={r.key}
        cx="85"
        cy="85"
        r={R}
        fill="none"
        strokeWidth="16"
        style={{ stroke: r.colorVar }}
        strokeDasharray={`${len.toFixed(2)} ${(C - len).toFixed(2)}`}
        strokeDashoffset={(-offset).toFixed(2)}
        transform="rotate(-90 85 85)"
      >
        <title>{`${r.label}: ${formatInr(r.amount)}`}</title>
      </circle>
    );
  });

  return (
    <div className="panel s4t">
      <div className="ph">
        <div>
          <h2>{t.dashboard.type_title}</h2>
          <p>{t.dashboard.type_sub}</p>
        </div>
      </div>
      <div className="pb">
        <div className="donut">
          <svg viewBox="0 0 170 170" role="img" aria-label={t.dashboard.type_title}>
            <circle cx="85" cy="85" r={R} fill="none" strokeWidth="16" style={{ stroke: 'var(--surface-2)' }} />
            {slices}
            <text
              x="85"
              y="80"
              textAnchor="middle"
              style={{ fill: 'var(--text)', font: '600 19px var(--font)' }}
            >
              {formatInr(grandTotal)}
            </text>
            <text x="85" y="99" textAnchor="middle" className="ax">
              {totalClaimsCount} {t.dashboard.claims}
            </text>
          </svg>

          <div className="dlist">
            {typeRows.map((r) => {
              const pct = grandTotal > 0 ? Math.round((r.amount / grandTotal) * 100) : 0;
              return (
                <div key={r.key} className="drow" style={{ '--c': r.colorVar }}>
                  <i />
                  <div>
                    <b style={{ fontWeight: 500 }}>{r.label}</b>
                    <small>
                      {r.count} {t.dashboard.claims} · {pct}%
                    </small>
                  </div>
                  <div className="r num">{formatInr(r.amount)}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
