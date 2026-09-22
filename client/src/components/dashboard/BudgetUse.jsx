import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getTranslations } from '../../utils/translations';

function formatInr(n) {
  return '₹' + Math.round(n || 0).toLocaleString('en-IN');
}

export default function BudgetUse({ budgets = null }) {
  const { language } = useLanguage();
  const t = getTranslations(language);

  // If no budgets exist in the database, do not render
  if (!budgets || !budgets.rows || budgets.rows.length === 0) {
    return null;
  }

  const { pace = 50, rows = [] } = budgets;

  return (
    <div className="panel s4 s4w">
      <div className="ph">
        <div>
          <h2>{t.dashboard.bud_title}</h2>
          <p>{t.dashboard.bud_sub}</p>
        </div>
      </div>
      <div className="pb">
        {rows.map((b) => {
          const donePct = Math.min(100, (b.done / b.bud) * 100);
          const pendPct = Math.min(100 - donePct, (b.pend / b.bud) * 100);

          return (
            <div key={b.ty} className="brow">
              <div className="nm">
                <div style={{ minWidth: 0 }}>
                  <b>{b.label || b.ty}</b>
                  <small className="num">
                    {formatInr(b.done + b.pend)} {t.dashboard.bud_of} {formatInr(b.bud)}
                  </small>
                </div>
              </div>
              <div className="vv num">{b.used}%</div>
              <div className="bar" style={{ '--c': `var(--t-${b.ty})` }}>
                <i style={{ width: `${donePct}%` }} />
                <i className="lt" style={{ left: `${donePct}%`, width: `${pendPct}%` }} />
                <u style={{ left: `${pace}%` }} title={`Year pace ${pace}%`} />
              </div>
            </div>
          );
        })}
        <div className="ks" style={{ marginTop: '2px' }}>
          {language === 'hi' ? `वर्ष की गति ${pace}%` : `Year pace ${pace}%`}
        </div>
      </div>
    </div>
  );
}
