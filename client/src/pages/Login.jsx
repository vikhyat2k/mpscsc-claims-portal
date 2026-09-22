import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, AlertCircle, CheckCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import logoIco from "../assets/logo.ico";

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || "/";

    const [formData, setFormData] = useState({ email: "", password: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const successMsg = location.state?.success;

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!formData.email || !formData.password) {
            setError("Please enter your email and password.");
            return;
        }
        setLoading(true);
        setError("");
        try {
            await login(formData.email, formData.password);
            navigate(from, { replace: true });
        } catch (err) {
            setError(err.message || "Login failed. Please try again.");
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

                    <h2 className="auth-heading">Welcome back</h2>
                    <p className="auth-subheading">Sign in to your account to continue</p>

                    {successMsg && (
                        <div className="auth-alert auth-alert--success">
                            <CheckCircle size={16} />
                            <span>{successMsg}</span>
                        </div>
                    )}

                    {error && (
                        <div className="auth-alert auth-alert--error">
                            <AlertCircle size={16} />
                            <span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="auth-form" noValidate>
                        <div className="auth-field">
                            <label htmlFor="login-email" className="auth-label">Email Address</label>
                            <div className="auth-input-wrap">
                                <Mail size={16} className="auth-input-icon" />
                                <input
                                    id="login-email"
                                    type="email"
                                    name="email"
                                    autoComplete="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="you@example.com"
                                    className="auth-input auth-input--icon"
                                    disabled={loading}
                                    required
                                />
                            </div>
                        </div>

                        <div className="auth-field">
                            <div className="auth-label-row">
                                <label htmlFor="login-password" className="auth-label">Password</label>
                                <Link to="/forgot-password" className="auth-link-small">Forgot password?</Link>
                            </div>
                            <div className="auth-input-wrap">
                                <Lock size={16} className="auth-input-icon" />
                                <input
                                    id="login-password"
                                    type={showPassword ? "text" : "password"}
                                    name="password"
                                    autoComplete="current-password"
                                    value={formData.password}
                                    onChange={handleChange}
                                    placeholder="Your password"
                                    className="auth-input auth-input--icon auth-input--pr"
                                    disabled={loading}
                                    required
                                />
                                <button
                                    type="button"
                                    className="auth-eye-btn"
                                    onClick={() => setShowPassword(v => !v)}
                                    aria-label={showPassword ? "Hide password" : "Show password"}
                                >
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                        </div>

                        <button type="submit" id="login-submit-btn" className="auth-btn" disabled={loading}>
                            {loading ? <span className="auth-btn-spinner" /> : null}
                            {loading ? "Signing in..." : "Sign In"}
                        </button>
                    </form>

                    <p className="auth-footer-text">
                        Don&apos;t have an account?{" "}
                        <Link to="/register" className="auth-link">Create one</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
