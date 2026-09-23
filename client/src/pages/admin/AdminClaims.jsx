import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
    Search, Filter, ShieldCheck, ArrowUpRight,
    FileText, DollarSign, Activity, IndianRupee,
    User, X, ChevronRight, Trash2, AlertTriangle
} from "lucide-react";
import api, { apiRequest } from "../../utils/api";

export default function AdminClaims() {
    const [claims, setClaims] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("ALL");
    const [statusFilter, setStatusFilter] = useState("ALL");

    // Accidental deletion modal state
    const [claimToDelete, setClaimToDelete] = useState(null);
    const [deletingClaim, setDeletingClaim] = useState(false);
    const [deleteClaimError, setDeleteClaimError] = useState("");

    const fetchClaims = async (q = search, type = typeFilter, status = statusFilter) => {
        setLoading(true);
        try {
            const params = new URLSearchParams();
            if (q) params.append("search", q);
            if (type && type !== "ALL") params.append("type", type);
            if (status && status !== "ALL") params.append("status", status);

            const res = await api.get(`/api/admin/claims?${params.toString()}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to load claims");
            setClaims(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchClaims();
    }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        fetchClaims(search, typeFilter, statusFilter);
    };

    const handleTypeChange = (type) => {
        setTypeFilter(type);
        fetchClaims(search, type, statusFilter);
    };

    const handleStatusChange = (status) => {
        setStatusFilter(status);
        fetchClaims(search, typeFilter, status);
    };

    const handleClear = () => {
        setSearch("");
        setTypeFilter("ALL");
        setStatusFilter("ALL");
        fetchClaims("", "ALL", "ALL");
    };

    const totalAmount = claims.reduce((acc, c) => acc + (Number(c.total_amount) || 0), 0);
    const tadaCount = claims.filter(c => c.claim_type === "TA_DA").length;
    const transferCount = claims.filter(c => c.claim_type === "TRANSFER").length;
    const medicalCount = claims.filter(c => c.claim_type === "MEDICAL").length;

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
            <div className="admin-page-header">
                <div>
                    <div className="admin-badge-pill">
                        <ShieldCheck size={12} /> Central Claims Oversight
                    </div>
                    <h1 className="admin-page-title">All User Claims Register</h1>
                    <p className="admin-page-subtitle">
                        Audit, inspect, and verify all claims and Form 21 bills submitted across the entire MPSCSC portal
                    </p>
                </div>
            </div>

            {/* Quick Metrics */}
            <div className="admin-kpi-grid" style={{ marginBottom: "1.5rem" }}>
                <div className="admin-kpi-card">
                    <div className="admin-kpi-icon admin-kpi-icon--orange"><FileText size={22} /></div>
                    <div>
                        <p className="admin-kpi-label">Filtered Claims</p>
                        <p className="admin-kpi-value">{claims.length}</p>
                        <p className="admin-kpi-sub">Total matching filters</p>
                    </div>
                </div>
                <div className="admin-kpi-card">
                    <div className="admin-kpi-icon admin-kpi-icon--teal"><IndianRupee size={22} /></div>
                    <div>
                        <p className="admin-kpi-label">Total Claim Amount</p>
                        <p className="admin-kpi-value">₹{Math.round(totalAmount).toLocaleString("en-IN")}</p>
                        <p className="admin-kpi-sub">Cumulative claim value</p>
                    </div>
                </div>
                <div className="admin-kpi-card">
                    <div className="admin-kpi-icon admin-kpi-icon--blue"><FileText size={22} /></div>
                    <div>
                        <p className="admin-kpi-label">TA/DA Claims</p>
                        <p className="admin-kpi-value">{tadaCount}</p>
                        <p className="admin-kpi-sub">Tour & allowance claims</p>
                    </div>
                </div>
                <div className="admin-kpi-card">
                    <div className="admin-kpi-icon admin-kpi-icon--purple"><Activity size={22} /></div>
                    <div>
                        <p className="admin-kpi-label">Transfer Claims</p>
                        <p className="admin-kpi-value">{transferCount}</p>
                        <p className="admin-kpi-sub">Relocation allowances</p>
                    </div>
                </div>
                <div className="admin-kpi-card">
                    <div className="admin-kpi-icon admin-kpi-icon--green"><FileText size={22} /></div>
                    <div>
                        <p className="admin-kpi-label">Medical Claims</p>
                        <p className="admin-kpi-value">{medicalCount}</p>
                        <p className="admin-kpi-sub">Reimbursement claims</p>
                    </div>
                </div>
            </div>

            {/* Search & Filter Bar */}
            <form onSubmit={handleSearch} className="admin-search-bar" style={{ flexWrap: "wrap", gap: "0.75rem" }}>
                <div className="admin-search-wrap" style={{ minWidth: "260px" }}>
                    <Search size={16} className="admin-search-icon" />
                    <input
                        type="text"
                        className="admin-search-input"
                        placeholder="Search by employee, submitter name, email, TD No..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>

                <select
                    className="admin-search-input"
                    style={{ width: "auto", minWidth: "150px", paddingLeft: "0.85rem" }}
                    value={typeFilter}
                    onChange={e => handleTypeChange(e.target.value)}
                >
                    <option value="ALL">All Types</option>
                    <option value="TA_DA">TA/DA Claims</option>
                    <option value="TRANSFER">Transfer Claims</option>
                    <option value="MEDICAL">Medical Claims</option>
                </select>

                <select
                    className="admin-search-input"
                    style={{ width: "auto", minWidth: "150px", paddingLeft: "0.85rem" }}
                    value={statusFilter}
                    onChange={e => handleStatusChange(e.target.value)}
                >
                    <option value="ALL">All Statuses</option>
                    <option value="FINALIZED">Finalized</option>
                    <option value="SUBMITTED">Submitted</option>
                    <option value="DRAFT">Draft</option>
                </select>

                <button type="submit" className="btn btn-primary">
                    Search
                </button>

                {(search || typeFilter !== "ALL" || statusFilter !== "ALL") && (
                    <button type="button" className="btn btn-secondary" onClick={handleClear} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                        <X size={14} /> Clear
                    </button>
                )}
            </form>

            {error && <div className="page-error">{error}</div>}

            {/* Claims Table */}
            <div className="admin-table-wrap">
                {loading ? (
                    <div className="page-loading">Loading claims register...</div>
                ) : (
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
                                <th style={{ textAlign: "center" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {claims.length ? claims.map((c, i) => (
                                <tr key={c.id}>
                                    <td style={{ color: "#64748b", fontWeight: 600 }}>{i + 1}</td>
                                    <td>
                                        <strong style={{ color: "#0f172a" }}>{c.td_no || `#${c.id}`}</strong>
                                        {c.remarks && (
                                            <span style={{ display: "block", fontSize: "0.74rem", color: "#64748b", maxWidth: "200px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                                                {c.remarks}
                                            </span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="admin-user-cell">
                                            <div className="admin-avatar-sm" style={{ width: 28, height: 28, fontSize: "0.75rem" }}>
                                                {c.user_name?.charAt(0)?.toUpperCase() || "U"}
                                            </div>
                                            <div>
                                                <Link to={`/admin/users/${c.user_id}`} style={{ color: "#0f172a", fontWeight: 700, textDecoration: "none" }}>
                                                    {c.user_name}
                                                </Link>
                                                <span style={{ display: "block", fontSize: "0.72rem", color: "#64748b" }}>
                                                    {c.user_email}
                                                </span>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                                        <strong style={{ color: "#0f172a" }}>{c.employee_name}</strong>
                                        <span style={{ display: "block", fontSize: "0.74rem", color: "#64748b" }}>
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
                                            <button
                                                type="button"
                                                className="btn btn-secondary"
                                                style={{
                                                    padding: "0.3rem 0.55rem",
                                                    fontSize: "0.78rem",
                                                    color: "#ef4444",
                                                    borderColor: "rgba(239, 68, 68, 0.3)",
                                                    background: "rgba(239, 68, 68, 0.05)"
                                                }}
                                                onClick={() => {
                                                    setClaimToDelete(c);
                                                    setDeleteClaimError("");
                                                }}
                                                title="Permanently Delete Claim"
                                            >
                                                <Trash2 size={13} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={9} style={{ textAlign: "center", color: "var(--text-3)", padding: "3rem" }}>
                                        No claims found matching your filter criteria
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>

            {/* Accidental Deletion Prevention Confirmation Modal for Claims */}
            {claimToDelete && (
                <div style={{
                    position: "fixed",
                    inset: 0,
                    backgroundColor: "rgba(15, 23, 42, 0.65)",
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
                        maxWidth: "480px",
                        width: "100%",
                        padding: "1.75rem",
                        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                        border: "1px solid #fee2e2"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem" }}>
                            <div style={{ background: "#fee2e2", padding: "0.6rem", borderRadius: "10px" }}>
                                <AlertTriangle size={24} color="#dc2626" />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#991b1b" }}>
                                    Delete Claim Record
                                </h3>
                                <span style={{ fontSize: "0.85rem", color: "#64748b" }}>Admin Confirmation Required</span>
                            </div>
                        </div>

                        <div style={{
                            background: "#fff1f2",
                            border: "1px solid #fecdd3",
                            borderRadius: "8px",
                            padding: "0.85rem 1rem",
                            fontSize: "0.88rem",
                            color: "#9f1239",
                            lineHeight: "1.45",
                            marginBottom: "1.25rem"
                        }}>
                            <strong>Are you sure you want to permanently delete this claim?</strong>
                            <div style={{ margin: "0.5rem 0 0 0", fontSize: "0.85rem", color: "#475569" }}>
                                <div>• <strong>Claim ID:</strong> #{claimToDelete.id} ({claimToDelete.rendered_claim_id || claimToDelete.td_no || "—"})</div>
                                <div>• <strong>Type:</strong> {claimToDelete.claim_type}</div>
                                <div>• <strong>Employee:</strong> {claimToDelete.employee_name || "—"}</div>
                                <div>• <strong>Amount:</strong> ₹{Number(claimToDelete.total_amount || 0).toLocaleString("en-IN")}</div>
                            </div>
                            <p style={{ margin: "0.5rem 0 0 0", fontSize: "0.82rem", color: "#b91c1c", fontWeight: 600 }}>
                                This will permanently delete the claim, all journey legs, daily allowances, and itemized medical bills.
                            </p>
                        </div>

                        {deleteClaimError && (
                            <div style={{ color: "#dc2626", fontSize: "0.85rem", marginBottom: "1rem", fontWeight: 600 }}>
                                ⚠️ {deleteClaimError}
                            </div>
                        )}

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setClaimToDelete(null)}
                                disabled={deletingClaim}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={async () => {
                                    setDeletingClaim(true);
                                    setDeleteClaimError("");
                                    try {
                                        const res = await api.delete(`/api/admin/claims/${claimToDelete.id}`);
                                        const json = await res.json();
                                        if (!res.ok) throw new Error(json.error || "Failed to delete claim");
                                        setClaimToDelete(null);
                                        fetchClaims(search, typeFilter, statusFilter);
                                    } catch (err) {
                                        setDeleteClaimError(err.message);
                                    } finally {
                                        setDeletingClaim(false);
                                    }
                                }}
                                disabled={deletingClaim}
                                style={{
                                    background: "#dc2626",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "8px",
                                    padding: "0.65rem 1.25rem",
                                    fontWeight: 700,
                                    fontSize: "0.9rem",
                                    cursor: "pointer",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.4rem"
                                }}
                            >
                                <Trash2 size={16} />
                                {deletingClaim ? "Deleting..." : "Yes, Delete Claim"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
