import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getTranslations } from '../../utils/translations';

function formatInr(n) {
  return '₹' + Math.round(n || 0).toLocaleString('en-IN');
}

export default function OfficeBreakdown({ offices = [] }) {
  const { language } = useLanguage();
  const t = getTranslations(language);

  // If no office / issue centre field exists, do not render
  if (!offices || offices.length === 0) {
    return null;
  }

  const maxAmount = Math.max(...offices.map((o) => o.amount || 0), 1);

  return (
    <div className="panel s4">
      <div className="ph">
        <div>
          <h2>{t.dashboard.off_title}</h2>
          <p>{t.dashboard.off_sub}</p>
        </div>
      </div>
      <div className="pb">
        {offices.map((off) => {
          const barWidth = Math.min(100, Math.max(1, (off.amount / maxAmount) * 100));
          return (
            <div key={off.name} className="brow">
              <div className="nm">
                <div style={{ minWidth: 0 }}>
                  <b>{language === 'hi' && off.name_hi ? off.name_hi : off.name}</b>
                  <small>
                    {off.count} {t.dashboard.claims}
                  </small>
                </div>
              </div>
              <div className="vv num">{formatInr(off.amount)}</div>
              <div className="bar">
                <i style={{ width: `${barWidth}%`, '--c': 'var(--t-transfer)' }} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
