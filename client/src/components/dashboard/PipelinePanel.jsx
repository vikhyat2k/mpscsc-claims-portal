import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getTranslations } from '../../utils/translations';

function formatInr(n) {
  return '₹' + Math.round(n || 0).toLocaleString('en-IN');
}

export default function PipelinePanel({ claims = [], onSelectStage }) {
  const { language } = useLanguage();
  const t = getTranslations(language);

  // Map real statuses: 'Draft' (draft), 'SUBMITTED' (submitted), 'APPROVED' (approved), 'REJECTED' (rejected)
  const stages = [
    { key: 'draft', label: t.dashboard.st_draft, colorVar: 'var(--c-draft)', dbStatus: 'Draft' },
    { key: 'submitted', label: t.dashboard.st_submitted, colorVar: 'var(--c-submitted)', dbStatus: 'SUBMITTED' },
    { key: 'approved', label: t.dashboard.st_approved, colorVar: 'var(--c-approved)', dbStatus: 'APPROVED' },
    { key: 'rejected', label: t.dashboard.st_rejected, colorVar: 'var(--c-rejected)', dbStatus: 'REJECTED' }
  ];

  const stageData = stages.map((stg) => {
    const matching = claims.filter((c) => {
      const s = (c.status || '').toUpperCase();
      if (stg.key === 'draft') return s === 'DRAFT' || s === 'DRAFT';
      if (stg.key === 'submitted') return s === 'SUBMITTED' || s === 'REVIEW';
      if (stg.key === 'approved') return s === 'APPROVED' || s === 'PAID';
      if (stg.key === 'rejected') return s === 'REJECTED';
      return false;
    });

    const total = matching.reduce((acc, c) => acc + (c.amt || 0), 0);
    return {
      ...stg,
      count: matching.length,
      amount: total
    };
  });

  const totalValue = stageData.reduce((acc, s) => acc + s.amount, 0) || 1;

  // Active stages for the horizontal bar
  const barStages = stageData.filter((s) => s.count > 0 && s.amount > 0);

  return (
    <div className="panel s5">
      <div className="ph">
        <div>
          <h2>{t.dashboard.pipe_title}</h2>
          <p>{t.dashboard.pipe_sub}</p>
        </div>
      </div>
      <div className="pb">
        <div className="pbar">
          {barStages.length > 0 ? (
            barStages.map((s) => (
              <i
                key={s.key}
                style={{
                  flex: Math.max(s.amount, totalValue * 0.02),
                  background: s.colorVar
                }}
                title={`${s.label}: ${formatInr(s.amount)}`}
              />
            ))
          ) : (
            <i style={{ flex: 1, background: 'var(--line)' }} />
          )}
        </div>

        {/* Regular flow stages: Draft, Submitted, Approved */}
        <div className="plist">
          {stageData.slice(0, 3).map((s) => (
            <button
              key={s.key}
              type="button"
              className="prow"
              style={{ '--c': s.colorVar }}
              onClick={() => onSelectStage && onSelectStage(s.key)}
            >
              <i />
              <span>{s.label}</span>
              <span className="n num">
                {s.count} {t.dashboard.claims}
              </span>
              <span className="v num">{formatInr(s.amount)}</span>
            </button>
          ))}
        </div>

        {/* Rejected stage */}
        <div className="plist gap">
          {stageData.slice(3).map((s) => (
            <button
              key={s.key}
              type="button"
              className="prow"
              style={{ '--c': s.colorVar }}
              onClick={() => onSelectStage && onSelectStage(s.key)}
            >
              <i />
              <span>{s.label}</span>
              <span className="n num">
                {s.count} {t.dashboard.claims}
              </span>
              <span className="v num">{formatInr(s.amount)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
