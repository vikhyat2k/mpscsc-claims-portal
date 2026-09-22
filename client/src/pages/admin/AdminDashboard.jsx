import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
    Users, FileText, Activity, UserCheck,
    ShieldCheck, UserCog, ArrowUpRight,
    IndianRupee, ChevronRight
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
        </div>
    );
}
