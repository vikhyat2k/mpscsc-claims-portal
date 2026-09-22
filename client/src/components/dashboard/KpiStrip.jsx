import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getTranslations } from '../../utils/translations';

function formatInr(n) {
  return '₹' + Math.round(n || 0).toLocaleString('en-IN');
}

function sparkSvg(vals, color) {
  const W = 120;
  const H = 32;
  const p = 2;
  const n = vals.length;
  const max = Math.max(...vals, 1);
  if (n < 2) {
    return (
      <svg className="spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
        <line x1="2" y1={H - 2} x2={W - 2} y2={H - 2} stroke={color} strokeWidth="1.5" strokeOpacity="0.4" />
      </svg>
    );
  }

  const getX = (i) => p + (i * (W - 2 * p)) / (n - 1);
  const getY = (v) => H - p - (v / max) * (H - 2 * p);

  const linePoints = vals.map((v, i) => `${getX(i).toFixed(1)},${getY(v).toFixed(1)}`).join(' L');
  const areaPath = `M${linePoints} L${getX(n - 1)},${H} L${getX(0)},${H} Z`;
  const strokePath = `M${linePoints}`;

  return (
    <svg className="spark" viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" aria-hidden="true">
      <path d={areaPath} style={{ fill: color, fillOpacity: 0.12 }} />
      <path
        d={strokePath}
        style={{ fill: 'none', stroke: color, strokeWidth: 1.75, strokeLinejoin: 'round', strokeLinecap: 'round' }}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default function KpiStrip({ data }) {
  const { language } = useLanguage();
  const t = getTranslations(language);

  const {
    totalClaimed = 0,
    totalClaimsCount = 0,
    employeeCount = 0,
    totalTrendSeries = [0, 0, 0, 0, 0, 0],
    totalDelta = 0,

    pendingAmount = 0,
    pendingCount = 0,
    actionNeededAmount = 0,
    draftAmount = 0,
    pendingTrendSeries = [0, 0, 0, 0, 0, 0],
    pendingDelta = 0,

    approvedAmount = 0,
    approvedCount = 0,
    awaitingPaymentAmount = 0,
    paidTrendSeries = [0, 0, 0, 0, 0, 0],
    approvedDelta = 0,

    approvalRate = null,
    approvedDecided = 0,
    rejectedDecided = 0,

    avgTurnaroundDays = null,
    targetDays = 5
  } = data || {};

  const renderDelta = (deltaPercent, tone = 'neu') => {
    if (!deltaPercent || Math.abs(deltaPercent) < 1) return null;
    const isUp = deltaPercent > 0;
    const mag = Math.abs(Math.round(deltaPercent));
    const displayMag = mag >= 300 ? '300%+' : `${mag}%`;

    let cls = 'dl neu';
    if (tone === 'warn') cls = `dl ${isUp ? 'warn' : 'good'}`;
    else if (tone === 'good') cls = `dl ${isUp ? 'good' : 'bad'}`;

    return (
      <span className={cls} title={t.dashboard.vs_prev}>
        {isUp ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
        {displayMag}
      </span>
    );
  };

  return (
    <section className="kpis" aria-label="KPIs">
      {/* 1. Total Claimed */}
      <div className="kpi">
        <div className="kl">
          <span>{t.dashboard.k_claimed}</span>
          {renderDelta(totalDelta, 'neu')}
        </div>
        <div className="kv num">{formatInr(totalClaimed)}</div>
        <div className="ks">
          <b>{totalClaimsCount}</b> {t.dashboard.claims} · <b>{employeeCount}</b> {t.dashboard.employees}
        </div>
        {sparkSvg(totalTrendSeries, 'var(--brand)')}
      </div>

      {/* 2. Pending Approval */}
      <div className="kpi">
        <div className="kl">
          <span>{t.dashboard.k_pending}</span>
          {renderDelta(pendingDelta, 'warn')}
        </div>
        <div className="kv num">{formatInr(pendingAmount)}</div>
        <div className="ks">
          {pendingCount} {t.dashboard.claims}
          <br />
          <b>{formatInr(actionNeededAmount)}</b> {language === 'hi' ? 'पर आपकी कार्रवाई आवश्यक' : 'need your action'} · {formatInr(draftAmount)} {language === 'hi' ? 'अभी ड्राफ्ट में' : 'still in draft'}
        </div>
        {sparkSvg(pendingTrendSeries, 'var(--c-review)')}
      </div>

      {/* 3. Disbursed / Approved */}
      <div className="kpi">
        <div className="kl">
          <span>{t.dashboard.k_paid}</span>
          {renderDelta(approvedDelta, 'good')}
        </div>
        <div className="kv num">{formatInr(approvedAmount)}</div>
        <div className="ks">
          {approvedCount} {language === 'hi' ? 'स्वीकृत' : 'approved'}
          {awaitingPaymentAmount > 0 && (
            <span> · {formatInr(awaitingPaymentAmount)} {language === 'hi' ? 'भुगतान लंबित' : 'awaiting payment'}</span>
          )}
        </div>
        {sparkSvg(paidTrendSeries, 'var(--c-approved)')}
      </div>

      {/* 4. Approval Rate */}
      <div className="kpi">
        <div className="kl">
          <span>{t.dashboard.k_rate}</span>
        </div>
        <div className="kv num">
          {approvalRate !== null ? (
            <>
              {approvalRate}
              <small>%</small>
            </>
          ) : (
            '—'
          )}
        </div>
        <div className="ks">
          {approvalRate !== null
            ? `${approvedDecided} ${language === 'hi' ? 'स्वीकृत' : 'approved'} · ${rejectedDecided} ${language === 'hi' ? 'अस्वीकृत' : 'rejected'}`
            : t.dashboard.k_nodec}
        </div>
        <div className="mini">
          {approvedDecided + rejectedDecided > 0 ? (
            <>
              <i style={{ flex: approvedDecided, background: 'var(--c-approved)' }} />
              <i style={{ flex: rejectedDecided, background: 'var(--c-rejected)' }} />
            </>
          ) : null}
        </div>
      </div>

      {/* 5. Avg. Turnaround */}
      <div className="kpi">
        <div className="kl">
          <span>{t.dashboard.k_tat}</span>
        </div>
        <div className="kv num">
          {avgTurnaroundDays !== null ? (
            <>
              {(Math.round(avgTurnaroundDays * 10) / 10)}
              <small>{t.dashboard.days}</small>
            </>
          ) : (
            '—'
          )}
        </div>
        <div className="ks">
          {avgTurnaroundDays !== null
            ? `${language === 'hi' ? 'लक्ष्य' : 'Target'} ${targetDays} ${t.dashboard.days}`
            : t.dashboard.k_nodec}
        </div>
        <div className="goal">
          {avgTurnaroundDays !== null && (
            <i
              style={{
                width: `${Math.min(100, (avgTurnaroundDays / 10) * 100)}%`,
                background: avgTurnaroundDays <= targetDays ? 'var(--c-approved)' : 'var(--c-review)'
              }}
            />
          )}
          <u style={{ left: '50%' }} title={`Target ${targetDays} days`} />
        </div>
      </div>
    </section>
  );
}
