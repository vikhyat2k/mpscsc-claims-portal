import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getTranslations } from '../../utils/translations';

export default function DashboardHeader({
  period,
  onPeriodChange,
  claimType,
  onClaimTypeChange
}) {
  const { language } = useLanguage();
  const t = getTranslations(language);

  const formattedDate = new Date().toLocaleDateString(
    language === 'hi' ? 'hi-IN' : 'en-IN',
    { day: 'numeric', month: 'short', year: 'numeric' }
  );

  return (
    <div className="head">
      <div>
        <h1>{t.dashboard.title}</h1>
        <p>
          {t.dashboard.sub} · {t.dashboard.asof} {formattedDate}
        </p>
      </div>

      <div className="filters">
        {/* Period Filter */}
        <div className="seg" role="group">
          <button
            type="button"
            aria-pressed={period === '30d'}
            onClick={() => onPeriodChange('30d')}
          >
            {t.dashboard.p30}
          </button>
          <button
            type="button"
            aria-pressed={period === '3m'}
            onClick={() => onPeriodChange('3m')}
          >
            {t.dashboard.p3m}
          </button>
          <button
            type="button"
            aria-pressed={period === '6m'}
            onClick={() => onPeriodChange('6m')}
          >
            {t.dashboard.p6m}
          </button>
        </div>

        {/* Claim Type Filter */}
        <div className="seg" role="group">
          <button
            type="button"
            aria-pressed={claimType === 'all'}
            onClick={() => onClaimTypeChange('all')}
          >
            {t.dashboard.ty_all}
          </button>
          <button
            type="button"
            aria-pressed={claimType === 'ta'}
            onClick={() => onClaimTypeChange('ta')}
          >
            {t.dashboard.ty_ta}
          </button>
          <button
            type="button"
            aria-pressed={claimType === 'transfer'}
            onClick={() => onClaimTypeChange('transfer')}
          >
            {t.dashboard.ty_transfer}
          </button>
          <button
            type="button"
            aria-pressed={claimType === 'medical'}
            onClick={() => onClaimTypeChange('medical')}
          >
            {t.dashboard.ty_medical}
          </button>
        </div>
      </div>
    </div>
  );
}
