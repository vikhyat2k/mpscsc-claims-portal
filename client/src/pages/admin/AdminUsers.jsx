import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, UserCheck, UserX, Eye, ShieldCheck, X, LogIn } from "lucide-react";
import api, { apiRequest } from "../../utils/api";
import { useAuth } from "../../contexts/AuthContext";

export default function AdminUsers() {
    const navigate = useNavigate();
    const { impersonateUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const fetchUsers = async (q = "") => {
        setLoading(true);
        try {
            const res = await api.get(`/api/admin/users${q ? `?search=${encodeURIComponent(q)}` : ""}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error);
            setUsers(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchUsers(); }, []);

    const handleSearch = (e) => {
        e.preventDefault();
        fetchUsers(search);
    };

    const handleClear = () => {
        setSearch("");
        fetchUsers("");
    };

    const toggleStatus = async (userId, currentStatus) => {
        const newStatus = currentStatus === "active" ? "suspended" : "active";
        if (!confirm(`${newStatus === "suspended" ? "Suspend" : "Activate"} this user?`)) return;
        try {
            const res = await api.patch(`/api/admin/users/${userId}/status`, { status: newStatus });
            if (res.ok) fetchUsers(search);
        } catch (err) {
            alert("Failed to update status: " + err.message);
        }
    };

    const handleImpersonate = async (u) => {
        if (!window.confirm(`Log into the portal as ${u.full_name} (${u.email})?\n\nYou will be able to review and view exactly what this user sees. You can return to Admin at any time via the top banner.`)) {
            return;
        }
        try {
            await impersonateUser(u.id);
            navigate('/');
        } catch (err) {
            alert(err.message || 'Failed to impersonate user');
        }
    };

    return (
        <div className="admin-page">
            <div className="admin-page-header">
                <div>
                    <div className="admin-badge-pill">
                        <ShieldCheck size={12} /> User Directory
                    </div>
                    <h1 className="admin-page-title">User Management</h1>
                    <p className="admin-page-subtitle">View, search, and manage registered users, account statuses, and employee data</p>
                </div>
            </div>

            <form onSubmit={handleSearch} className="admin-search-bar">
                <div className="admin-search-wrap">
                    <Search size={16} className="admin-search-icon" />
                    <input
                        type="text"
                        className="admin-search-input"
                        placeholder="Search by name, email, or mobile number..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                {search && (
                    <button type="button" className="btn btn-secondary" onClick={handleClear} style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                        <X size={14} /> Clear
                    </button>
                )}
                <button type="submit" className="btn btn-primary">Search</button>
            </form>

            {error && <div className="page-error">{error}</div>}

            <div className="admin-table-wrap">
                {loading ? (
                    <div className="page-loading">Loading registered users...</div>
                ) : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>User</th>
                                <th>Email</th>
                                <th>Mobile</th>
                                <th style={{ textAlign: "center" }}>Employees</th>
                                <th>Registered</th>
                                <th>Last Login</th>
                                <th>Status</th>
                                <th style={{ textAlign: "center" }}>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length ? users.map((u, i) => (
                                <tr key={u.id}>
                                    <td style={{ color: "#64748b", fontWeight: 600 }}>{i + 1}</td>
                                    <td>
                                        <div className="admin-user-cell">
                                            <div className="admin-avatar-sm">
                                                {u.full_name?.charAt(0)?.toUpperCase() || "U"}
                                            </div>
                                            <div>
                                                <strong style={{ color: "#0f172a", display: "block" }}>{u.full_name}</strong>
                                                {u.role === "admin" && (
                                                    <span style={{ fontSize: "0.7rem", color: "#1a5f7a", fontWeight: 700, textTransform: "uppercase" }}>Admin</span>
                                                )}
                                            </div>
                                        </div>
                                    </td>
                                    <td style={{ color: "#475569" }}>{u.email}</td>
                                    <td style={{ color: "#64748b" }}>{u.mobile_number || "-"}</td>
                                    <td style={{ textAlign: "center" }}>
                                        <span style={{ background: "rgba(26,95,122,0.08)", color: "#1a5f7a", padding: "0.2rem 0.6rem", borderRadius: "6px", fontWeight: 700, fontSize: "0.8rem" }}>
                                            {u.employee_count ?? 0}
                                        </span>
                                    </td>
                                    <td style={{ color: "#64748b" }}>
                                        {u.created_at ? new Date(u.created_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "-"}
                                    </td>
                                    <td style={{ color: "#64748b" }}>
                                        {u.last_login_at ? new Date(u.last_login_at).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "Never"}
                                    </td>
                                    <td>
                                        <span className={`admin-badge ${u.account_status === "active" ? "admin-badge--active" : "admin-badge--suspended"}`}>
                                            {u.account_status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="admin-action-btns" style={{ justifyContent: "center" }}>
                                            <Link to={`/admin/users/${u.id}`} className="admin-icon-btn admin-icon-btn--view" title="View Profile">
                                                <Eye size={15} />
                                            </Link>
                                            {u.role !== "admin" && (
                                                <>
                                                    <button
                                                        type="button"
                                                        className="admin-icon-btn admin-icon-btn--impersonate"
                                                        onClick={() => handleImpersonate(u)}
                                                        disabled={u.account_status !== "active"}
                                                        title={u.account_status !== "active" ? "Cannot log in as a suspended user" : "Log In As This User"}
                                                        style={{ opacity: u.account_status !== "active" ? 0.45 : 1, cursor: u.account_status !== "active" ? "not-allowed" : "pointer" }}
                                                    >
                                                        <LogIn size={15} />
                                                    </button>
                                                    <button
                                                        type="button"
                                                        className={`admin-icon-btn ${u.account_status === "active" ? "admin-icon-btn--suspend" : "admin-icon-btn--activate"}`}
                                                        onClick={() => toggleStatus(u.id, u.account_status)}
                                                        title={u.account_status === "active" ? "Suspend Account" : "Activate Account"}
                                                    >
                                                        {u.account_status === "active" ? <UserX size={15} /> : <UserCheck size={15} />}
                                                    </button>
                                                </>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={9} style={{ textAlign: "center", color: "var(--text-3)", padding: "2.5rem" }}>No users found matching search</td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
