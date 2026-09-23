import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, UserCheck, UserX, Eye, ShieldCheck, X, LogIn, Trash2, AlertTriangle } from "lucide-react";
import api, { apiRequest } from "../../utils/api";
import { useAuth } from "../../contexts/AuthContext";

export default function AdminUsers() {
    const navigate = useNavigate();
    const { impersonateUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [search, setSearch] = useState("");
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Accidental deletion modal state
    const [userToDelete, setUserToDelete] = useState(null);
    const [confirmEmailInput, setConfirmEmailInput] = useState("");
    const [deleting, setDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState("");

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

    const openDeleteModal = (u) => {
        setUserToDelete(u);
        setConfirmEmailInput("");
        setDeleteError("");
    };

    const closeDeleteModal = () => {
        setUserToDelete(null);
        setConfirmEmailInput("");
        setDeleteError("");
    };

    const handleConfirmDelete = async () => {
        if (!userToDelete) return;
        if (confirmEmailInput.trim().toLowerCase() !== userToDelete.email.toLowerCase()) {
            setDeleteError("Confirmation email does not match.");
            return;
        }

        setDeleting(true);
        setDeleteError("");
        try {
            const res = await api.delete(`/api/admin/users/${userToDelete.id}`);
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Failed to delete user");

            closeDeleteModal();
            fetchUsers(search);
        } catch (err) {
            setDeleteError(err.message);
        } finally {
            setDeleting(false);
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
                                                    <button
                                                        type="button"
                                                        className="admin-icon-btn"
                                                        onClick={() => openDeleteModal(u)}
                                                        title="Permanently Delete User & All Data"
                                                        style={{ color: "#ef4444", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}
                                                    >
                                                        <Trash2 size={15} />
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

            {/* Accidental Deletion Prevention Confirmation Modal */}
            {userToDelete && (
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
                        maxWidth: "520px",
                        width: "100%",
                        padding: "1.75rem",
                        boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
                        border: "1px solid #fee2e2"
                    }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", marginBottom: "1rem", color: "#b91c1c" }}>
                            <div style={{ background: "#fee2e2", padding: "0.6rem", borderRadius: "10px" }}>
                                <AlertTriangle size={24} color="#dc2626" />
                            </div>
                            <div>
                                <h3 style={{ margin: 0, fontSize: "1.2rem", fontWeight: 700, color: "#991b1b" }}>
                                    Delete User Account
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
                            <strong>Warning: This action is permanent and irreversible!</strong>
                            <p style={{ margin: "0.35rem 0 0 0", fontSize: "0.84rem" }}>
                                Deleting <strong>{userToDelete.full_name}</strong> will permanently remove this account, all associated employee master records, and all submitted claims (TA/DA, Medical, Transfer, Tour Diaries).
                            </p>
                        </div>

                        <div style={{ marginBottom: "1.25rem" }}>
                            <label style={{ display: "block", fontSize: "0.85rem", fontWeight: 600, color: "#334155", marginBottom: "0.5rem" }}>
                                To prevent accidental deletion, type <code style={{ background: "#f1f5f9", padding: "0.2rem 0.4rem", borderRadius: "4px", color: "#0f172a" }}>{userToDelete.email}</code> to confirm:
                            </label>
                            <input
                                type="text"
                                style={{
                                    width: "100%",
                                    padding: "0.65rem 0.85rem",
                                    borderRadius: "8px",
                                    border: confirmEmailInput.trim().toLowerCase() === userToDelete.email.toLowerCase() ? "2px solid #22c55e" : "1px solid #cbd5e1",
                                    fontSize: "0.92rem",
                                    outline: "none"
                                }}
                                placeholder={userToDelete.email}
                                value={confirmEmailInput}
                                onChange={e => setConfirmEmailInput(e.target.value)}
                                autoFocus
                            />
                        </div>

                        {deleteError && (
                            <div style={{ color: "#dc2626", fontSize: "0.85rem", marginBottom: "1rem", fontWeight: 600 }}>
                                ⚠️ {deleteError}
                            </div>
                        )}

                        <div style={{ display: "flex", justifyContent: "flex-end", gap: "0.75rem" }}>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={closeDeleteModal}
                                disabled={deleting}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleConfirmDelete}
                                disabled={confirmEmailInput.trim().toLowerCase() !== userToDelete.email.toLowerCase() || deleting}
                                style={{
                                    background: confirmEmailInput.trim().toLowerCase() === userToDelete.email.toLowerCase() ? "#dc2626" : "#cbd5e1",
                                    color: "#ffffff",
                                    border: "none",
                                    borderRadius: "8px",
                                    padding: "0.65rem 1.25rem",
                                    fontWeight: 700,
                                    fontSize: "0.9rem",
                                    cursor: confirmEmailInput.trim().toLowerCase() === userToDelete.email.toLowerCase() ? "pointer" : "not-allowed",
                                    display: "inline-flex",
                                    alignItems: "center",
                                    gap: "0.4rem",
                                    transition: "all 0.15s ease"
                                }}
                            >
                                <Trash2 size={16} />
                                {deleting ? "Deleting..." : "Permanently Delete"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

