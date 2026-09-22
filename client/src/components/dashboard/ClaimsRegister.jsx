import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ChevronRight, ChevronUp, ChevronDown, Printer, Send, Eye } from 'lucide-react';
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

export default function ClaimsRegister({
  claims = [],
  activeTab = 'all',
  onTabChange,
  searchQuery = '',
  onSearchChange,
  onSubmitClaim,
  onPrintClaim
}) {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = getTranslations(language);


  const [sort, setSort] = useState({ key: 'date', dir: -1 }); // dir: 1 (asc) or -1 (desc)
  const [showAll, setShowAll] = useState(false);

  // Status tabs mapping
  const tabs = [
    { key: 'all', label: t.dashboard.tab_all },
    { key: 'draft', label: t.dashboard.st_draft, match: ['DRAFT'] },
    { key: 'submitted', label: t.dashboard.st_submitted, match: ['SUBMITTED', 'REVIEW'] },
    { key: 'approved', label: t.dashboard.st_approved, match: ['APPROVED', 'PAID'] },
    { key: 'rejected', label: t.dashboard.st_rejected, match: ['REJECTED'] }
  ];

  // Helper to get matching count for each tab
  const getTabCount = (tabKey) => {
    if (tabKey === 'all') return claims.length;
    const tabObj = tabs.find((x) => x.key === tabKey);
    return claims.filter((c) => tabObj.match.includes((c.status || '').toUpperCase())).length;
  };

  // Filter claims by active tab
  let filtered = claims.filter((c) => {
    if (activeTab === 'all') return true;
    const tabObj = tabs.find((x) => x.key === activeTab);
    return tabObj ? tabObj.match.includes((c.status || '').toUpperCase()) : true;
  });

  // Filter claims by search query
  const q = searchQuery.trim().toLowerCase();
  if (q) {
    filtered = filtered.filter((c) => {
      const searchStr = `${c.emp || ''} ${c.emp_hi || ''} ${c.id || ''} ${c.type || ''} ${c.status || ''}`.toLowerCase();
      return searchStr.includes(q);
    });
  }

  // Sort claims
  filtered.sort((a, b) => {
    if (sort.key === 'amt') {
      return ((a.amt || 0) - (b.amt || 0)) * sort.dir;
    }
    if (sort.key === 'emp') {
      const nameA = a.emp || '';
      const nameB = b.emp || '';
      return nameA.localeCompare(nameB) * sort.dir;
    }
    // Default 'date'
    const dateA = new Date(a.date || a.created_at || 0).getTime();
    const dateB = new Date(b.date || b.created_at || 0).getTime();
    return (dateA - dateB) * sort.dir;
  });

  const handleSort = (key) => {
    if (sort.key === key) {
      setSort({ key, dir: -sort.dir });
    } else {
      setSort({ key, dir: key === 'emp' ? 1 : -1 });
    }
  };

  const displayedList = showAll ? filtered : filtered.slice(0, 8);

  const getStatusChip = (status = '') => {
    const s = status.toUpperCase();
    let label = t.dashboard.st_draft;
    let colorVar = 'var(--c-draft)';

    if (s === 'SUBMITTED' || s === 'REVIEW') {
      label = t.dashboard.st_submitted;
      colorVar = 'var(--c-submitted)';
    } else if (s === 'APPROVED' || s === 'PAID') {
      label = t.dashboard.st_approved;
      colorVar = 'var(--c-approved)';
    } else if (s === 'REJECTED') {
      label = t.dashboard.st_rejected;
      colorVar = 'var(--c-rejected)';
    }

    return (
      <span className="chip st" style={{ '--c': colorVar }}>
        {label}
      </span>
    );
  };

  const getTypeChip = (type = '') => {
    const norm = type.toLowerCase();
    let label = t.dashboard.ty_ta;
    let colorVar = 'var(--t-ta)';

    if (norm === 'transfer') {
      label = t.dashboard.ty_transfer;
      colorVar = 'var(--t-transfer)';
    } else if (norm === 'medical') {
      label = t.dashboard.ty_medical;
      colorVar = 'var(--t-medical)';
    } else if (norm === 'diary') {
      label = t.dashboard.ty_diary;
      colorVar = 'var(--t-diary)';
    }

    return (
      <span className="chip" style={{ '--c': colorVar }}>
        {label}
      </span>
    );
  };

  const handleOpenClaim = (claim) => {
    const type = (claim.type || claim.claim_type || '').toLowerCase();
    if (type === 'transfer') {
      navigate(`/claims/transfer/${claim.raw_id}`);
    } else if (type === 'medical') {
      navigate(`/medical-claims/${claim.raw_id}`);
    } else if (claim.is_diary) {
      navigate(`/claims/${claim.raw_id}/tour-diary`);
    } else {
      navigate(`/claims/${claim.raw_id}`);
    }
  };

  const handlePrintClaim = (claim) => {
    if (onPrintClaim) {
      onPrintClaim(claim);
      return;
    }
    const type = (claim.type || claim.claim_type || '').toLowerCase();
    if (type === 'medical') {
      navigate(`/medical-claims/${claim.raw_id}?print=1`);
    } else if (claim.is_diary && type === 'diary') {
      navigate(`/claims/${claim.raw_id}/tour-diary?print=1`);
    } else {
      navigate(`/claims/${claim.raw_id}/bill?print=1`);
    }
  };

  return (
    <div className="panel s8" id="register">
      <div className="ph">
        <div>
          <h2>{t.dashboard.reg_title}</h2>
          <p>{t.dashboard.reg_sub}</p>
        </div>
        <label className="search" style={{ maxWidth: '240px', minWidth: '170px' }}>
          <Search size={15} className="search-icon" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={t.dashboard.search_ph}
            aria-label={t.dashboard.search_ph}
            style={{ height: '32px' }}
          />
        </label>
      </div>

      {/* Tabs */}
      <div className="tabs" role="group">
        {tabs.map((tab) => {
          const isSelected = activeTab === tab.key;
          const count = getTabCount(tab.key);
          return (
            <button
              key={tab.key}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onTabChange(tab.key)}
            >
              {tab.label}
              <em className="num">{count}</em>
            </button>
          );
        })}
      </div>

      {/* Table Body */}
      <div id="regBody">
        {displayedList.length === 0 ? (
          <div className="empty">
            <b>{t.dashboard.no_match}</b>
            {t.dashboard.no_match_s}
          </div>
        ) : (
          <>
            <div className="tw">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>{t.dashboard.c_id}</th>
                    <th>
                      <button type="button" onClick={() => handleSort('emp')}>
                        {t.dashboard.c_emp}
                        {sort.key === 'emp' && (
                          sort.dir > 0 ? <ChevronUp size={12} className="sort-icon" /> : <ChevronDown size={12} className="sort-icon" />
                        )}
                      </button>
                    </th>
                    <th>{t.dashboard.c_type}</th>
                    <th>
                      <button type="button" onClick={() => handleSort('date')}>
                        {t.dashboard.c_date}
                        {sort.key === 'date' && (
                          sort.dir > 0 ? <ChevronUp size={12} className="sort-icon" /> : <ChevronDown size={12} className="sort-icon" />
                        )}
                      </button>
                    </th>
                    <th className="r">
                      <button type="button" onClick={() => handleSort('amt')}>
                        {t.dashboard.c_amt}
                        {sort.key === 'amt' && (
                          sort.dir > 0 ? <ChevronUp size={12} className="sort-icon" /> : <ChevronDown size={12} className="sort-icon" />
                        )}
                      </button>
                    </th>
                    <th>{t.dashboard.c_st}</th>
                    <th className="r" style={{ minWidth: '180px' }}>{t.dashboard.c_actions || 'Actions'}</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedList.map((c) => {
                    const displayName = (language === 'hi' && c.emp_hi) ? c.emp_hi : c.emp;
                    const dateObj = new Date(c.date || c.created_at);
                    const formattedDate = !isNaN(dateObj.getTime())
                      ? dateObj.toLocaleDateString(language === 'hi' ? 'hi-IN' : 'en-IN', {
                          day: 'numeric',
                          month: 'short'
                        })
                      : '—';

                    const isDraft = (c.status || '').toUpperCase() === 'DRAFT';

                    return (
                      <tr key={c.id || c.raw_id}>
                        <td className="id num">{c.id}</td>
                        <td>
                          <div className="who">
                            <span className="av sm" style={{ '--h': getAvatarHue(c.emp) }}>
                              {getAvatarInitials(c.emp)}
                            </span>
                            {displayName}
                          </div>
                        </td>
                        <td>{getTypeChip(c.type)}</td>
                        <td className="num">{formattedDate}</td>
                        <td className="r num">
                          <b style={{ fontWeight: 500 }}>{formatInr(c.amt)}</b>
                        </td>
                        <td>{getStatusChip(c.status)}</td>
                        <td className="r">
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', justifyContent: 'flex-end', flexWrap: 'nowrap' }}>
                            {onSubmitClaim && isDraft && (
                              <button
                                type="button"
                                className="btn sm pri"
                                style={{ padding: '0.24rem 0.55rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                                onClick={() => onSubmitClaim(c)}
                                title={t.dashboard.submit_tip || 'Submit claim for approval'}
                              >
                                <Send size={12} />
                                {t.dashboard.submit || 'Submit'}
                              </button>
                            )}
                            <button
                              type="button"
                              className="btn sm"
                              style={{ padding: '0.24rem 0.55rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                              onClick={() => handlePrintClaim(c)}
                              title={language === 'hi' ? 'शासकीय प्रारूप में देयक प्रिंट करें (फॉर्म 21 / बिल)' : 'Print in Govt Prescribed Format (Form 21 / Bill)'}
                            >
                              <Printer size={12} />
                              {t.dashboard.print_bill || 'Print'}
                            </button>
                            <button
                              type="button"
                              className="btn sm ghost"
                              style={{ padding: '0.24rem 0.5rem', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap' }}
                              onClick={() => handleOpenClaim(c)}
                              title={t.dashboard.view_edit || 'View / Edit'}
                              aria-label={`Open claim ${c.id}`}
                            >
                              <Eye size={12} />
                              {language === 'hi' ? 'देखें' : 'View'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>


            <div className="rf">
              <span>
                {language === 'hi'
                  ? `${filtered.length} में से ${displayedList.length} दिखाए गए`
                  : `Showing ${displayedList.length} of ${filtered.length}`}
              </span>
              {filtered.length > 8 && (
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => setShowAll(!showAll)}
                >
                  {showAll ? t.dashboard.show_less : t.dashboard.show_all}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
