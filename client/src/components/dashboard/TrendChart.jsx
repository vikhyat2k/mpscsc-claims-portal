import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getTranslations } from '../../utils/translations';

function formatInr(n) {
  return '₹' + Math.round(n || 0).toLocaleString('en-IN');
}

function shortNum(n) {
  if (n >= 1e5) return Math.round((n / 1e4)) / 10 + 'L';
  if (n >= 1e3) return Math.round((n / 100)) / 10 + 'k';
  return String(Math.round(n));
}

function niceMax(v) {
  if (v <= 0) return 1000;
  const p = Math.pow(10, Math.floor(Math.log10(v)));
  const m = v / p;
  const factor = m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10;
  return factor * p;
}

export default function TrendChart({ claims = [], period = '6m' }) {
  const { language } = useLanguage();
  const t = getTranslations(language);
  const [trendMode, setTrendMode] = useState('amt'); // 'amt' | 'cnt'

  const isAmt = trendMode === 'amt';

  // Compute month buckets based on period
  const monthCount = period === '30d' ? 1 : period === '3m' ? 3 : 6;
  const now = new Date();

  // Create array of month start/end bounds
  const buckets = [];
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const start = new Date(d.getFullYear(), d.getMonth(), 1);
    const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
    const label = start.toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN', { month: 'short' });
    buckets.push({ start, end, label, yearMonth: `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}` });
  }

  // Aggregate claims into buckets by outcome
  const rows = buckets.map((b) => {
    const inBucket = claims.filter((c) => {
      const cd = new Date(c.date);
      return cd >= b.start && cd <= b.end;
    });

    const getVal = (filterFn) => {
      const filtered = inBucket.filter(filterFn);
      return isAmt ? filtered.reduce((acc, c) => acc + (c.amt || 0), 0) : filtered.length;
    };

    const approved = getVal((c) => {
      const s = (c.status || '').toUpperCase();
      return s === 'APPROVED' || s === 'PAID';
    });

    const pending = getVal((c) => {
      const s = (c.status || '').toUpperCase();
      return s === 'SUBMITTED' || s === 'DRAFT' || s === 'REVIEW';
    });

    const rejected = getVal((c) => {
      const s = (c.status || '').toUpperCase();
      return s === 'REJECTED';
    });

    return {
      label: b.label,
      approved,
      pending,
      rejected,
      total: approved + pending + rejected
    };
  });

  const maxTotal = Math.max(...rows.map((r) => r.total), 0);
  const chartMax = isAmt ? niceMax(maxTotal || 50000) : Math.max(4, Math.ceil((maxTotal || 4) / 4) * 4);

  const W = 560;
  const H = 250;
  const pl = 46;
  const pr = 6;
  const pt = 14;
  const pb = 28;
  const iw = W - pl - pr;
  const ih = H - pt - pb;
  const bw = Math.min(46, (iw / rows.length) * 0.55);

  const formatVal = (v) => (isAmt ? formatInr(v) : v);
  const formatShort = (v) => (isAmt ? '₹' + shortNum(v) : v);

  return (
    <div className="panel s8">
      <div className="ph">
        <div>
          <h2>{t.dashboard.trend_title}</h2>
          <p>{t.dashboard.trend_sub}</p>
        </div>
        <div className="seg" role="group">
          <button
            type="button"
            aria-pressed={isAmt}
            onClick={() => setTrendMode('amt')}
          >
            {t.dashboard.amt_lbl}
          </button>
          <button
            type="button"
            aria-pressed={!isAmt}
            onClick={() => setTrendMode('cnt')}
          >
            {t.dashboard.cnt_lbl}
          </button>
        </div>
      </div>

      <div className="pb">
        <div className="legend" style={{ marginBottom: '10px' }}>
          <span style={{ '--c': 'var(--c-approved)' }}>
            <i />
            {t.dashboard.st_approved}
          </span>
          <span style={{ '--c': 'var(--c-review)' }}>
            <i />
            {t.dashboard.pend_short}
          </span>
          <span style={{ '--c': 'var(--c-rejected)' }}>
            <i />
            {t.dashboard.st_rejected}
          </span>
        </div>

        <div className="chart">
          {maxTotal === 0 && claims.length === 0 ? (
            <div className="empty">{t.dashboard.no_data}</div>
          ) : (
            <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={t.dashboard.trend_title}>
              {/* Grid Lines and Y-Axis Labels */}
              {[0, 1, 2, 3, 4].map((step) => {
                const val = (chartMax / 4) * step;
                const y = pt + ih - (val / chartMax) * ih;
                return (
                  <React.Fragment key={step}>
                    <line x1={pl} x2={W - pr} y1={y} y2={y} className="gl" />
                    <text x={pl - 8} y={y + 4} className="ax" textAnchor="end">
                      {isAmt ? shortNum(val) : val}
                    </text>
                  </React.Fragment>
                );
              })}

              {/* Stacked Columns for Each Month */}
              {rows.map((r, i) => {
                const cx = pl + (iw / rows.length) * (i + 0.5);
                const x = cx - bw / 2;
                let currentY = pt + ih;

                // Segments: Approved (bottom), Pending (middle), Rejected (top)
                const segs = [
                  { val: r.approved, cls: 'sa', title: t.dashboard.st_approved },
                  { val: r.pending, cls: 'sp', title: t.dashboard.pend_short },
                  { val: r.rejected, cls: 'sr', title: t.dashboard.st_rejected }
                ];

                const rectElements = segs.map((seg, sIdx) => {
                  if (!seg.val) return null;
                  const segHeight = (seg.val / chartMax) * ih;
                  currentY -= segHeight;
                  return (
                    <rect
                      key={sIdx}
                      x={x.toFixed(1)}
                      y={currentY.toFixed(1)}
                      width={bw.toFixed(1)}
                      height={Math.max(segHeight - 1, 1).toFixed(1)}
                      rx={2}
                      className={seg.cls}
                    >
                      <title>{`${r.label} · ${seg.title}: ${formatVal(seg.val)}`}</title>
                    </rect>
                  );
                });

                return (
                  <g key={i}>
                    {rectElements}
                    {r.total > 0 && (
                      <text x={cx.toFixed(1)} y={(currentY - 6).toFixed(1)} className="tv" textAnchor="middle">
                        {formatShort(r.total)}
                      </text>
                    )}
                    <text x={cx.toFixed(1)} y={H - 8} className="ax" textAnchor="middle">
                      {r.label}
                    </text>
                  </g>
                );
              })}
            </svg>
          )}
        </div>
      </div>
    </div>
  );
}
