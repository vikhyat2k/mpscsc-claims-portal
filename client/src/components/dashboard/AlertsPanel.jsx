import React from 'react';
import { AlertTriangle, Clock, Info } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getTranslations } from '../../utils/translations';

function formatInr(n) {
  return '₹' + Math.round(n || 0).toLocaleString('en-IN');
}

function getDaysWaiting(dateStr) {
  if (!dateStr) return 0;
  const d = new Date(dateStr);
  const diff = Date.now() - d.getTime();
  return Math.max(0, Math.round(diff / 864e5));
}

export default function AlertsPanel({ claims = [] }) {
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

  // Derive real alerts
  const alertsList = [];

  // Alert 1: Submitted claim with ₹0 amount
  const zeroClaims = claims.filter(
    (c) => (c.status === 'SUBMITTED' || c.status === 'review') && (c.amt || 0) === 0
  );
  zeroClaims.forEach((c) => {
    const displayName = (language === 'hi' && c.emp_hi) ? c.emp_hi : c.emp;
    alertsList.push({
      key: `zero-${c.id}`,
      severity: 'bad',
      icon: AlertTriangle,
      colorVar: 'var(--c-rejected)',
      title: language === 'hi'
        ? `${displayName} का ${getTypeName(c.type)} दावा ${c.id} ₹0 राशि के साथ प्रस्तुत हुआ`
        : `${displayName}’s ${getTypeName(c.type)} claim ${c.id} was submitted with ₹0`,
      description: t.dashboard.a_zero_d
    });
  });

  // Alert 2: Longest waiting pending claim (>= 14 days)
  const pendingClaims = claims.filter(
    (c) => (c.status === 'SUBMITTED' || c.status === 'review') && (c.amt || 0) > 0
  );
  const oldestPending = [...pendingClaims].sort((a, b) => {
    const da = new Date(a.date || a.created_at || 0).getTime();
    const db = new Date(b.date || b.created_at || 0).getTime();
    return da - db;
  })[0];

  if (oldestPending) {
    const waitingDays = getDaysWaiting(oldestPending.date);
    if (waitingDays >= 10) {
      const displayName = (language === 'hi' && oldestPending.emp_hi) ? oldestPending.emp_hi : oldestPending.emp;
      alertsList.push({
        key: `old-${oldestPending.id}`,
        severity: 'warn',
        icon: Clock,
        colorVar: 'var(--c-review)',
        title: language === 'hi'
          ? `${oldestPending.id} · ${formatInr(oldestPending.amt)} ${waitingDays} दिन से लंबित है`
          : `${oldestPending.id} · ${formatInr(oldestPending.amt)} has waited ${waitingDays} days`,
        description: language === 'hi'
          ? `${displayName} का ${getTypeName(oldestPending.type)} दावा आपके सबसे पुराने लंबित निर्णयों में है।`
          : `${displayName}’s ${getTypeName(oldestPending.type)} claim is your oldest open decision.`
      });
    }
  }

  // Alert 3: Claimant concentration (>40% of total claimed value)
  const byEmp = {};
  claims.forEach((c) => {
    const key = c.emp || 'Unknown';
    if (!byEmp[key]) byEmp[key] = { name: key, name_hi: c.emp_hi, total: 0, count: 0 };
    byEmp[key].total += c.amt || 0;
    byEmp[key].count += 1;
  });

  const grandTotal = claims.reduce((acc, c) => acc + (c.amt || 0), 0);
  const topClaimant = Object.values(byEmp).sort((a, b) => b.total - a.total)[0];

  if (topClaimant && grandTotal > 0 && Object.keys(byEmp).length > 2) {
    const pct = Math.round((topClaimant.total / grandTotal) * 100);
    if (pct >= 40) {
      const displayName = (language === 'hi' && topClaimant.name_hi) ? topClaimant.name_hi : topClaimant.name;
      alertsList.push({
        key: `conc-${topClaimant.name}`,
        severity: 'info',
        icon: Info,
        colorVar: 'var(--c-submitted)',
        title: language === 'hi'
          ? `कुल दावा राशि का ${pct}% ${displayName} का है`
          : `${displayName} accounts for ${pct}% of claimed value`,
        description: language === 'hi'
          ? `${topClaimant.count} दावों में ${formatInr(topClaimant.total)} — सहायक बिलों की जाँच उचित होगी।`
          : `${formatInr(topClaimant.total)} across ${topClaimant.count} claims — worth checking supporting bills.`
      });
    }
  }

  // Alert 4: Aging unsubmitted drafts
  const drafts = claims.filter((c) => (c.status || '').toUpperCase() === 'DRAFT');
  if (drafts.length >= 3) {
    const oldestDraftDays = Math.max(...drafts.map((d) => getDaysWaiting(d.date)));
    if (oldestDraftDays >= 14) {
      const draftTotal = drafts.reduce((acc, c) => acc + (c.amt || 0), 0);
      alertsList.push({
        key: 'drafts-aging',
        severity: 'info',
        icon: Info,
        colorVar: 'var(--c-submitted)',
        title: language === 'hi'
          ? `${drafts.length} ड्राफ्ट (${formatInr(draftTotal)}) अभी प्रस्तुत नहीं हुए`
          : `${drafts.length} drafts (${formatInr(draftTotal)}) haven’t been submitted`,
        description: language === 'hi'
          ? `सबसे पुराना ${oldestDraftDays} दिन पुराना है। दावेदारों को प्रस्तुत करने हेतु स्मरण कराएँ।`
          : `The oldest is ${oldestDraftDays} days old. Remind claimants to submit.`
      });
    }
  }

  return (
    <div className="panel" id="alerts">
      <div className="ph" style={{ paddingBottom: '8px' }}>
        <div>
          <h2>{t.dashboard.al_title}</h2>
          <p>{t.dashboard.al_sub}</p>
        </div>
      </div>

      {alertsList.length === 0 ? (
        <div className="empty">{t.dashboard.al_none}</div>
      ) : (
        alertsList.map((alert) => {
          const IconComp = alert.icon;
          return (
            <div key={alert.key} className="al" style={{ '--c': alert.colorVar }}>
              <span className="ic">
                <IconComp size={15} />
              </span>
              <div>
                <b>{alert.title}</b>
                <span>{alert.description}</span>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
