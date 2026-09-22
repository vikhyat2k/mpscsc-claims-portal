import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, AlertCircle, CheckCircle, ArrowLeft } from "lucide-react";
import api from "../utils/api";
import logoIco from "../assets/logo.ico";

export default function ForgotPassword() {
    const [email, setEmail] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const [resetToken, setResetToken] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!email.trim()) { setError("Email is required"); return; }
        setLoading(true);
        setError("");
        try {
            const res = await api.post("/api/auth/forgot-password", { email });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || "Request failed");
            setSuccess(true);
            // Show token if returned (admin-relay flow)
            if (data.reset_token) setResetToken(data.reset_token);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-bg-pattern" aria-hidden="true" />
            <div className="auth-container">
                <div className="auth-card">
                    <div className="auth-logo-wrap">
                        <img src={logoIco} alt="MPSCSC" className="auth-logo" />
                        <div>
                            <h1 className="auth-brand-title">MPSCSC</h1>
                            <p className="auth-brand-sub">Claims Portal</p>
                        </div>
                    </div>

                    {!success ? (
                        <>
                            <h2 className="auth-heading">Reset your password</h2>
                            <p className="auth-subheading">Enter your email and we will generate a reset token for you.</p>

                            {error && (
                                <div className="auth-alert auth-alert--error">
                                    <AlertCircle size={16} /><span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="auth-form" noValidate>
                                <div className="auth-field">
                                    <label htmlFor="forgot-email" className="auth-label">Email Address</label>
                                    <div className="auth-input-wrap">
                                        <Mail size={16} className="auth-input-icon" />
                                        <input id="forgot-email" type="email" name="email"
                                            value={email} onChange={e => { setEmail(e.target.value); setError(""); }}
                                            placeholder="you@example.com" disabled={loading}
                                            className="auth-input auth-input--icon" required />
                                    </div>
                                </div>
                                <button type="submit" id="forgot-submit-btn" className="auth-btn" disabled={loading}>
                                    {loading ? <span className="auth-btn-spinner" /> : null}
                                    {loading ? "Sending..." : "Send Reset Token"}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div>
                            <div className="auth-alert auth-alert--success" style={{ marginBottom: "1.5rem" }}>
                                <CheckCircle size={16} /><span>Reset token generated successfully!</span>
                            </div>
                            <p className="auth-subheading" style={{ marginBottom: "1rem" }}>
                                Please contact the administrator to get your reset token. They can see it in the Admin Panel.
                            </p>
                            {resetToken && (
                                <div className="auth-token-box">
                                    <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginBottom: "0.5rem" }}>
                                        Your reset token (share with admin or use below):
                                    </p>
                                    <code style={{ wordBreak: "break-all", fontSize: "0.7rem" }}>{resetToken}</code>
                                </div>
                            )}
                            <p className="auth-subheading" style={{ marginTop: "1rem" }}>
                                Once you have the token, use the <Link to="/reset-password" className="auth-link">Reset Password</Link> page.
                            </p>
                        </div>
                    )}

                    <p className="auth-footer-text">
                        <Link to="/login" className="auth-link" style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
                            <ArrowLeft size={14} /> Back to login
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
