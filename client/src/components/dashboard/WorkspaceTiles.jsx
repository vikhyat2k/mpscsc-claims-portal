import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, ArrowLeftRight, HeartPulse, FileSpreadsheet, ArrowUpRight } from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getTranslations } from '../../utils/translations';

function formatInr(n) {
  return '₹' + Math.round(n || 0).toLocaleString('en-IN');
}

export default function WorkspaceTiles({ counts, amounts }) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = getTranslations(language);

  const tiles = [
    {
      id: 'ta',
      title: t.dashboard.w_ta_t,
      desc: `${counts?.ta || 0} ${t.dashboard.claims} · ${formatInr(amounts?.ta || 0)}`,
      icon: FileText,
      color: 'var(--t-ta)',
      bgRgba: 'rgba(14, 124, 134, 0.12)',
      path: '/claims/tada'
    },
    {
      id: 'transfer',
      title: t.dashboard.w_tr_t,
      desc: `${counts?.transfer || 0} ${t.dashboard.claims} · ${formatInr(amounts?.transfer || 0)}`,
      icon: ArrowLeftRight,
      color: 'var(--t-transfer)',
      bgRgba: 'rgba(66, 87, 201, 0.12)',
      path: '/claims/transfer-list'
    },
    {
      id: 'medical',
      title: t.dashboard.w_md_t,
      desc: `${counts?.medical || 0} ${t.dashboard.claims} · ${formatInr(amounts?.medical || 0)}`,
      icon: HeartPulse,
      color: 'var(--t-medical)',
      bgRgba: 'rgba(194, 69, 110, 0.12)',
      path: '/medical'
    },
    {
      id: 'diary',
      title: t.dashboard.w_diary_t,
      desc: `${counts?.diary || 0} ${t.dashboard.claims} · ${t.dashboard.w_diary}`,
      icon: FileSpreadsheet,
      color: 'var(--t-diary)',
      bgRgba: 'rgba(94, 110, 124, 0.12)',
      path: '/tour-diaries'
    }
  ];

  return (
    <section className="works" style={{ marginTop: '16px' }} aria-label="Workspaces">
      {tiles.map((tile) => {
        const IconComponent = tile.icon;
        return (
          <button
            key={tile.id}
            type="button"
            className="work"
            style={{ '--c': tile.color }}
            onClick={() => navigate(tile.path)}
          >
            <span className="wi" style={{ background: tile.bgRgba, color: tile.color }}>
              <IconComponent size={19} />
            </span>
            <span>
              <b>{tile.title}</b>
              <span>{tile.desc}</span>
            </span>
            <span className="go">
              <ArrowUpRight size={17} />
            </span>
          </button>
        );
      })}
    </section>
  );
}
