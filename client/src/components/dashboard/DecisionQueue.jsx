import React from 'react';
import { Check, RotateCcw, ChevronRight, Printer } from 'lucide-react';
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

function getDaysWaiting(dateStr) {
  if (!dateStr) return 0;
  const diff = Date.now() - new Date(dateStr).getTime();
  return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

export default function DecisionQueue({
  claims = [],
  onApprove,
  onReturn,
  onPrint,
  onOpenRegister
}) {
  const { language } = useLanguage();
  const t = getTranslations(language);

  // Filter only claims waiting for decision (SUBMITTED or REVIEW)
  const pendingClaims = claims.filter((c) => {
    const s = (c.status || '').toUpperCase();
    return s === 'SUBMITTED' || s === 'REVIEW';
  });

  const totalPendingAmount = pendingClaims.reduce((acc, c) => acc + (c.amt || 0), 0);

  const topQueue = pendingClaims.slice(0, 5);

  const getTypeColor = (type = '') => {
    const norm = type.toLowerCase();
    if (norm === 'ta' || norm === 'ta_da') return 'var(--t-ta)';
    if (norm === 'transfer') return 'var(--t-transfer)';
    if (norm === 'medical') return 'var(--t-medical)';
    return 'var(--t-diary)';
  };

  const getTypeName = (type = '') => {
    const norm = type.toLowerCase();
    switch (norm) {
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

  return (
    <div className="panel s7" id="queue">
      <div className="ph">
        <div>
          <h2>{t.dashboard.q_title}</h2>
          <p>
            {pendingClaims.length} {t.dashboard.claims} · {formatInr(totalPendingAmount)}{' '}
            {language === 'hi' ? 'स्वीकृति हेतु लंबित' : 'awaiting approval'}
          </p>
        </div>
        <button type="button" className="btn sm ghost" onClick={onOpenRegister}>
          {t.dashboard.q_open}
          <ChevronRight size={16} />
        </button>
      </div>

      {topQueue.length === 0 ? (
        <div className="empty">
          <b>{t.dashboard.q_empty_t}</b>
          {t.dashboard.q_empty}
        </div>
      ) : (
        <>
          <div className="qlist">
            {topQueue.map((claim) => {
              const displayName = (language === 'hi' && claim.emp_hi) ? claim.emp_hi : claim.emp;
              const days = getDaysWaiting(claim.date);
              const isZero = claim.amt === 0;

              return (
                <div key={claim.id || claim.raw_id} className="qi">
                  <span className="av" style={{ '--h': getAvatarHue(claim.emp) }}>
                    {getAvatarInitials(claim.emp)}
                  </span>
                  <div className="qm">
                    <div style={{ margin: 0, color: 'inherit', fontSize: 'inherit' }}>
                      <b>{displayName}</b>
                      <span className="chip" style={{ '--c': getTypeColor(claim.type) }}>
                        {getTypeName(claim.type)}
                      </span>
                    </div>
                    <div>
                      {claim.id} ·{' '}
                      {isZero ? (
                        <span className="flag bad">{t.dashboard.f_zero}</span>
                      ) : (
                        <span className={`flag ${days >= 14 ? 'warn' : ''}`}>
                          {language === 'hi' ? `${days} दिन से लंबित` : `Waiting ${days} days`}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="amt num">{formatInr(claim.amt)}</div>
                  <div className="acts">
                    {onPrint && (
                      <button
                        type="button"
                        className="btn sm"
                        style={{ padding: '0.35rem 0.55rem' }}
                        title={language === 'hi' ? 'शासकीय प्रारूप में देयक देखें / प्रिंट करें' : 'View / Print in Govt Prescribed Format'}
                        onClick={() => onPrint(claim)}
                      >
                        <Printer size={14} />
                        {language === 'hi' ? 'देयक' : 'Bill'}
                      </button>
                    )}
                    <button
                      type="button"
                      className="btn sm pri"
                      disabled={isZero}
                      title={isZero ? t.dashboard.f_zero_tip : t.dashboard.approve}
                      onClick={() => onApprove(claim)}
                    >
                      <Check size={14} />
                      {t.dashboard.approve}
                    </button>
                    <button
                      type="button"
                      className="btn sm"
                      onClick={() => onReturn(claim)}
                    >
                      <RotateCcw size={14} />
                      {t.dashboard.ret}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          {pendingClaims.length > 5 && (
            <div className="qf">
              <span>
                {language === 'hi'
                  ? `रजिस्टर में ${pendingClaims.length - 5} और लंबित`
                  : `+${pendingClaims.length - 5} more waiting in the register`}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
