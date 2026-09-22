import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, UserCheck, UserX, Eye } from "lucide-react";
import api from "../../utils/api";

export default function AdminUsers() {
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

    return (
        <div className="admin-page">
            <div className="admin-page-header">
                <div>
                    <h1 className="admin-page-title">User Management</h1>
                    <p className="admin-page-subtitle">View and manage all registered users</p>
                </div>
            </div>

            <form onSubmit={handleSearch} className="admin-search-bar">
                <div className="admin-search-wrap">
                    <Search size={16} className="admin-search-icon" />
                    <input type="text" className="admin-search-input" placeholder="Search by name or email..."
                        value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                <button type="submit" className="btn btn-primary">Search</button>
            </form>

            {error && <div className="page-error">{error}</div>}

            <div className="admin-table-wrap">
                {loading ? (
                    <div className="page-loading">Loading users...</div>
                ) : (
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Mobile</th>
                                <th>Employees</th>
                                <th>Registered</th>
                                <th>Last Login</th>
                                <th>Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {users.length ? users.map((u, i) => (
                                <tr key={u.id}>
                                    <td>{i + 1}</td>
                                    <td><strong>{u.full_name}</strong></td>
                                    <td>{u.email}</td>
                                    <td>{u.mobile_number}</td>
                                    <td style={{ textAlign: "center" }}>{u.employee_count ?? 0}</td>
                                    <td>{u.created_at ? new Date(u.created_at).toLocaleDateString("en-IN") : "-"}</td>
                                    <td>{u.last_login_at ? new Date(u.last_login_at).toLocaleDateString("en-IN") : "Never"}</td>
                                    <td>
                                        <span className={`admin-badge ${u.account_status === "active" ? "admin-badge--active" : "admin-badge--suspended"}`}>
                                            {u.account_status}
                                        </span>
                                    </td>
                                    <td>
                                        <div className="admin-action-btns">
                                            <Link to={`/admin/users/${u.id}`} className="admin-icon-btn admin-icon-btn--view" title="View Profile">
                                                <Eye size={14} />
                                            </Link>
                                            {u.role !== "admin" && (
                                                <button className={`admin-icon-btn ${u.account_status === "active" ? "admin-icon-btn--suspend" : "admin-icon-btn--activate"}`}
                                                    onClick={() => toggleStatus(u.id, u.account_status)}
                                                    title={u.account_status === "active" ? "Suspend" : "Activate"}>
                                                    {u.account_status === "active" ? <UserX size={14} /> : <UserCheck size={14} />}
                                                </button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={9} style={{ textAlign: "center", color: "var(--text-muted)", padding: "2rem" }}>No users found</td></tr>
                            )}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
}
