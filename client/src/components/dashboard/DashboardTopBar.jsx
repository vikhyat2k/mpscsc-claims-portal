import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Sun,
  Moon,
  Bell,
  Plus,
  ChevronDown,
  FileText,
  ArrowLeftRight,
  HeartPulse,
  FileSpreadsheet
} from 'lucide-react';
import { useLanguage } from '../../contexts/LanguageContext';
import { getTranslations } from '../../utils/translations';

export default function DashboardTopBar({
  searchQuery = '',
  onSearchChange,
  serverOnline = true,
  alertCount = 0,
  theme = 'light',
  onToggleTheme,
  onScrollToAlerts
}) {
  const navigate = useNavigate();
  const { language, setLanguage } = useLanguage();
  const t = getTranslations(language);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  // Close menu on click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const newClaimOptions = [
    { key: 'ta', label: t.dashboard.nc_ta, icon: FileText, path: '/claims/tada', color: '#0284c7', bg: 'rgba(2, 132, 199, 0.12)' },
    { key: 'transfer', label: t.dashboard.nc_tr, icon: ArrowLeftRight, path: '/claims/transfer-list', color: '#4f46e5', bg: 'rgba(79, 70, 229, 0.12)' },
    { key: 'medical', label: t.dashboard.nc_md, icon: HeartPulse, path: '/medical', color: '#e11d48', bg: 'rgba(225, 29, 72, 0.12)' },
    { key: 'diary', label: t.dashboard.nc_diary, icon: FileSpreadsheet, path: '/tour-diaries', color: '#059669', bg: 'rgba(5, 150, 105, 0.12)' }
  ];

  return (
    <header className="top">
      {/* Search Input */}
      <label className="search">
        <Search size={16} className="search-icon" />
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={t.dashboard.search_ph}
          aria-label={t.dashboard.search_ph}
        />
      </label>

      <span className="grow" />

      {/* Server Status Indicator */}
      <span className={`srv hs ${serverOnline ? '' : 'offline'}`}>
        <i />
        <span>{serverOnline ? t.dashboard.server : t.dashboard.serverOffline}</span>
      </span>

      {/* Language Segmented Toggle */}
      <div className="seg lang" role="group">
        <button
          type="button"
          aria-pressed={language === 'hi'}
          onClick={() => setLanguage('hi')}
        >
          हिं
        </button>
        <button
          type="button"
          aria-pressed={language === 'en'}
          onClick={() => setLanguage('en')}
        >
          Eng
        </button>
      </div>

      {/* Theme Toggle */}
      <button
        type="button"
        className="ib hs"
        onClick={onToggleTheme}
        aria-label={t.dashboard.theme}
        title={t.dashboard.theme}
      >
        {theme === 'dark' ? <Sun size={17} /> : <Moon size={17} />}
      </button>

      {/* Alerts Bell */}
      <button
        type="button"
        className="ib bell"
        onClick={onScrollToAlerts}
        aria-label={t.dashboard.alerts}
        title={t.dashboard.alerts}
      >
        <Bell size={17} />
        {alertCount > 0 && <b>{alertCount}</b>}
      </button>

      {/* New Claim Dropdown */}
      <div className="menu-wrap" ref={menuRef}>
        <button
          type="button"
          className="btn pri"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-haspopup="true"
          aria-expanded={menuOpen}
        >
          <Plus size={16} />
          <span>{t.dashboard.new_claim}</span>
          <ChevronDown size={14} />
        </button>

        {menuOpen && (
          <div className="menu">
            {newClaimOptions.map((opt) => {
              const IconComp = opt.icon;
              return (
                <button
                  key={opt.key}
                  type="button"
                  className="menu-item"
                  onClick={() => {
                    setMenuOpen(false);
                    navigate(opt.path);
                  }}
                >
                  <span className="menu-icon-wrap" style={{ color: opt.color, backgroundColor: opt.bg }}>
                    <IconComp size={16} />
                  </span>
                  <span className="menu-item-label">{opt.label}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </header>
  );
}
