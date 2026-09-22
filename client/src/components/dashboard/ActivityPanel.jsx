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

function getRelativeTime(dateStr, t) {
  if (!dateStr) return t.dashboard.today;
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  const days = Math.max(0, Math.round(diff / 864e5));

  if (days <= 0) return t.dashboard.today;
  if (days === 1) return t.dashboard.yday;
  return `${days} ${t.dashboard.days_ago}`;
}

export default function ActivityPanel({ claims = [] }) {
  const { language } = useLanguage();
  const t = getTranslations(language);

  const getTypeName = (type) => {
    switch ((type || '').toLowerCase()) {
      case 'ta':
      case 'ta_da':
        return t.dashboard.ty_ta;
      case 'transfer':
        return t.dashboard.ty_transfer;
      case 'medical':
        return t.dashboard.ty_medical;
      default:
        return t.dashboard.ty_diary;
    }
  };

  const getEventName = (status) => {
    const s = (status || '').toUpperCase();
    if (s === 'DRAFT') return t.dashboard.ev_draft;
    if (s === 'SUBMITTED') return t.dashboard.ev_submitted;
    if (s === 'REVIEW') return t.dashboard.ev_review;
    if (s === 'APPROVED' || s === 'PAID') return t.dashboard.ev_approved;
    if (s === 'REJECTED') return t.dashboard.ev_rejected;
    return t.dashboard.ev_draft;
  };

  // Recent 5 claims sorted by date descending
  const recentEvents = [...claims]
    .sort((a, b) => {
      const da = new Date(a.date || a.created_at || 0).getTime();
      const db = new Date(b.date || b.created_at || 0).getTime();
      return db - da;
    })
    .slice(0, 5);

  return (
    <div className="panel">
      <div className="ph" style={{ paddingBottom: '8px' }}>
        <div>
          <h2>{t.dashboard.act_title}</h2>
        </div>
      </div>

      <div style={{ paddingBottom: '8px' }}>
        {recentEvents.length === 0 ? (
          <div className="empty">{t.dashboard.no_data}</div>
        ) : (
          recentEvents.map((c) => {
            const displayName = (language === 'hi' && c.emp_hi) ? c.emp_hi : c.emp;
            const timeTag = getRelativeTime(c.date, t);

            return (
              <div key={c.id || c.raw_id} className="act">
                <span className="av sm" style={{ '--h': getAvatarHue(c.emp) }}>
                  {getAvatarInitials(c.emp)}
                </span>
                <div>
                  <b>{displayName}</b>
                  <small>
                    {getTypeName(c.type)} · {getEventName(c.status)} · {formatInr(c.amt)}
                  </small>
                </div>
                <span className="t">{timeTag}</span>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
