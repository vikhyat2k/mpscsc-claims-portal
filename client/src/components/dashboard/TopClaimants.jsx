import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getTranslations } from '../../utils/translations';

function formatInr(n) {
  return '₹' + Math.round(n || 0).toLocaleString('en-IN');
}

function getAvatarInitials(name = '') {
  return name
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getAvatarHue(name = '') {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = (h * 31 + name.charCodeAt(i)) % 360;
  }
  return h;
}

export default function TopClaimants({ claims = [] }) {
  const { language } = useLanguage();
  const t = getTranslations(language);

  // Group by employee
  const byEmp = {};
  claims.forEach((c) => {
    const key = c.emp || 'Unknown';
    if (!byEmp[key]) {
      byEmp[key] = {
        name: key,
        name_hi: c.emp_hi,
        count: 0,
        amount: 0
      };
    }
    byEmp[key].count += 1;
    byEmp[key].amount += c.amt || 0;
  });

  const grandTotal = claims.reduce((acc, c) => acc + (c.amt || 0), 0) || 1;
  const topList = Object.values(byEmp)
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const maxAmount = topList.length > 0 ? (topList[0].amount || 1) : 1;

  return (
    <div className="panel s4">
      <div className="ph">
        <div>
          <h2>{t.dashboard.top_title}</h2>
          <p>{t.dashboard.top_sub}</p>
        </div>
      </div>
      <div className="pb">
        {topList.length === 0 ? (
          <div className="empty">{t.dashboard.no_data}</div>
        ) : (
          topList.map((emp) => {
            const displayName = (language === 'hi' && emp.name_hi) ? emp.name_hi : emp.name;
            const pct = Math.round((emp.amount / grandTotal) * 100);
            const barWidth = Math.min(100, Math.max(1, (emp.amount / maxAmount) * 100));

            return (
              <div key={emp.name} className="brow">
                <div className="nm">
                  <span className="av sm" style={{ '--h': getAvatarHue(emp.name) }}>
                    {getAvatarInitials(emp.name)}
                  </span>
                  <div style={{ minWidth: 0 }}>
                    <b>{displayName}</b>
                    <small>
                      {emp.count} {t.dashboard.claims} · {pct}%
                    </small>
                  </div>
                </div>
                <div className="vv num">{formatInr(emp.amount)}</div>
                <div className="bar">
                  <i style={{ width: `${barWidth}%` }} />
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
