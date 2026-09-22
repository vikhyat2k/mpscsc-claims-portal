import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
    ArrowLeft, User, Mail, Phone, Calendar, Shield,
    UserCheck, UserX, KeyRound, Clock, CheckCircle2,
    Briefcase
} from "lucide-react";
import api, { apiRequest } from "../../utils/api";

export default function AdminUserDetail() {
    const { id } = useParams();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [resetPw, setResetPw] = useState("");
    const [resetMsg, setResetMsg] = useState("");
    const [claimTypeFilter, setClaimTypeFilter] = useState("ALL");

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
        if (!resetPw || resetPw.length < 8) {
            setResetMsg("Password must be at least 8 characters");
            return;
        }
        const res = await api.patch(`/api/admin/users/${id}/reset-password`, { new_password: resetPw });
        const json = await res.json();
        setResetMsg(json.success ? "Password reset successfully!" : (json.error || "Failed"));
        if (json.success) setResetPw("");
    };

    if (loading) return <div className="page-loading">Loading user profile...</div>;
    if (error) return <div className="page-error">Error: {error}</div>;
    if (!data) return null;

    const { user, employees, claimStats, claims } = data;

    const filteredClaims = (claims || []).filter(c => {
        if (claimTypeFilter === "ALL") return true;
        return c.claim_type === claimTypeFilter;
    });

    const getClaimTypePill = (type) => {
        switch (type) {
            case "TA_DA":
                return <span className="claim-type-pill claim-type-pill--tada">TA/DA</span>;
            case "TRANSFER":
                return <span className="claim-type-pill claim-type-pill--transfer">Transfer</span>;
            case "MEDICAL":
                return <span className="claim-type-pill claim-type-pill--medical">Medical</span>;
            default:
                return <span className="claim-type-pill">{type}</span>;
        }
    };

    const getStatusBadge = (status) => {
        const s = (status || "DRAFT").toUpperCase();
        if (s === "FINALIZED" || s === "APPROVED") {
            return <span className="admin-badge admin-badge--finalized">Finalized</span>;
        } else if (s === "SUBMITTED") {
            return <span className="admin-badge admin-badge--submitted">Submitted</span>;
        }
        return <span className="admin-badge admin-badge--draft">Draft</span>;
    };

    return (
        <div className="admin-page">
            <Link to="/admin/users" className="admin-back-link">
                <ArrowLeft size={15} /> Back to User Management
            </Link>

            <div className="admin-page-header">
                <div style={{ display: "flex", alignItems: "center", gap: "1rem" }}>
                    <div className="admin-avatar-sm" style={{ width: 48, height: 48, fontSize: "1.2rem" }}>
                        {user.full_name?.charAt(0)?.toUpperCase() || "U"}
                    </div>
                    <div>
                        <h1 className="admin-page-title" style={{ marginBottom: "0.2rem" }}>{user.full_name}</h1>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.6rem" }}>
                            <span className={`admin-badge ${user.account_status === "active" ? "admin-badge--active" : "admin-badge--suspended"}`}>
                                {user.account_status}
                            </span>
                            <span style={{ fontSize: "0.82rem", color: "#64748b" }}>Role: <strong style={{ textTransform: "capitalize", color: "#0f172a" }}>{user.role}</strong></span>
                        </div>
                    </div>
                </div>
                {user.role !== "admin" && (
                    <button
                        type="button"
                        className={`btn ${user.account_status === "active" ? "btn-danger" : "btn-success"}`}
                        onClick={toggleStatus}
                    >
                        {user.account_status === "active" ? <><UserX size={15} /> Suspend Account</> : <><UserCheck size={15} /> Activate Account</>}
                    </button>
                )}
            </div>

            <div className="admin-detail-grid">
                {/* User Info */}
                <div className="admin-info-card">
                    <h3 className="admin-info-title"><User size={17} /> Account Details</h3>
                    <div className="admin-info-rows">
                        <div className="admin-info-row"><Mail size={15} /><span><strong>Email:</strong> {user.email}</span></div>
                        <div className="admin-info-row"><Phone size={15} /><span><strong>Mobile:</strong> {user.mobile_number || "Not provided"}</span></div>
                        <div className="admin-info-row"><Shield size={15} /><span><strong>Role:</strong> <span style={{ textTransform: "capitalize" }}>{user.role}</span></span></div>
                        <div className="admin-info-row"><Calendar size={15} /><span><strong>Registered:</strong> {user.created_at ? new Date(user.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-"}</span></div>
                        <div className="admin-info-row"><Clock size={15} /><span><strong>Last Login:</strong> {user.last_login_at ? new Date(user.last_login_at).toLocaleString("en-IN") : "Never"}</span></div>
                    </div>
                </div>

                {/* Stats */}
                <div className="admin-info-card">
                    <h3 className="admin-info-title"><Briefcase size={17} /> Activity & Claims Summary</h3>
                    <div className="admin-stat-rows">
                        <div className="admin-stat-row">
                            <span>Employees in master</span>
                            <strong>{employees?.length ?? 0}</strong>
                        </div>
                        <div className="admin-stat-row">
                            <span>Total claims submitted</span>
                            <strong>{claimStats?.total_claims ?? 0}</strong>
                        </div>
                        <div className="admin-stat-row">
                            <span>TA/DA claims</span>
                            <span style={{ fontWeight: 700, color: "#0284c7" }}>{claimStats?.tada_claims ?? 0}</span>
                        </div>
                        <div className="admin-stat-row">
                            <span>Transfer claims</span>
                            <span style={{ fontWeight: 700, color: "#ea580c" }}>{claimStats?.transfer_claims ?? 0}</span>
                        </div>
                        <div className="admin-stat-row">
                            <span>Medical claims</span>
                            <span style={{ fontWeight: 700, color: "#0d9488" }}>{claimStats?.medical_claims ?? 0}</span>
                        </div>
                        <div className="admin-stat-row">
                            <span>Total claim amount</span>
                            <strong style={{ color: "#0d9488", fontSize: "1.15rem" }}>₹{(claimStats?.total_amount ?? 0).toLocaleString("en-IN")}</strong>
                        </div>
                    </div>
                </div>

                {/* Password Reset */}
                {user.role !== "admin" && (
                    <div className="admin-info-card">
                        <h3 className="admin-info-title"><KeyRound size={17} /> Administrative Password Reset</h3>
                        <form onSubmit={resetPassword} style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
                            <div>
                                <label style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.82rem", fontWeight: 600, color: "#475569" }}>
                                    New Password (min 8 characters)
                                </label>
                                <input
                                    type="password"
                                    className="admin-search-input"
                                    style={{ paddingLeft: "0.875rem" }}
                                    value={resetPw}
                                    onChange={e => { setResetPw(e.target.value); setResetMsg(""); }}
                                    placeholder="Enter new temporary password..."
                                />
                            </div>
                            <button type="submit" className="btn btn-primary" style={{ alignSelf: "flex-start" }}>
                                Update Password
                            </button>
                        </form>
                        {resetMsg && (
                            <p style={{ marginTop: "0.6rem", color: resetMsg.includes("success") ? "#16a34a" : "#dc2626", fontSize: "0.85rem", fontWeight: 600, display: "flex", alignItems: "center", gap: "0.3rem" }}>
                                {resetMsg.includes("success") && <CheckCircle2 size={15} />} {resetMsg}
                            </p>
                        )}
                    </div>
                )}
            </div>

            {/* Claims & Bills Section */}
            <div className="admin-section">
                <div className="admin-section-header">
                    <div>
                        <h2 className="admin-section-title">User's Submitted Claims & Bills ({claims?.length ?? 0})</h2>
                        <p className="admin-section-sub">Comprehensive claim history, tour diaries, and Form 21 government bills</p>
                    </div>
                </div>

                <div className="admin-filter-tabs">
                    <button
                        type="button"
                        className={`admin-filter-tab ${claimTypeFilter === "ALL" ? "active" : ""}`}
                        onClick={() => setClaimTypeFilter("ALL")}
                    >
                        All Claims ({claims?.length ?? 0})
                    </button>
                    <button
                        type="button"
                        className={`admin-filter-tab ${claimTypeFilter === "TA_DA" ? "active" : ""}`}
                        onClick={() => setClaimTypeFilter("TA_DA")}
                    >
                        TA/DA Claims ({claimStats?.tada_claims ?? 0})
                    </button>
                    <button
                        type="button"
                        className={`admin-filter-tab ${claimTypeFilter === "TRANSFER" ? "active" : ""}`}
                        onClick={() => setClaimTypeFilter("TRANSFER")}
                    >
                        Transfer Claims ({claimStats?.transfer_claims ?? 0})
                    </button>
                    <button
                        type="button"
                        className={`admin-filter-tab ${claimTypeFilter === "MEDICAL" ? "active" : ""}`}
                        onClick={() => setClaimTypeFilter("MEDICAL")}
                    >
                        Medical Claims ({claimStats?.medical_claims ?? 0})
                    </button>
                </div>

                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>TD No / Claim ID</th>
                                <th>Employee</th>
                                <th>Claim Type</th>
                                <th>Period / Month</th>
                                <th style={{ textAlign: "right" }}>Amount</th>
                                <th style={{ textAlign: "center" }}>Status</th>
                                <th style={{ textAlign: "center" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredClaims.length ? filteredClaims.map((c, i) => (
                                <tr key={c.id}>
                                    <td style={{ color: "#64748b", fontWeight: 600 }}>{i + 1}</td>
                                    <td>
                                        <strong style={{ color: "#0f172a" }}>{c.td_no || `#${c.id}`}</strong>
                                        {c.remarks && (
                                            <span style={{ display: "block", fontSize: "0.75rem", color: "#64748b", maxWidth: "220px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                {c.remarks}
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <strong style={{ color: "#0f172a" }}>{c.employee_name}</strong>
                                        <span style={{ display: "block", fontSize: "0.75rem", color: "#64748b" }}>
                                            {c.designation || "-"}
                                        </span>
                                    </td>
                                    <td>{getClaimTypePill(c.claim_type)}</td>
                                    <td style={{ color: "#475569", fontSize: "0.82rem" }}>
                                        {c.start_date && c.end_date ? (
                                            `${c.start_date} to ${c.end_date}`
                                        ) : c.month && c.year ? (
                                            `${c.month}/${c.year}`
                                        ) : (
                                            new Date(c.created_at).toLocaleDateString("en-IN")
                                        )}
                                    </td>
                                    <td style={{ textAlign: "right", fontWeight: 800, color: "#0f172a", fontSize: "0.95rem" }}>
                                        ₹{(c.total_amount || 0).toLocaleString("en-IN")}
                                    </td>
                                    <td style={{ textAlign: "center" }}>
                                        {getStatusBadge(c.status)}
                                    </td>
                                    <td>
                                        <div style={{ display: "flex", gap: "0.4rem", justifyContent: "center", flexWrap: "wrap" }}>
                                            {c.claim_type !== "MEDICAL" ? (
                                                <Link
                                                    to={`/claims/${c.id}/bill`}
                                                    className="admin-table-link"
                                                    title="View / Print Form 21 Government Bill"
                                                >
                                                    View Bill
                                                </Link>
                                            ) : (
                                                <Link
                                                    to={`/medical-claims/${c.id}?print=1`}
                                                    className="admin-table-link"
                                                    title="View Medical Claim Form & Bill"
                                                >
                                                    View Bill
                                                </Link>
                                            )}
                                            <Link
                                                to={
                                                    c.claim_type === "TRANSFER"
                                                        ? `/claims/transfer/${c.id}`
                                                        : c.claim_type === "MEDICAL"
                                                        ? `/medical-claims/${c.id}`
                                                        : `/claims/${c.id}`
                                                }
                                                className="btn btn-secondary"
                                                style={{ padding: "0.3rem 0.65rem", fontSize: "0.78rem" }}
                                                title="View or edit claim details"
                                            >
                                                Details
                                            </Link>
                                            {(c.claim_type === "TA_DA" || c.claim_type === "TRANSFER") && (
                                                <Link
                                                    to={`/claims/${c.id}/tour-diary`}
                                                    className="btn btn-secondary"
                                                    style={{ padding: "0.3rem 0.65rem", fontSize: "0.78rem" }}
                                                    title="View Tour Diary entries"
                                                >
                                                    Diary
                                                </Link>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={8} style={{ textAlign: "center", color: "var(--text-3)", padding: "2.5rem" }}>
                                        No claims found matching this category
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Employee Master */}
            <div className="admin-section">
                <div className="admin-section-header">
                    <div>
                        <h2 className="admin-section-title">User's Employee Master Records ({employees?.length ?? 0})</h2>
                        <p className="admin-section-sub">Employees created and managed by this account</p>
                    </div>
                </div>
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Employee Name</th>
                                <th>Designation</th>
                                <th>Category</th>
                                <th>HQ</th>
                                <th>Basic Pay</th>
                            </tr>
                        </thead>
                        <tbody>
                            {employees?.length ? employees.map((emp, i) => (
                                <tr key={emp.id}>
                                    <td style={{ color: "#64748b", fontWeight: 600 }}>{i + 1}</td>
                                    <td>
                                        <strong style={{ color: "#0f172a" }}>{emp.name}</strong>
                                        {emp.name_hi && <span style={{ color: "#64748b", marginLeft: "0.5rem", fontSize: "0.84rem" }}>({emp.name_hi})</span>}
                                    </td>
                                    <td style={{ color: "#475569" }}>{emp.designation || "-"}</td>
                                    <td>
                                        <span style={{ background: "rgba(26,95,122,0.08)", color: "#1a5f7a", padding: "0.2rem 0.55rem", borderRadius: "5px", fontWeight: 600, fontSize: "0.78rem" }}>
                                            {emp.category || "-"}
                                        </span>
                                    </td>
                                    <td style={{ color: "#64748b" }}>{emp.headquarters || "-"}</td>
                                    <td style={{ fontWeight: 700, color: "#0f172a" }}>
                                        {emp.basic_pay ? `₹${emp.basic_pay.toLocaleString("en-IN")}` : "-"}
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={6} style={{ textAlign: "center", color: "var(--text-3)", padding: "2.5rem" }}>This user has not created any employee master records yet</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
