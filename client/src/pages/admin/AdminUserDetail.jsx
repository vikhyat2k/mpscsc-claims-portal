import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, User, Mail, Phone, Calendar, Shield, UserCheck, UserX, KeyRound } from "lucide-react";
import api from "../../utils/api";

export default function AdminUserDetail() {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [resetPw, setResetPw] = useState("");
    const [resetMsg, setResetMsg] = useState("");

    const fetchUser = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/api/admin/users/${id}`);
            const json = await res.json();
            if (!res.ok) throw new Error(json.error);
            setData(json);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUser(); }, [id]);

    const toggleStatus = async () => {
        const newStatus = data.user.account_status === "active" ? "suspended" : "active";
        if (!confirm(`${newStatus === "suspended" ? "Suspend" : "Activate"} this user?`)) return;
        await api.patch(`/api/admin/users/${id}/status`, { status: newStatus });
        fetchUser();
    };

    const resetPassword = async (e) => {
        e.preventDefault();
        if (!resetPw || resetPw.length < 8) { setResetMsg("Password must be at least 8 characters"); return; }
        const res = await api.patch(`/api/admin/users/${id}/reset-password`, { new_password: resetPw });
        const json = await res.json();
        setResetMsg(json.success ? "Password reset successfully!" : (json.error || "Failed"));
        if (json.success) setResetPw("");
    };

    if (loading) return <div className="page-loading">Loading user profile...</div>;
    if (error) return <div className="page-error">{error}</div>;
    if (!data) return null;

    const { user, employees, claimStats } = data;

    return (
        <div className="admin-page">
            <div className="admin-page-header">
                <div>
                    <Link to="/admin/users" className="admin-back-link"><ArrowLeft size={14} /> Back to Users</Link>
                    <h1 className="admin-page-title">{user.full_name}</h1>
                    <p className="admin-page-subtitle">User profile and data</p>
                </div>
                {user.role !== "admin" && (
                    <button className={`btn ${user.account_status === "active" ? "btn-danger" : "btn-success"}`} onClick={toggleStatus}>
                        {user.account_status === "active" ? <><UserX size={14} /> Suspend</> : <><UserCheck size={14} /> Activate</>}
                    </button>
                )}
            </div>

            <div className="admin-detail-grid">
                {/* User Info */}
                <div className="admin-info-card">
                    <h3 className="admin-info-title"><User size={16} /> Account Details</h3>
                    <div className="admin-info-rows">
                        <div className="admin-info-row"><Mail size={14} /><span>{user.email}</span></div>
                        <div className="admin-info-row"><Phone size={14} /><span>{user.mobile_number}</span></div>
                        <div className="admin-info-row"><Shield size={14} /><span style={{ textTransform: "capitalize" }}>{user.role}</span></div>
                        <div className="admin-info-row"><Calendar size={14} /><span>Joined: {user.created_at ? new Date(user.created_at).toLocaleDateString("en-IN") : "-"}</span></div>
                        <div className="admin-info-row"><Calendar size={14} /><span>Last login: {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString("en-IN") : "Never"}</span></div>
                        <div className="admin-info-row">
                            <span>Status:</span>
                            <span className={`admin-badge ${user.account_status === "active" ? "admin-badge--active" : "admin-badge--suspended"}`}>
                                {user.account_status}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Stats */}
                <div className="admin-info-card">
                    <h3 className="admin-info-title">Activity Summary</h3>
                    <div className="admin-stat-rows">
                        <div className="admin-stat-row">
                            <span>Employees in master</span>
                            <strong>{employees?.length ?? 0}</strong>
                        </div>
                        <div className="admin-stat-row">
                            <span>Total claims</span>
                            <strong>{claimStats?.total_claims ?? 0}</strong>
                        </div>
                        <div className="admin-stat-row">
                            <span>Total claim amount</span>
                            <strong>₹{(claimStats?.total_amount ?? 0).toLocaleString("en-IN")}</strong>
                        </div>
                    </div>
                </div>

                {/* Password Reset */}
                {user.role !== "admin" && (
                    <div className="admin-info-card">
                        <h3 className="admin-info-title"><KeyRound size={16} /> Reset Password</h3>
                        <form onSubmit={resetPassword} style={{ display: "flex", gap: "0.75rem", alignItems: "flex-end", flexWrap: "wrap" }}>
                            <div style={{ flex: 1, minWidth: "200px" }}>
                                <label className="auth-label" style={{ display: "block", marginBottom: "0.4rem" }}>New Password (min 8 chars)</label>
                                <input type="password" className="auth-input" value={resetPw}
                                    onChange={e => { setResetPw(e.target.value); setResetMsg(""); }}
                                    placeholder="New password" />
                            </div>
                            <button type="submit" className="btn btn-primary">Reset</button>
                        </form>
                        {resetMsg && <p style={{ marginTop: "0.5rem", color: resetMsg.includes("success") ? "#22c55e" : "#ef4444", fontSize: "0.85rem" }}>{resetMsg}</p>}
                    </div>
                )}
            </div>

            {/* Employee Master */}
            <div className="admin-section" style={{ marginTop: "1.5rem" }}>
                <h2 className="admin-section-title">Employee Master ({employees?.length ?? 0})</h2>
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr><th>#</th><th>Name</th><th>Designation</th><th>Category</th><th>HQ</th><th>Basic Pay</th></tr>
                        </thead>
                        <tbody>
                            {employees?.length ? employees.map((emp, i) => (
                                <tr key={emp.id}>
                                    <td>{i + 1}</td>
                                    <td>{emp.name}{emp.name_hi && <span style={{ color: "var(--text-muted)", marginLeft: "0.5rem", fontSize: "0.85rem" }}>({emp.name_hi})</span>}</td>
                                    <td>{emp.designation || "-"}</td>
                                    <td>{emp.category}</td>
                                    <td>{emp.headquarters || "-"}</td>
                                    <td>{emp.basic_pay ? `₹${emp.basic_pay.toLocaleString("en-IN")}` : "-"}</td>
                                </tr>
                            )) : <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--text-muted)", padding: "1.5rem" }}>No employees added yet</td></tr>}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
