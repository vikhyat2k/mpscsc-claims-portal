import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, AlertCircle, CheckCircle, ArrowRight, ShieldCheck, Sparkles, Clock } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useLanguage } from "../contexts/LanguageContext";
import { getTranslations } from "../utils/translations";
import logoIco from "../assets/logo.ico";

export default function Login() {
    const { login } = useAuth();
    const { language } = useLanguage();
    const t = getTranslations(language);
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || "/";

    const [formData, setFormData] = useState({ email: "", password: "" });
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const successMsg = location.state?.success;
    const searchParams = new URLSearchParams(location.search);
    const isInactivityLogout = location.state?.reason === 'inactivity' || searchParams.get('reason') === 'inactivity';

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
            setError(err.message || "Login failed. Please verify your credentials and try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page enterprise-auth-page">
            {/* Ambient dynamic background lighting */}
            <div className="auth-ambient-glow auth-ambient-glow--top" aria-hidden="true" />
            <div className="auth-ambient-glow auth-ambient-glow--bottom" aria-hidden="true" />
            <div className="auth-ambient-glow auth-ambient-glow--center" aria-hidden="true" />
            <div className="auth-grid-overlay" aria-hidden="true" />

            <div className="auth-container enterprise-auth-container">
                {/* Enterprise Login Card */}
                <div className="auth-card enterprise-auth-card">
                    {/* Top Government & Organization Branding */}
                    <div className="auth-header-section">
                        <div className="auth-gov-pill">
                            <span className="gov-pill-indicator" />
                            <span>Govt. of Madhya Pradesh Enterprise</span>
                        </div>

                        <div className="auth-brand-showcase">
                            <div className="auth-logo-frame">
                                <img src={logoIco} alt="MPSCSC Official Logo" className="auth-enterprise-logo" />
                            </div>
                            <div className="auth-brand-text">
                                <h1 className="auth-org-title">
                                    Madhya Pradesh State Civil Supplies Corporation Ltd
                                </h1>
                                <div className="auth-portal-badge-wrap">
                                    <span className="auth-portal-title">Claims &amp; Bills Portal</span>
                                    <span className="auth-system-tag">Enterprise Cloud</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Glowing Section Separator */}
                    <div className="auth-divider-glow" />

                    {/* Welcome Title */}
                    <div className="auth-welcome-block">
                        <h2 className="auth-heading enterprise-heading">Welcome back</h2>
                        <p className="auth-subheading enterprise-subheading">
                            Sign in to access your claims &amp; reimbursement portal
                        </p>
                    </div>

                    {/* Inactivity Notice */}
                    {isInactivityLogout && (
                        <div className="auth-alert" style={{ backgroundColor: '#fffbeb', borderColor: '#fcd34d', color: '#92400e', marginBottom: '1.25rem' }}>
                            <Clock size={16} className="alert-icon" style={{ color: '#d97706', flexShrink: 0 }} />
                            <div className="alert-content">
                                <p className="alert-text" style={{ color: '#92400e', fontSize: '0.875rem', lineHeight: '1.4' }}>
                                    {t?.inactivity?.loggedOutNotice || "You have been logged out due to inactivity for security. Please sign in again."}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Success Notification */}
                    {successMsg && (
                        <div className="auth-alert auth-alert--success">
                            <CheckCircle size={16} className="alert-icon" />
                            <div className="alert-content">
                                <p className="alert-text">{successMsg}</p>
                            </div>
                        </div>
                    )}

                    {/* Error Notification */}
                    {error && (
                        <div className="auth-alert auth-alert--error">
                            <AlertCircle size={16} className="alert-icon" />
                            <div className="alert-content">
                                <p className="alert-text">{error}</p>
                            </div>
                        </div>
                    )}

                    {/* Login Form */}
                    <form onSubmit={handleSubmit} className="auth-form enterprise-form" noValidate>
                        {/* Email Address */}
                        <div className="auth-field">
                            <label htmlFor="login-email" className="auth-label">
                                Email Address <span className="auth-required-star">*</span>
                            </label>
                            <div className="auth-input-wrap">
                                <Mail size={16} className="auth-input-icon" />
                                <input
                                    id="login-email"
                                    type="email"
                                    name="email"
                                    autoComplete="email"
                                    value={formData.email}
                                    onChange={handleChange}
                                    placeholder="you@mpscsc.gov.in"
                                    className="auth-input auth-input--icon"
                                    disabled={loading}
                                    required
                                />
                            </div>
                        </div>

                        {/* Password */}
                        <div className="auth-field">
                            <div className="auth-label-row">
                                <label htmlFor="login-password" className="auth-label">
                                    Password <span className="auth-required-star">*</span>
                                </label>
                                <Link to="/forgot-password" className="auth-link-small enterprise-forgot-link">
                                    Forgot password?
                                </Link>
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
                                    placeholder="••••••••••••"
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

                        {/* Submit Button */}
                        <button
                            type="submit"
                            id="login-submit-btn"
                            className="auth-btn enterprise-auth-btn"
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <span className="auth-btn-spinner" />
                                    <span>Signing in...</span>
                                </>
                            ) : (
                                <>
                                    <span>Sign In</span>
                                    <ArrowRight size={16} className="auth-btn-arrow" />
                                </>
                            )}
                        </button>
                    </form>

                    {/* Account Registration Link */}
                    <div className="auth-footer-redirect">
                        <span className="auth-footer-subtext">Don&apos;t have an account?</span>
                        <Link to="/register" className="auth-link enterprise-create-link">
                            Create one
                        </Link>
                    </div>

                    {/* Dedicated High-Impact Creator Attribution Footer Area */}
                    <div className="creator-showcase-section">
                        {/* Thin Luminous Gradient Divider */}
                        <div className="creator-gradient-divider" aria-hidden="true">
                            <span className="divider-glow-core" />
                        </div>

                        {/* Dedicated Creator Card with Glowing Accent */}
                        <div className="creator-showcase-card" title="Architected & Developed by Vikhyat Hindoliya">
                            <div className="creator-badge-accent">
                                <Sparkles size={16} className="creator-sparkle-icon" />
                            </div>
                            <div className="creator-info-stack">
                                <div className="creator-eyebrow-row">
                                    <span className="creator-label-tag">Created By</span>
                                    <span className="creator-dot-separator">•</span>
                                    <span className="creator-role-tag">Lead System Architect</span>
                                </div>
                                <span className="creator-name-headline">Vikhyat Hindoliya</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Sub-Card Security & Compliance Guarantee */}
                <div className="auth-page-subfooter">
                    <div className="subfooter-security-tag">
                        <ShieldCheck size={13} className="security-icon" />
                        <span>256-Bit SSL Encrypted Enterprise System</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
