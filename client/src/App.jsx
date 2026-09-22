import React, { Component } from "react";
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from "react-router-dom";
import {
  Users, FileText, FileSpreadsheet,
  BarChart2, ClipboardList, ArrowLeftRight, HeartPulse,
  LayoutDashboard, LogOut, ShieldCheck, UserCog
} from "lucide-react";
import { LanguageProvider, useLanguage } from "./contexts/LanguageContext";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { getTranslations } from "./utils/translations";
import { ProtectedRoute } from "./components/ProtectedRoute";

import Employees      from "./pages/Employees";
import Claims         from "./pages/Claims";
import TADAClaims     from "./pages/TADAClaims";
import TransferClaims from "./pages/TransferClaims";
import ClaimEditor    from "./pages/ClaimEditor";
import TourDiaries    from "./pages/TourDiaries";
import TourDiary      from "./pages/TourDiary";
import TADABill       from "./pages/TADABill";
import TransferClaim  from "./pages/TransferClaim";
import MedicalClaims  from "./pages/MedicalClaims";
import MedicalClaim   from "./pages/MedicalClaim";
import Reports        from "./pages/Reports";
import logoIco        from "./assets/logo.ico";
import Dashboard      from "./components/dashboard/Dashboard";

import Login          from "./pages/Login";
import Register       from "./pages/Register";
import ForgotPassword from "./pages/ForgotPassword";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers     from "./pages/admin/AdminUsers";
import AdminUserDetail from "./pages/admin/AdminUserDetail";

// ─────────────────────────────────────────────
// SIDEBAR NAVBAR
// ─────────────────────────────────────────────
const NavBar = () => {
  const location = useLocation();
  const { language, setLanguage } = useLanguage();
  const { user, logout, isAdmin } = useAuth();
  const t = getTranslations(language);
  const isActive = (path) => location.pathname === path ? "nav-link active" : "nav-link";
  const isActivePrefix = (prefix) => location.pathname.startsWith(prefix) ? "nav-link active" : "nav-link";

  return (
    <nav className="navbar no-print">
      <Link to="/" className="brand">
        <img src={logoIco} alt="MPSCSC"
          style={{ width: 32, height: 32, minWidth: 32, minHeight: 32, flexShrink: 0, objectFit: "contain", aspectRatio: "1 / 1", display: "block" }}
        />
        <span>{t.nav.brand}</span>
      </Link>

      <div className="nav-links" style={{ flex: 1 }}>
        <Link to="/" className={isActive("/")} style={{ display: "flex", alignItems: "center", gap: "0.45rem" }}>
          <LayoutDashboard size={15} /> {language === "hi" ? "डैशबोर्ड" : "Dashboard"}
        </Link>
        <div className="nav-divider" />
        <div className="nav-section-label">{language === "hi" ? "दावा प्रबंधन" : "Claims Management"}</div>
        <Link to="/employees" className={isActive("/employees")}><Users size={14} /> {t.nav.employees}</Link>
        <Link to="/tour-diaries" className={isActive("/tour-diaries")}><FileSpreadsheet size={14} /> {t.nav.tourDiaries}</Link>
        <Link to="/claims/tada" className={isActivePrefix("/claims/tada")}><FileText size={14} /> {t.nav.tadaClaims}</Link>
        <Link to="/claims/transfer-list" className={isActivePrefix("/claims/transfer-list")}><ArrowLeftRight size={14} /> {t.nav.transferClaims}</Link>
        <Link to="/medical" className={isActivePrefix("/medical")}><HeartPulse size={14} /> {t.nav.medicalClaims}</Link>
        <Link to="/claims" className={isActive("/claims")}><ClipboardList size={14} /> {t.nav.claims}</Link>
        <Link to="/reports" className={isActive("/reports")}><BarChart2 size={14} /> {t.nav.reports}</Link>

        {isAdmin && (
          <>
            <div className="nav-divider" />
            <div className="nav-section-label">Admin</div>
            <Link to="/admin" className={isActive("/admin")}><ShieldCheck size={14} /> Admin Dashboard</Link>
            <Link to="/admin/users" className={isActivePrefix("/admin/users")}><UserCog size={14} /> User Management</Link>
          </>
        )}
      </div>

      <div style={{ paddingTop: "0.75rem", width: "100%", borderTop: "1px solid rgba(255,255,255,0.07)", marginTop: "0.5rem" }}>
        {user && (
          <div className="nav-user-info">
            <div className="nav-user-avatar">{user.full_name?.charAt(0)?.toUpperCase() || "U"}</div>
            <div className="nav-user-details">
              <span className="nav-user-name">{user.full_name}</span>
              <span className="nav-user-role">{user.role === "admin" ? "Administrator" : "User"}</span>
            </div>
          </div>
        )}
        <div className="language-toggle no-print" style={{ marginBottom: "0.5rem" }}>
          <button type="button" className={`lang-btn ${language === "hi" ? "active" : ""}`} onClick={() => setLanguage("hi")}>हिं</button>
          <button type="button" className={`lang-btn ${language === "en" ? "active" : ""}`} onClick={() => setLanguage("en")}>Eng</button>
        </div>
        <button type="button" className="nav-logout-btn" onClick={logout}>
          <LogOut size={14} /> Sign Out
        </button>
      </div>
    </nav>
  );
};

// ─────────────────────────────────────────────
// ERROR BOUNDARY
// ─────────────────────────────────────────────
class ErrorBoundary extends Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, errorInfo) { console.error("ErrorBoundary:", error, errorInfo); }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: "3rem", textAlign: "center" }}>
          <h2 style={{ color: "#ef4444", marginBottom: "1rem" }}>Something went wrong</h2>
          <p style={{ color: "#64748b", marginBottom: "1.5rem" }}>{this.state.error?.message || "Unknown error"}</p>
          <button className="btn btn-primary" onClick={() => { this.setState({ hasError: false }); window.location.href = "/"; }}>
            Return to Dashboard
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const ClaimCompatibilityRedirect = () => {
  const location = useLocation();
  const target = location.pathname.replace(/^\/claims\/claims/, "/claims");
  return <Navigate to={target + location.search} replace />;
};

// ─────────────────────────────────────────────
// MAIN LAYOUT (authenticated)
// ─────────────────────────────────────────────
function MainLayout() {
  return (
    <div className="app-container">
      <NavBar />
      <main className="main-content">
        <Routes>
          <Route path="/"                          element={<Dashboard />} />
          <Route path="/employees"                 element={<Employees />} />
          <Route path="/claims"                    element={<Claims />} />
          <Route path="/claims/tada"               element={<TADAClaims />} />
          <Route path="/claims/transfer-list"      element={<TransferClaims />} />
          <Route path="/claims/:id"                element={<ClaimEditor />} />
          <Route path="/claims/transfer/:id"       element={<TransferClaim />} />
          <Route path="/claims/:id/tour-diary"     element={<TourDiary />} />
          <Route path="/claims/:id/bill"           element={<TADABill />} />
          <Route path="/tour-diaries"              element={<TourDiaries />} />
          <Route path="/medical"                   element={<MedicalClaims />} />
          <Route path="/medical-claims/:id"        element={<MedicalClaim />} />
          <Route path="/reports"                   element={<Reports />} />
          {/* Admin routes */}
          <Route path="/admin"                     element={<ProtectedRoute adminOnly><AdminDashboard /></ProtectedRoute>} />
          <Route path="/admin/users"               element={<ProtectedRoute adminOnly><AdminUsers /></ProtectedRoute>} />
          <Route path="/admin/users/:id"           element={<ProtectedRoute adminOnly><AdminUserDetail /></ProtectedRoute>} />
          {/* Compat */}
          <Route path="/claims/claims/*"           element={<ClaimCompatibilityRedirect />} />
          <Route path="*"                          element={<Navigate to="/" replace />} />
        </Routes>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <LanguageProvider>
          <Router basename={import.meta.env.BASE_URL || "/"}>
            <Routes>
              {/* Public routes */}
              <Route path="/login"          element={<Login />} />
              <Route path="/register"       element={<Register />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              {/* All protected routes */}
              <Route path="/*" element={
                <ProtectedRoute>
                  <MainLayout />
                </ProtectedRoute>
              } />
            </Routes>
          </Router>
        </LanguageProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
