import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Users, FileText, DollarSign, Activity, UserCheck, UserX, TrendingUp } from "lucide-react";
import api from "../../utils/api";

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

    if (loading) return <div className="page-loading">Loading admin dashboard...</div>;
    if (error) return <div className="page-error">Error: {error}</div>;

    return (
        <div className="admin-page">
            <div className="admin-page-header">
                <div>
                    <h1 className="admin-page-title">Admin Dashboard</h1>
                    <p className="admin-page-subtitle">Platform overview and management</p>
                </div>
                <Link to="/admin/users" className="btn btn-primary">Manage Users</Link>
            </div>

            <div className="admin-kpi-grid">
                <div className="admin-kpi-card">
                    <div className="admin-kpi-icon admin-kpi-icon--blue"><Users size={20} /></div>
                    <div>
                        <p className="admin-kpi-label">Total Users</p>
                        <p className="admin-kpi-value">{stats?.totalUsers ?? 0}</p>
                    </div>
                </div>
                <div className="admin-kpi-card">
                    <div className="admin-kpi-icon admin-kpi-icon--green"><UserCheck size={20} /></div>
                    <div>
                        <p className="admin-kpi-label">Active Users</p>
                        <p className="admin-kpi-value">{stats?.activeUsers ?? 0}</p>
                    </div>
                </div>
                <div className="admin-kpi-card">
                    <div className="admin-kpi-icon admin-kpi-icon--purple"><Activity size={20} /></div>
                    <div>
                        <p className="admin-kpi-label">Total Employees</p>
                        <p className="admin-kpi-value">{stats?.totalEmployees ?? 0}</p>
                    </div>
                </div>
                <div className="admin-kpi-card">
                    <div className="admin-kpi-icon admin-kpi-icon--orange"><FileText size={20} /></div>
                    <div>
                        <p className="admin-kpi-label">Total Claims</p>
                        <p className="admin-kpi-value">{stats?.totalClaims ?? 0}</p>
                    </div>
                </div>
                <div className="admin-kpi-card admin-kpi-card--wide">
                    <div className="admin-kpi-icon admin-kpi-icon--teal"><DollarSign size={20} /></div>
                    <div>
                        <p className="admin-kpi-label">Total Claim Amount</p>
                        <p className="admin-kpi-value">₹{(stats?.totalAmount ?? 0).toLocaleString("en-IN")}</p>
                    </div>
                </div>
            </div>

            <div className="admin-section">
                <h2 className="admin-section-title">Recent Registrations</h2>
                <div className="admin-table-wrap">
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Registered</th>
                                <th>Action</th>
                            </tr>
                        </thead>
                        <tbody>
                            {stats?.recentUsers?.length ? stats.recentUsers.map((u, i) => (
                                <tr key={u.id}>
                                    <td>{i + 1}</td>
                                    <td>{u.full_name}</td>
                                    <td>{u.email}</td>
                                    <td>{new Date(u.created_at).toLocaleDateString("en-IN")}</td>
                                    <td><Link to={`/admin/users/${u.id}`} className="admin-table-link">View</Link></td>
                                </tr>
                            )) : (
                                <tr><td colSpan={5} style={{ textAlign: "center", color: "var(--text-muted)" }}>No users yet</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
