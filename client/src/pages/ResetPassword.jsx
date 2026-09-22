import React, { useState, useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { KeyRound, Lock, Eye, EyeOff, AlertCircle, CheckCircle, ArrowLeft, ArrowRight } from "lucide-react";
import api from "../utils/api";
import logoIco from "../assets/logo.ico";

export default function ResetPassword() {
    const location = useLocation();
    const navigate = useNavigate();

    // Read token from query params or location state if provided
    const queryParams = new URLSearchParams(location.search);
    const initialToken = queryParams.get("token") || location.state?.token || "";

    const [token, setToken] = useState(initialToken);
    const [password, setPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (initialToken) {
            setToken(initialToken);
        }
    }, [initialToken]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        const trimmedToken = token.trim();
        if (!trimmedToken) {
            setError("Reset token is required. Please paste or enter the token.");
            return;
        }

        if (!password) {
            setError("Please enter a new password.");
            return;
        }

        if (password.length < 8) {
            setError("Password must be at least 8 characters long.");
            return;
        }

        if (password !== confirmPassword) {
            setError("Passwords do not match. Please verify.");
            return;
        }

        setLoading(true);
        try {
            const res = await api.post("/api/auth/reset-password", {
                reset_token: trimmedToken,
                new_password: password
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.error || "Password reset failed");
            }
            setSuccess(true);
        } catch (err) {
            setError(err.message || "Failed to reset password. The token may be expired or invalid.");
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
                            <h2 className="auth-heading">Set new password</h2>
                            <p className="auth-subheading">
                                Enter your secure reset token and choose a new password.
                            </p>

                            {error && (
                                <div className="auth-alert auth-alert--error" style={{ marginBottom: "1rem" }}>
                                    <AlertCircle size={16} /><span>{error}</span>
                                </div>
                            )}

                            <form onSubmit={handleSubmit} className="auth-form" noValidate>
                                <div className="auth-field">
                                    <label htmlFor="reset-token" className="auth-label">
                                        Reset Token
                                    </label>
                                    <div className="auth-input-wrap">
                                        <KeyRound size={16} className="auth-input-icon" />
                                        <input
                                            id="reset-token"
                                            type="text"
                                            name="token"
                                            value={token}
                                            onChange={(e) => { setToken(e.target.value); setError(""); }}
                                            placeholder="Paste your 1-hour reset token here"
                                            disabled={loading}
                                            className="auth-input auth-input--icon"
                                            required
                                        />
                                    </div>
                                    <span style={{ fontSize: "0.72rem", color: "var(--text-3, #94a3b8)", marginTop: "2px" }}>
                                        Obtained from the Forgot Password screen or your administrator.
                                    </span>
                                </div>

                                <div className="auth-field">
                                    <label htmlFor="reset-password" className="auth-label">
                                        New Password
                                    </label>
                                    <div className="auth-input-wrap" style={{ position: "relative" }}>
                                        <Lock size={16} className="auth-input-icon" />
                                        <input
                                            id="reset-password"
                                            type={showPassword ? "text" : "password"}
                                            name="password"
                                            value={password}
                                            onChange={(e) => { setPassword(e.target.value); setError(""); }}
                                            placeholder="Minimum 8 characters"
                                            disabled={loading}
                                            className="auth-input auth-input--icon"
                                            style={{ paddingRight: "2.5rem" }}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPassword(!showPassword)}
                                            style={{
                                                position: "absolute",
                                                right: "0.75rem",
                                                top: "50%",
                                                transform: "translateY(-50%)",
                                                background: "none",
                                                border: "none",
                                                color: "var(--text-3, #94a3b8)",
                                                cursor: "pointer",
                                                padding: "2px"
                                            }}
                                            tabIndex={-1}
                                            title={showPassword ? "Hide password" : "Show password"}
                                        >
                                            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                </div>

                                <div className="auth-field">
                                    <label htmlFor="reset-confirm-password" className="auth-label">
                                        Confirm New Password
                                    </label>
                                    <div className="auth-input-wrap" style={{ position: "relative" }}>
                                        <Lock size={16} className="auth-input-icon" />
                                        <input
                                            id="reset-confirm-password"
                                            type={showConfirmPassword ? "text" : "password"}
                                            name="confirmPassword"
                                            value={confirmPassword}
                                            onChange={(e) => { setConfirmPassword(e.target.value); setError(""); }}
                                            placeholder="Re-enter your new password"
                                            disabled={loading}
                                            className="auth-input auth-input--icon"
                                            style={{ paddingRight: "2.5rem" }}
                                            required
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                            style={{
                                                position: "absolute",
                                                right: "0.75rem",
                                                top: "50%",
                                                transform: "translateY(-50%)",
                                                background: "none",
                                                border: "none",
                                                color: "var(--text-3, #94a3b8)",
                                                cursor: "pointer",
                                                padding: "2px"
                                            }}
                                            tabIndex={-1}
                                            title={showConfirmPassword ? "Hide password" : "Show password"}
                                        >
                                            {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                        </button>
                                    </div>
                                    {password && confirmPassword && password !== confirmPassword && (
                                        <span style={{ fontSize: "0.75rem", color: "#ef4444", marginTop: "2px" }}>
                                            Passwords do not match
                                        </span>
                                    )}
                                </div>

                                <button
                                    type="submit"
                                    id="reset-submit-btn"
                                    className="auth-btn"
                                    disabled={loading || (password && confirmPassword && password !== confirmPassword)}
                                    style={{ marginTop: "0.5rem" }}
                                >
                                    {loading ? <span className="auth-btn-spinner" /> : null}
                                    {loading ? "Updating Password..." : "Update Password"}
                                </button>
                            </form>
                        </>
                    ) : (
                        <div style={{ textAlign: "center", padding: "1rem 0" }}>
                            <div style={{
                                width: "56px",
                                height: "56px",
                                borderRadius: "50%",
                                background: "#dcfce7",
                                color: "#16a34a",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                margin: "0 auto 1.25rem auto"
                            }}>
                                <CheckCircle size={32} />
                            </div>
                            <h2 className="auth-heading" style={{ marginBottom: "0.5rem" }}>
                                Password Reset Complete!
                            </h2>
                            <p className="auth-subheading" style={{ marginBottom: "1.5rem" }}>
                                Your password has been successfully updated. You can now log into your account using your new credentials.
                            </p>
                            <Link
                                to="/login"
                                className="auth-btn"
                                style={{
                                    display: "inline-flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    gap: "0.5rem",
                                    textDecoration: "none"
                                }}
                            >
                                Proceed to Login <ArrowRight size={16} />
                            </Link>
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
