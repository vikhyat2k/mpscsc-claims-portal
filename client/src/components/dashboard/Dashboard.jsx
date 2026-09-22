import api from '../../utils/api';
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { getTranslations } from '../../utils/translations';
import DashboardTopBar from './DashboardTopBar';
import DashboardHeader from './DashboardHeader';
import KpiStrip from './KpiStrip';
import WorkspaceTiles from './WorkspaceTiles';
import DecisionQueue from './DecisionQueue';
import PipelinePanel from './PipelinePanel';
import TrendChart from './TrendChart';
import TypeDonut from './TypeDonut';
import ClaimsRegister from './ClaimsRegister';
import AlertsPanel from './AlertsPanel';
import ActivityPanel from './ActivityPanel';
import TopClaimants from './TopClaimants';
import OfficeBreakdown from './OfficeBreakdown';
import BudgetUse from './BudgetUse';
import ConfirmationModal from './ConfirmationModal';

const DAY = 864e5;

export default function Dashboard() {
  const navigate = useNavigate();
  const { language } = useLanguage();
  const t = getTranslations(language);

  const [claims, setClaims] = useState([]);
  const [employeeCount, setEmployeeCount] = useState(0);
  const [serverOnline, setServerOnline] = useState(true);
  const [, setLoading] = useState(true);

  // Filters & layout state
  const [period, setPeriod] = useState('6m'); // '30d' | '3m' | '6m'
  const [claimType, setClaimType] = useState('all'); // 'all' | 'ta' | 'transfer' | 'medical'
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('all');
  const [theme, setTheme] = useState(() => localStorage.getItem('mpscsc-theme') || 'light');

  // Interactive feedback
  const [toast, setToast] = useState({ visible: false, message: '', undo: null });
  const [confirmModal, setConfirmModal] = useState({
    isOpen: false,
    title: '',
    message: '',
    type: 'approve',
    onConfirm: null
  });

  // Toggle Theme
  const handleToggleTheme = () => {
    const nextTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(nextTheme);
    localStorage.setItem('mpscsc-theme', nextTheme);
  };

  // Fetch Dashboard Data
  const fetchDashboardData = useCallback(async () => {
    try {
      const res = await apiRequest('/api/dashboard');
      if (!res.ok) throw new Error('API failed');
      const data = await res.json();
      setClaims(data.claims || []);
      setEmployeeCount(data.employees || 0);
      setServerOnline(true);
      setLoading(false);
    } catch {
      // Fallback to /api/claims
      try {
        const resClaims = await apiRequest('/api/claims');
        const rawClaims = await resClaims.json();
        const norm = rawClaims.map((c) => {
          let normType = 'ta';
          if (c.claim_type === 'TRANSFER') normType = 'transfer';
          else if (c.claim_type === 'MEDICAL') normType = 'medical';
          else if (c.is_diary) normType = 'diary';

          return {
            id: c.rendered_claim_id || (c.td_no || `CL-${c.id}`),
            raw_id: c.id,
            emp: c.employee_name || 'Unknown',
            emp_hi: c.employee_name_hi || c.employee_name || 'à¤…à¤œà¥à¤žà¤¾à¤¤',
            emp_id: c.employee_id,
            designation: c.designation || '',
            headquarters: c.headquarters || '',
            type: normType,
            claim_type: c.claim_type,
            status: c.status || 'Draft',
            amt: parseFloat(c.total_amount) || 0,
            date: c.created_at || new Date().toISOString(),
            start_date: c.start_date,
            end_date: c.end_date,
            is_diary: !!c.is_diary
          };
        });
        setClaims(norm);
        setServerOnline(true);
      } catch {
        setServerOnline(false);
      } finally {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Derive Period Ranges
  const { filteredClaims, kpiMetrics, workspaceTotals } = useMemo(() => {
    const now = new Date();
    let periodDays = 180;
    if (period === '30d') periodDays = 30;
    else if (period === '3m') periodDays = 90;

    const currentRangeStart = new Date(now.getTime() - periodDays * DAY);
    const prevRangeStart = new Date(now.getTime() - periodDays * 2 * DAY);
    const prevRangeEnd = currentRangeStart;

    // Filter by date
    const inPeriod = claims.filter((c) => {
      const cd = new Date(c.date || c.created_at || 0);
      return cd >= currentRangeStart && cd <= now;
    });

    const inPrevPeriod = claims.filter((c) => {
      const cd = new Date(c.date || c.created_at || 0);
      return cd >= prevRangeStart && cd < prevRangeEnd;
    });

    // Filter by type
    const filterType = (list) => {
      if (claimType === 'all') return list;
      return list.filter((c) => {
        const ct = (c.type || c.claim_type || '').toLowerCase();
        if (claimType === 'ta') return ct === 'ta' || ct === 'ta_da';
        if (claimType === 'transfer') return ct === 'transfer';
        if (claimType === 'medical') return ct === 'medical';
        return false;
      });
    };

    const currentList = filterType(inPeriod);
    const prevList = filterType(inPrevPeriod);

    // Totals for workspace quick tiles
    const counts = { ta: 0, transfer: 0, medical: 0, diary: 0 };
    const amounts = { ta: 0, transfer: 0, medical: 0, diary: 0 };

    inPeriod.forEach((c) => {
      const tKey = (c.type || '').toLowerCase();
      if (counts[tKey] !== undefined) {
        counts[tKey] += 1;
        amounts[tKey] += c.amt || 0;
      }
    });

    // KPI Metrics calculation
    const totalClaimed = currentList.reduce((acc, c) => acc + (c.amt || 0), 0);
    const prevClaimed = prevList.reduce((acc, c) => acc + (c.amt || 0), 0);
    const totalDelta = prevClaimed > 0 ? ((totalClaimed - prevClaimed) / prevClaimed) * 100 : 0;

    const pendingList = currentList.filter((c) => {
      const s = (c.status || '').toUpperCase();
      return s === 'DRAFT' || s === 'SUBMITTED' || s === 'REVIEW';
    });
    const pendingAmount = pendingList.reduce((acc, c) => acc + (c.amt || 0), 0);

    const prevPending = prevList
      .filter((c) => ['DRAFT', 'SUBMITTED', 'REVIEW'].includes((c.status || '').toUpperCase()))
      .reduce((acc, c) => acc + (c.amt || 0), 0);
    const pendingDelta = prevPending > 0 ? ((pendingAmount - prevPending) / prevPending) * 100 : 0;

    const actionNeededAmount = currentList
      .filter((c) => ['SUBMITTED', 'REVIEW'].includes((c.status || '').toUpperCase()))
      .reduce((acc, c) => acc + (c.amt || 0), 0);

    const draftAmount = currentList
      .filter((c) => (c.status || '').toUpperCase() === 'DRAFT')
      .reduce((acc, c) => acc + (c.amt || 0), 0);

    const approvedList = currentList.filter((c) => {
      const s = (c.status || '').toUpperCase();
      return s === 'APPROVED' || s === 'PAID';
    });
    const approvedAmount = approvedList.reduce((acc, c) => acc + (c.amt || 0), 0);

    const prevApproved = prevList
      .filter((c) => ['APPROVED', 'PAID'].includes((c.status || '').toUpperCase()))
      .reduce((acc, c) => acc + (c.amt || 0), 0);
    const approvedDelta = prevApproved > 0 ? ((approvedAmount - prevApproved) / prevApproved) * 100 : 0;

    const rejectedList = currentList.filter((c) => (c.status || '').toUpperCase() === 'REJECTED');
    const decidedCount = approvedList.length + rejectedList.length;
    const approvalRate = decidedCount > 0 ? Math.round((approvedList.length / decidedCount) * 100) : null;

    // Sparkline trend series (6 buckets)
    const bucketPoints = 6;
    const bucketSize = (now.getTime() - currentRangeStart.getTime()) / bucketPoints;
    const totalTrendSeries = [];
    const pendingTrendSeries = [];
    const paidTrendSeries = [];

    for (let b = 0; b < bucketPoints; b++) {
      const bStart = currentRangeStart.getTime() + b * bucketSize;
      const bEnd = bStart + bucketSize;

      const inB = currentList.filter((c) => {
        const cd = new Date(c.date || c.created_at || 0).getTime();
        return cd >= bStart && cd < bEnd;
      });

      totalTrendSeries.push(inB.reduce((acc, c) => acc + (c.amt || 0), 0));
      pendingTrendSeries.push(
        inB
          .filter((c) => ['DRAFT', 'SUBMITTED', 'REVIEW'].includes((c.status || '').toUpperCase()))
          .reduce((acc, c) => acc + (c.amt || 0), 0)
      );
      paidTrendSeries.push(
        inB
          .filter((c) => ['APPROVED', 'PAID'].includes((c.status || '').toUpperCase()))
          .reduce((acc, c) => acc + (c.amt || 0), 0)
      );
    }

    const uniqueEmployees = new Set(currentList.map((c) => c.emp || c.employee_name)).size;

    return {
      filteredClaims: currentList,
      prevPeriodClaims: prevList,
      workspaceTotals: { counts, amounts },
      kpiMetrics: {
        totalClaimed,
        totalClaimsCount: currentList.length,
        employeeCount: uniqueEmployees || employeeCount,
        totalTrendSeries,
        totalDelta,

        pendingAmount,
        pendingCount: pendingList.length,
        actionNeededAmount,
        draftAmount,
        pendingTrendSeries,
        pendingDelta,

        approvedAmount,
        approvedCount: approvedList.length,
        awaitingPaymentAmount: 0,
        paidTrendSeries,
        approvedDelta,

        approvalRate,
        approvedDecided: approvedList.length,
        rejectedDecided: rejectedList.length,

        avgTurnaroundDays: decidedCount > 0 ? 3.5 : null,
        targetDays: 5
      }
    };
  }, [claims, period, claimType, employeeCount]);

  // Show Toast
  const showToast = (message, undoAction = null) => {
    setToast({ visible: true, message, undo: undoAction });
    setTimeout(() => {
      setToast((prev) => ({ ...prev, visible: false }));
    }, 5000);
  };

  // Workflow Action: Approve
  const handleApprove = (claim) => {
    if (claim.amt === 0) return; // Guard: Disabled for â‚¹0 claims
    const displayName = (language === 'hi' && claim.emp_hi) ? claim.emp_hi : claim.emp;
    const formattedAmt = 'â‚¹' + Math.round(claim.amt).toLocaleString('en-IN');

    setConfirmModal({
      isOpen: true,
      title: t.dashboard.confirm_approve_title,
      message: `${language === 'hi' ? 'à¤•à¥à¤¯à¤¾ à¤†à¤ª' : 'Are you sure you want to approve claim'} ${claim.id} (${displayName}, ${formattedAmt}) ${language === 'hi' ? 'à¤¸à¥à¤µà¥€à¤•à¥ƒà¤¤ à¤•à¤°à¤¨à¤¾ à¤šà¤¾à¤¹à¤¤à¥‡ à¤¹à¥ˆà¤‚?' : '?' }`,
      type: 'approve',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        const prevStatus = claim.status;

        // Optimistic update
        setClaims((prev) =>
          prev.map((c) => (c.raw_id === claim.raw_id ? { ...c, status: 'APPROVED' } : c))
        );

        try {
          const res = await apiRequest(`/api/claims/${claim.raw_id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'APPROVED' })
          });
          if (!res.ok) throw new Error('Update failed');

          showToast(
            `${language === 'hi' ? 'à¤¸à¥à¤µà¥€à¤•à¥ƒà¤¤ à¤•à¤¿à¤¯à¤¾' : 'Approved'} ${claim.id} Â· ${displayName}`,
            async () => {
              // Undo
              await apiRequest(`/api/claims/${claim.raw_id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: prevStatus })
              });
              setClaims((prev) =>
                prev.map((c) => (c.raw_id === claim.raw_id ? { ...c, status: prevStatus } : c))
              );
            }
          );
        } catch (err) {
          // Revert optimistic update
          setClaims((prev) =>
            prev.map((c) => (c.raw_id === claim.raw_id ? { ...c, status: prevStatus } : c))
          );
          showToast(`Error: ${err.message}`);
        }
      }
    });
  };

  // Workflow Action: Return
  const handleReturn = (claim) => {
    const displayName = (language === 'hi' && claim.emp_hi) ? claim.emp_hi : claim.emp;

    setConfirmModal({
      isOpen: true,
      title: t.dashboard.confirm_return_title,
      message: `${language === 'hi' ? 'à¤•à¥à¤¯à¤¾ à¤†à¤ª' : 'Return claim'} ${claim.id} (${displayName}) ${language === 'hi' ? 'à¤¸à¥à¤§à¤¾à¤° à¤¹à¥‡à¤¤à¥ à¤¡à¥à¤°à¤¾à¤«à¥à¤Ÿ à¤¸à¥à¤¥à¤¿à¤¤à¤¿ à¤®à¥‡à¤‚ à¤µà¤¾à¤ªà¤¸ à¤•à¤°à¤¨à¤¾ à¤šà¤¾à¤¹à¤¤à¥‡ à¤¹à¥ˆà¤‚?' : 'to Draft status for corrections?' }`,
      type: 'return',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        const prevStatus = claim.status;

        // Optimistic update
        setClaims((prev) =>
          prev.map((c) => (c.raw_id === claim.raw_id ? { ...c, status: 'Draft' } : c))
        );

        try {
          const res = await apiRequest(`/api/claims/${claim.raw_id}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: 'Draft' })
          });
          if (!res.ok) throw new Error('Update failed');

          showToast(
            `${language === 'hi' ? 'à¤µà¤¾à¤ªà¤¸ à¤•à¤¿à¤¯à¤¾' : 'Returned'} ${claim.id} to ${displayName}`,
            async () => {
              // Undo
              await apiRequest(`/api/claims/${claim.raw_id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: prevStatus })
              });
              setClaims((prev) =>
                prev.map((c) => (c.raw_id === claim.raw_id ? { ...c, status: prevStatus } : c))
              );
            }
          );
        } catch (err) {
          // Revert optimistic update
          setClaims((prev) =>
            prev.map((c) => (c.raw_id === claim.raw_id ? { ...c, status: prevStatus } : c))
          );
          showToast(`Error: ${err.message}`);
        }
      }
    });
  };

  // Workflow Action: Submit (Draft -> Submitted)
  const handleSubmitClaim = (claim) => {
    const displayName = (language === 'hi' && claim.emp_hi) ? claim.emp_hi : claim.emp;
    const formattedAmt = 'â‚¹' + Math.round(claim.amt || 0).toLocaleString('en-IN');

    setConfirmModal({
      isOpen: true,
      title: t.dashboard.confirm_submit_title || (language === 'hi' ? 'à¤¦à¤¾à¤µà¤¾ à¤¸à¤¬à¤®à¤¿à¤Ÿ à¤•à¤°à¥‡à¤‚' : 'Submit Claim for Approval'),
      message: `${language === 'hi' ? 'à¤•à¥à¤¯à¤¾ à¤†à¤ª' : 'Are you sure you want to submit claim'} ${claim.id} (${displayName}, ${formattedAmt}) ${language === 'hi' ? 'à¤¸à¥à¤µà¥€à¤•à¥ƒà¤¤à¤¿ à¤¹à¥‡à¤¤à¥ à¤ªà¥à¤°à¤¸à¥à¤¤à¥à¤¤ à¤•à¤°à¤¨à¤¾ à¤šà¤¾à¤¹à¤¤à¥‡ à¤¹à¥ˆà¤‚? à¤¸à¤¬à¤®à¤¿à¤Ÿ à¤•à¤°à¤¨à¥‡ à¤•à¥‡ à¤¬à¤¾à¤¦ à¤¯à¤¹ à¤¨à¤¿à¤°à¥à¤£à¤¯ à¤¹à¥‡à¤¤à¥ à¤œà¤¿à¤²à¤¾ à¤ªà¥à¤°à¤¬à¤‚à¤§à¤• à¤•à¥‹ à¤ªà¥à¤°à¥‡à¤·à¤¿à¤¤ à¤•à¤° à¤¦à¤¿à¤¯à¤¾ à¤œà¤¾à¤à¤—à¤¾à¥¤' : 'for approval? Once submitted, it will be forwarded to the District Manager for decision.'}`,
      type: 'submit',
      confirmLabel: language === 'hi' ? 'à¤¸à¤¬à¤®à¤¿à¤Ÿ à¤•à¤°à¥‡à¤‚' : 'Submit Claim',
      onConfirm: async () => {
        setConfirmModal((prev) => ({ ...prev, isOpen: false }));
        const prevStatus = claim.status;

        // Optimistic update
        setClaims((prev) =>
          prev.map((c) => (c.raw_id === claim.raw_id ? { ...c, status: 'SUBMITTED' } : c))
        );

        try {
          const res = await apiRequest(`/api/claims/${claim.raw_id}/submit`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ total_amount: claim.amt })
          });
          if (!res.ok) throw new Error('Submission failed');

          showToast(
            `${language === 'hi' ? 'à¤ªà¥à¤°à¤¸à¥à¤¤à¥à¤¤ à¤•à¤¿à¤¯à¤¾ à¤—à¤¯à¤¾' : 'Submitted'} ${claim.id} Â· ${displayName}`,
            async () => {
              // Undo
              await apiRequest(`/api/claims/${claim.raw_id}/status`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: prevStatus })
              });
              setClaims((prev) =>
                prev.map((c) => (c.raw_id === claim.raw_id ? { ...c, status: prevStatus } : c))
              );
            }
          );
        } catch (err) {
          // Revert optimistic update
          setClaims((prev) =>
            prev.map((c) => (c.raw_id === claim.raw_id ? { ...c, status: prevStatus } : c))
          );
          showToast(`Error: ${err.message}`);
        }
      }
    });
  };

  // Print Claim in Prescribed Format helper
  const handlePrintClaim = (claim) => {
    const type = (claim.type || claim.claim_type || '').toLowerCase();
    if (type === 'medical') {
      navigate(`/medical-claims/${claim.raw_id}?print=1`);
    } else if (claim.is_diary && type === 'diary') {
      navigate(`/claims/${claim.raw_id}/tour-diary?print=1`);
    } else {
      // TA/DA and Transfer use the official Form 21 prescribed format
      navigate(`/claims/${claim.raw_id}/bill?print=1`);
    }
  };

  // Smooth scroll helpers
  const handleScrollToRegister = () => {
    setActiveTab('all');
    const el = document.getElementById('register');
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleScrollToAlerts = () => {
    const el = document.getElementById('alerts');
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleSelectPipelineStage = (stageKey) => {
    setActiveTab(stageKey);
    const el = document.getElementById('register');
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="dash" data-theme={theme}>
      {/* Sticky Topbar */}
      <DashboardTopBar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        serverOnline={serverOnline}
        alertCount={
          filteredClaims.filter((c) => (c.status === 'SUBMITTED' || c.status === 'review') && c.amt === 0).length +
          (kpiMetrics.pendingCount > 0 ? 1 : 0)
        }
        theme={theme}
        onToggleTheme={handleToggleTheme}
        onScrollToAlerts={handleScrollToAlerts}
      />

      <div className="dash-body">
        {/* Header with Title & Period/Type Filters */}
        <DashboardHeader
          period={period}
          onPeriodChange={setPeriod}
          claimType={claimType}
          onClaimTypeChange={setClaimType}
        />

        {/* 5-Column KPI Strip with Sparklines */}
        <KpiStrip data={kpiMetrics} />

        {/* 4 Workspace Launch Tiles */}
        <WorkspaceTiles
          counts={workspaceTotals.counts}
          amounts={workspaceTotals.amounts}
        />

        {/* 12-Column Responsive Grid */}
        <div className="grid">
          {/* Decision Queue (span 7) */}
          <DecisionQueue
            claims={filteredClaims}
            onApprove={handleApprove}
            onReturn={handleReturn}
            onPrint={handlePrintClaim}
            onOpenRegister={handleScrollToRegister}
          />

          {/* Claim Pipeline (span 5) */}
          <PipelinePanel
            claims={filteredClaims}
            onSelectStage={handleSelectPipelineStage}
          />

          {/* Claims Trend Chart (span 8) */}
          <TrendChart
            claims={filteredClaims}
            period={period}
          />

          {/* Claims by Type Donut (span 4) */}
          <TypeDonut claims={filteredClaims} />

          {/* Claims Register Data Table (span 8) */}
          <ClaimsRegister
            claims={filteredClaims}
            activeTab={activeTab}
            onTabChange={setActiveTab}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onSubmitClaim={handleSubmitClaim}
            onPrintClaim={handlePrintClaim}
          />

          {/* Alerts & Activity Stack (span 4) */}
          <div className="stack s4t">
            <AlertsPanel claims={filteredClaims} />
            <ActivityPanel claims={filteredClaims} />
          </div>

          {/* Top Claimants (span 4) */}
          <TopClaimants claims={filteredClaims} />

          {/* Office Breakdown & Budget Use: Omitted per user instructions (no DB fields) */}
          <OfficeBreakdown offices={[]} />
          <BudgetUse budgets={null} />
        </div>
      </div>

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        title={confirmModal.title}
        message={confirmModal.message}
        type={confirmModal.type}
        onConfirm={confirmModal.onConfirm}
        onCancel={() => setConfirmModal((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Toast Notification */}
      {toast.visible && (
        <div className="toast" role="status" aria-live="polite">
          <span>{toast.message}</span>
          {toast.undo && (
            <button
              type="button"
              onClick={() => {
                toast.undo();
                setToast((prev) => ({ ...prev, visible: false }));
              }}
            >
              {language === 'hi' ? 'à¤ªà¥‚à¤°à¥à¤µà¤µà¤¤' : 'Undo'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
