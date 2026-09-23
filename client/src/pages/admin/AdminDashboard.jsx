import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
    Users, FileText, Activity, UserCheck,
    ShieldCheck, UserCog, ArrowUpRight,
    IndianRupee, ChevronRight, Trash2, AlertTriangle, KeyRound
} from "lucide-react";
import api, { apiRequest } from "../../utils/api";

export default function AdminDashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        api.get("/api/admin/stats").then(r => r.json()).then(data => {
            setStats(data);
            setLoading(false);
        }).catch(err => {
            setError(err.message);
            setLoading(false);
        });
    }, []);

    const [purging, setPurging] = useState(false);
    const [showResetModal, setShowResetModal] = useState(false);
    const [adminPasswordInput, setAdminPasswordInput] = useState("");
    const [confirmResetTextInput, setConfirmResetTextInput] = useState("");
    const [resettingSystem, setResettingSystem] = useState(false);
    const [resetError, setResetError] = useState("");

    const handlePurgeDummyData = async () => {
        if (!window.confirm("Are you sure you want to purge all dummy test records? This will delete all users ending in @mpscsc.test and their test claims. Genuine records will NOT be affected.")) {
            return;
        }
        setPurging(true);
        try {
            const res = await api.post("/api/admin/purge-dummy-data");
            const data = await res.json();
            alert(data.message || "Dummy data purged successfully!");
            const r = await api.get("/api/admin/stats");
            setStats(await r.json());
        } catch (err) {
            alert("Error purging dummy data: " + err.message);
        } finally {
            setPurging(false);
        }
    };

    if (loading) return <div className="page-loading">Loading admin dashboard...</div>;
    if (error) return <div className="page-error">Error: {error}</div>;

    const totalUsers = stats?.totalUsers ?? 0;
    const activeUsers = stats?.activeUsers ?? 0;
    const activeRate = totalUsers > 0 ? Math.round((activeUsers / totalUsers) * 100) : 100;

    return (
        <div className="admin-page">
            <div className="admin-page-header">
                <div>
                    <div className="admin-badge-pill">
                        <ShieldCheck size={12} /> System Admin Portal
                    </div>
                    <h1 className="admin-page-title">Admin Dashboard</h1>
                    <p className="admin-page-subtitle">Platform overview, user activity, and claims management</p>
                </div>
                <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
                    <button
                        type="button"
                        onClick={handlePurgeDummyData}
                        disabled={purging}
                        className="btn btn-secondary"
                        style={{ borderColor: "#ef4444", color: "#ef4444", fontSize: "0.85rem" }}
                        title="Safely remove all test users and test claims without affecting genuine accounts"
                    >
                        {purging ? "Purging..." : "🗑️ Purge Test Data"}
                    </button>
                    <Link to="/admin/claims" className="btn btn-secondary">
                        <FileText size={15} /> All Claims Register
                    </Link>
                    <Link to="/admin/users" className="btn btn-primary">
                        <UserCog size={15} /> Manage Users
                    </Link>
                </div>
            </div>

            <div className="admin-kpi-grid">
                <div className="admin-kpi-card">
                    <div className="admin-kpi-icon admin-kpi-icon--blue"><Users size={22} /></div>
                    <div>
                        <p className="admin-kpi-label">Total Users</p>
                        <p className="admin-kpi-value">{totalUsers}</p>
                        <p className="admin-kpi-sub">Registered accounts</p>
                    </div>
                </div>
                <div className="admin-kpi-card">
                    <div className="admin-kpi-icon admin-kpi-icon--green"><UserCheck size={22} /></div>
                    <div>
                        <p className="admin-kpi-label">Active Users</p>
                        <p className="admin-kpi-value">{activeUsers}</p>
                        <p className="admin-kpi-sub">{activeRate}% active rate</p>
                    </div>
                </div>
                <div className="admin-kpi-card">
                    <div className="admin-kpi-icon admin-kpi-icon--purple"><Activity size={22} /></div>
                    <div>
                        <p className="admin-kpi-label">Total Employees</p>
                        <p className="admin-kpi-value">{stats?.totalEmployees ?? 0}</p>
                        <p className="admin-kpi-sub">In employee masters</p>
                    </div>
                </div>
                <div className="admin-kpi-card">
                    <div className="admin-kpi-icon admin-kpi-icon--orange"><FileText size={22} /></div>
                    <div>
                        <p className="admin-kpi-label">Total Claims</p>
                        <p className="admin-kpi-value">{stats?.totalClaims ?? 0}</p>
                        <p className="admin-kpi-sub">TA/DA, Transfer & Medical</p>
                    </div>
                </div>
                <div className="admin-kpi-card admin-kpi-card--wide">
                    <div className="admin-kpi-icon admin-kpi-icon--teal"><IndianRupee size={22} /></div>
                    <div>
                        <p className="admin-kpi-label">Total Claim Amount</p>
                        <p className="admin-kpi-value">₹{(stats?.totalAmount ?? 0).toLocaleString("en-IN")}</p>
                        <p className="admin-kpi-sub">Cumulative claims value</p>
                    </div>
                </div>
            </div>

            {/* Recent Claims Section */}
            <div className="admin-section">
                <div className="admin-section-header">
                    <div>
                        <h2 className="admin-section-title">Recent Claims & Bills Filed Across Platform</h2>
                        <p className="admin-section-sub">Latest employee claims submitted for TA/DA, Transfer, and Medical reimbursement</p>
                    </div>
                    <Link to="/admin/claims" className="admin-link-subtle">
                        View all claims register <ChevronRight size={14} />
                    </Link>
                </div>
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>TD No / ID</th>
                                <th>Submitter (User)</th>
                                <th>Employee</th>
                                <th>Type</th>
                                <th>Period / Month</th>
                                <th style={{ textAlign: "right" }}>Amount</th>
                                <th style={{ textAlign: "center" }}>Status</th>
                                <th style={{ textAlign: "center" }}>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats?.recentClaims?.length ? stats.recentClaims.map((c, i) => (
                                <tr key={c.id}>
                                    <td style={{ color: "#64748b", fontWeight: 600 }}>{i + 1}</td>
                                    <td><strong style={{ color: "#0f172a" }}>{c.td_no || `#${c.id}`}</strong></td>
                                    <td>
                                        <Link to={`/admin/users/${c.user_id}`} style={{ color: "#0f172a", fontWeight: 700, textDecoration: "none" }}>
                                            {c.user_name || "User"}
                                        </Link>
                                    </td>
                                    <td><strong style={{ color: "#0f172a" }}>{c.employee_name}</strong></td>
                                    <td>
                                        <span className={`claim-type-pill claim-type-pill--${c.claim_type === "TA_DA" ? "tada" : c.claim_type === "TRANSFER" ? "transfer" : "medical"}`}>
                                            {c.claim_type === "TA_DA" ? "TA/DA" : c.claim_type === "TRANSFER" ? "Transfer" : "Medical"}
                                        </span>
                                    </td>
                                    <td style={{ color: "#475569", fontSize: "0.82rem" }}>
                                        {c.start_date && c.end_date ? `${c.start_date} to ${c.end_date}` : c.month && c.year ? `${c.month}/${c.year}` : new Date(c.created_at).toLocaleDateString("en-IN")}
                                    </td>
                                    <td style={{ textAlign: "right", fontWeight: 800, color: "#0f172a" }}>
                                        ₹{(c.total_amount || 0).toLocaleString("en-IN")}
                                    </td>
                                    <td style={{ textAlign: "center" }}>
                                        <span className={`admin-badge ${c.status === "FINALIZED" ? "admin-badge--finalized" : c.status === "SUBMITTED" ? "admin-badge--submitted" : "admin-badge--draft"}`}>
                                            {c.status || "Draft"}
                                        </span>
                                    </td>
                                    <td style={{ textAlign: "center" }}>
                                        <Link
                                            to={c.claim_type !== "MEDICAL" ? `/claims/${c.id}/bill` : `/medical-claims/${c.id}?print=1`}
                                            className="admin-table-link"
                                            title="View / Print Bill"
                                        >
                                            View Bill <ArrowUpRight size={13} />
                                        </Link>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={9} style={{ textAlign: "center", color: "var(--text-3)", padding: "2.5rem" }}>No claims filed yet</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Recent Users Section */}
            <div className="admin-section">
                <div className="admin-section-header">
                    <div>
                        <h2 className="admin-section-title">Recent User Registrations</h2>
                        <p className="admin-section-sub">Latest registered users on the MPSCSC claims platform</p>
                    </div>
                    <Link to="/admin/users" className="admin-link-subtle">
                        View all users <ChevronRight size={14} />
                    </Link>
                </div>
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>User</th>
                                <th>Email</th>
                                <th>Registered Date</th>
                                <th>Status</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats?.recentUsers?.length ? stats.recentUsers.map((u, i) => (
                                <tr key={u.id}>
                                    <td style={{ color: "#64748b", fontWeight: 600 }}>{i + 1}</td>
                                    <td>
                                        <div className="admin-user-cell">
                                            <div className="admin-avatar-sm">
                                                {u.full_name?.charAt(0)?.toUpperCase() || "U"}
                                            </div>
                                            <strong style={{ color: "#0f172a" }}>{u.full_name}</strong>
                                        </div>
                                    </td>
                                    <td style={{ color: "#475569" }}>{u.email}</td>
                                    <td style={{ color: "#64748b" }}>
                                        {u.created_at ? new Date(u.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                                    </td>
                                    <td>
                                        <span className={`admin-badge ${u.account_status === "suspended" ? "admin-badge--suspended" : "admin-badge--active"}`}>
                                            {u.account_status || "active"}
                                        </span>
                                    </td>
                                    <td>
                                        <Link to={`/admin/users/${u.id}`} className="admin-table-link">
                                            View Details <ArrowUpRight size={13} />
                                        </Link>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--text-3)", padding: "2.5rem" }}>No users registered yet</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* System Data Management & Deletion */}
            <div className="admin-section" style={{ border: "1px solid #fecdd3", borderRadius: "12px", background: "#fff5f5", padding: "1.5rem", marginTop: "2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1rem" }}>
                    <div>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem", color: "#991b1b", fontWeight: 700, fontSize: "1.1rem" }}>
                            <AlertTriangle size={20} color="#dc2626" /> System Data Management & Danger Zone
                        </div>
                        <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.85rem", color: "#7f1d1d" }}>
                            Authorized admin controls to purge test records or execute a full database data reset. Accidental deletion protection enforced.
                        </p>
                    </div>
                    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                        <button
                            type="button"
                            onClick={handlePurgeDummyData}
                            disabled={purging}
                            className="btn btn-secondary"
                            style={{ borderColor: "#ef4444", color: "#ef4444", background: "#ffffff", fontSize: "0.85rem" }}
                            title="Safely remove all test users and test claims without affecting genuine accounts"
                        >
                            {purging ? "Purging..." : "🗑️ Purge Test Records"}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                setShowResetModal(true);
                                setAdminPasswordInput("");
                                setConfirmResetTextInput("");
                                setResetError("");
                            }}
                            className="btn btn-danger"
                            style={{ fontSize: "0.85rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}
                            title="High-security system reset: wipes all claims and non-admin users"
                        >
                            <Trash2 size={15} /> System Data Reset
                        </button>
                    </div>
                </div>
            </div>

            {/* High-Security System Reset Modal */}
            {showResetModal && (
                <div style={{
                    position: "fixed",
                    inset: 0,
                    backgroundColor: "rgba(15, 23, 42, 0.75)",
                    backdropFilter: "blur(4px)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    zIndex: 9999,
                    padding: "1rem"
                }}>
                    <div style={{
                        background: "#ffffff",
                        borderRadius: "14px",
                        maxWidth: "520px",
                        width: "100%",
                        padding: "1.75rem",
                        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.3)",
                        border: "2px solid #ef4444"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem", color: "#991b1b" }}>
                            <div style={{ background: "#fee2e2", padding: "0.6rem", borderRadius: "10px" }}>
                                <AlertTriangle size={26} color="#dc2626" />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: "1.25rem", fontWeight: 800, color: "#991b1b" }}>
                                    System Data Reset
                                </h3>
                                <span style={{ fontSize: "0.82rem", color: "#dc2626", fontWeight: 600 }}>High Security Admin Authorization</span>
                            </div>
                        </div>

                        <div style={{
                            background: "#fff1f2",
                            border: "1px solid #fecdd3",
                            borderRadius: "8px",
                            padding: "0.85rem 1rem",
                            fontSize: "0.86rem",
                            color: "#9f1239",
                            lineHeight: "1.45",
                            marginBottom: "1.25rem"
                        }}>
                            <strong>CRITICAL WARNING: This will permanently wipe all system data!</strong>
                            <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.82rem" }}>
                                All submitted claims (TA/DA, Medical, Transfer), all journey logs, medical bills, daily allowances, and all non-admin user accounts will be permanently destroyed. Administrator login accounts will be preserved.
                            </p>
                        </div>

                        <div style={{ marginBottom: "1rem" }}>
                            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "0.4rem" }}>
                                1. Enter your Administrator Password:
                            </label>
                            <input
                                type="password"
                                style={{
                                    width: "100%",
                                    padding: "0.6rem 0.85rem",
                                    borderRadius: "8px",
                                    border: "1px solid #cbd5e1",
                                    fontSize: "0.92rem",
                                    outline: "none"
                                }}
                                placeholder="Enter admin password..."
                                value={adminPasswordInput}
                                onChange={e => setAdminPasswordInput(e.target.value)}
                            />
                        </div>

                        <div style={{ marginBottom: "1.25rem" }}>
                            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "0.4rem" }}>
                                2. Type <code style={{ background: "#f1f5f9", padding: "0.2rem 0.4rem", borderRadius: "4px", color: "#dc2626", fontWeight: 700 }}>DELETE ALL DATA</code> to confirm:
                            </label>
                            <input
                                type="text"
                                style={{
                                    width: "100%",
                                    padding: "0.6rem 0.85rem",
                                    borderRadius: "8px",
                                    border: confirmResetTextInput === "DELETE ALL DATA" ? "2px solid #dc2626" : "1px solid #cbd5e1",
                                    fontSize: "0.92rem",
                                    outline: "none"
                                }}
                                placeholder="DELETE ALL DATA"
                                value={confirmResetTextInput}
                                onChange={e => setConfirmResetTextInput(e.target.value)}
                            />
                        </div>

                        {resetError && (
                            <div style={{ color: "#dc2626", fontSize: "0.85rem", marginBottom: "1rem", fontWeight: 600 }}>
                                ⚠️ {resetError}
                            </div>
                        )}

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => {
                                    setShowResetModal(false);
                                    setAdminPasswordInput("");
                                    setConfirmResetTextInput("");
                                    setResetError("");
                                }}
                                disabled={resettingSystem}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    if (confirmResetTextInput !== "DELETE ALL DATA") {
                                        setResetError("Confirmation text must match 'DELETE ALL DATA'");
                                        return;
                                    }
                                    if (!adminPasswordInput) {
                                        setResetError("Admin password is required");
                                        return;
                                    }
                                    setResettingSystem(true);
                                    setResetError("");
                                    try {
                                        const res = await api.post('/api/admin/delete-system-data', {
                                            admin_password: adminPasswordInput,
                                            confirmation_text: confirmResetTextInput
                                        });
                                        const data = await res.json();
                                        if (!res.ok) throw new Error(data.error || "System reset failed");
                                        alert(data.message || "System data reset successfully!");
                                        setShowResetModal(false);
                                        const r = await api.get("/api/admin/stats");
                                        setStats(await r.json());
                                    } catch (err) {
                                        setResetError(err.message);
                                    } finally {
                                        setResettingSystem(false);
                                    }
                                }}
                                disabled={confirmResetTextInput !== "DELETE ALL DATA" || !adminPasswordInput || resettingSystem}
                                style={{
                                    background: confirmResetTextInput === "DELETE ALL DATA" && adminPasswordInput ? "#dc2626" : "#cbd5e1",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "8px",
                                    padding: "0.65rem 1.25rem",
                                    fontWeight: 700,
                                    fontSize: "0.9rem",
                                    cursor: confirmResetTextInput === "DELETE ALL DATA" && adminPasswordInput ? "pointer" : "not-allowed",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.4rem"
                                }}
                            >
                                <Trash2 size={16} />
                                {resettingSystem ? "Purging System..." : "Confirm System Reset"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
