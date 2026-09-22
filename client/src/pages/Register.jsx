import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Eye, EyeOff, Lock, Mail, User, Phone, AlertCircle, CheckCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import logoIco from "../assets/logo.ico";

function getPasswordStrength(pw) {
    if (!pw) return { level: 0, label: "", color: "" };
    let score = 0;
    if (pw.length >= 8) score++;
    if (pw.length >= 12) score++;
    if (/[A-Z]/.test(pw)) score++;
    if (/[0-9]/.test(pw)) score++;
    if (/[^A-Za-z0-9]/.test(pw)) score++;
    if (score <= 1) return { level: 1, label: "Weak", color: "#ef4444" };
    if (score <= 2) return { level: 2, label: "Fair", color: "#f59e0b" };
    if (score <= 3) return { level: 3, label: "Good", color: "#3b82f6" };
    return { level: 4, label: "Strong", color: "#22c55e" };
}

export default function Register() {
    const { register } = useAuth();
    const navigate = useNavigate();

    const [formData, setFormData] = useState({
        full_name: "", email: "", mobile_number: "", password: "", confirm_password: ""
    });
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [fieldErrors, setFieldErrors] = useState({});

    const strength = getPasswordStrength(formData.password);

    const validate = () => {
        const errs = {};
        if (!formData.full_name.trim()) errs.full_name = "Full name is required";
        if (!formData.email.trim()) errs.email = "Email is required";
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) errs.email = "Invalid email format";
        if (!formData.mobile_number.trim()) errs.mobile_number = "Mobile number is required";
        else if (!/^[6-9]\d{9}$/.test(formData.mobile_number)) errs.mobile_number = "Enter a valid 10-digit Indian mobile number";
        if (!formData.password) errs.password = "Password is required";
        else if (formData.password.length < 8) errs.password = "Password must be at least 8 characters";
        if (formData.password !== formData.confirm_password) errs.confirm_password = "Passwords do not match";
        return errs;
    };

    const handleChange = (e) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
        setFieldErrors(prev => ({ ...prev, [e.target.name]: "" }));
        setError("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const errs = validate();
        if (Object.keys(errs).length) { setFieldErrors(errs); return; }
        setLoading(true);
        setError("");
        try {
            await register(formData);
            navigate("/login", { state: { success: "Account created successfully! Please sign in." } });
        } catch (err) {
            setError(err.message || "Registration failed. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="auth-page">
            <div className="auth-bg-pattern" aria-hidden="true" />
            <div className="auth-container auth-container--wide">
                <div className="auth-card">
                    <div className="auth-logo-wrap">
                        <img src={logoIco} alt="MPSCSC" className="auth-logo" />
                        <div>
                            <h1 className="auth-brand-title">MPSCSC</h1>
                            <p className="auth-brand-sub">Claims Portal</p>
                        </div>
                    </div>

                    <h2 className="auth-heading">Create your account</h2>
                    <p className="auth-subheading">Fill in the details below to get started</p>

                    {error && (
                        <div className="auth-alert auth-alert--error">
                            <AlertCircle size={16} /><span>{error}</span>
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="auth-form" noValidate>
                        <div className="auth-field">
                            <label htmlFor="reg-name" className="auth-label">Full Name</label>
                            <div className="auth-input-wrap">
                                <User size={16} className="auth-input-icon" />
                                <input id="reg-name" type="text" name="full_name" autoComplete="name"
                                    value={formData.full_name} onChange={handleChange}
                                    placeholder="Your full name" disabled={loading}
                                    className={`auth-input auth-input--icon ${fieldErrors.full_name ? "auth-input--error" : ""}`} />
                            </div>
                            {fieldErrors.full_name && <p className="auth-field-error">{fieldErrors.full_name}</p>}
                        </div>

                        <div className="auth-field">
                            <label htmlFor="reg-email" className="auth-label">Email Address</label>
                            <div className="auth-input-wrap">
                                <Mail size={16} className="auth-input-icon" />
                                <input id="reg-email" type="email" name="email" autoComplete="email"
                                    value={formData.email} onChange={handleChange}
                                    placeholder="you@example.com" disabled={loading}
                                    className={`auth-input auth-input--icon ${fieldErrors.email ? "auth-input--error" : ""}`} />
                            </div>
                            {fieldErrors.email && <p className="auth-field-error">{fieldErrors.email}</p>}
                        </div>

                        <div className="auth-field">
                            <label htmlFor="reg-mobile" className="auth-label">Mobile Number</label>
                            <div className="auth-input-wrap">
                                <Phone size={16} className="auth-input-icon" />
                                <input id="reg-mobile" type="tel" name="mobile_number" autoComplete="tel"
                                    value={formData.mobile_number} onChange={handleChange}
                                    placeholder="10-digit mobile number" maxLength={10} disabled={loading}
                                    className={`auth-input auth-input--icon ${fieldErrors.mobile_number ? "auth-input--error" : ""}`} />
                            </div>
                            {fieldErrors.mobile_number && <p className="auth-field-error">{fieldErrors.mobile_number}</p>}
                        </div>

                        <div className="auth-field">
                            <label htmlFor="reg-password" className="auth-label">Password</label>
                            <div className="auth-input-wrap">
                                <Lock size={16} className="auth-input-icon" />
                                <input id="reg-password" type={showPassword ? "text" : "password"}
                                    name="password" autoComplete="new-password"
                                    value={formData.password} onChange={handleChange}
                                    placeholder="Min 8 characters" disabled={loading}
                                    className={`auth-input auth-input--icon auth-input--pr ${fieldErrors.password ? "auth-input--error" : ""}`} />
                                <button type="button" className="auth-eye-btn" onClick={() => setShowPassword(v => !v)} aria-label="Toggle password">
                                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {formData.password && (
                                <div className="password-strength">
                                    <div className="password-strength-bar">
                                        {[1,2,3,4].map(i => (
                                            <div key={i} className="password-strength-segment"
                                                style={{ background: i <= strength.level ? strength.color : undefined }} />
                                        ))}
                                    </div>
                                    <span style={{ color: strength.color }}>{strength.label}</span>
                                </div>
                            )}
                            {fieldErrors.password && <p className="auth-field-error">{fieldErrors.password}</p>}
                        </div>

                        <div className="auth-field">
                            <label htmlFor="reg-confirm" className="auth-label">Confirm Password</label>
                            <div className="auth-input-wrap">
                                <Lock size={16} className="auth-input-icon" />
                                <input id="reg-confirm" type={showConfirm ? "text" : "password"}
                                    name="confirm_password" autoComplete="new-password"
                                    value={formData.confirm_password} onChange={handleChange}
                                    placeholder="Repeat your password" disabled={loading}
                                    className={`auth-input auth-input--icon auth-input--pr ${fieldErrors.confirm_password ? "auth-input--error" : ""}`} />
                                <button type="button" className="auth-eye-btn" onClick={() => setShowConfirm(v => !v)} aria-label="Toggle confirm password">
                                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                                </button>
                            </div>
                            {fieldErrors.confirm_password && <p className="auth-field-error">{fieldErrors.confirm_password}</p>}
                        </div>

                        <button type="submit" id="register-submit-btn" className="auth-btn" disabled={loading}>
                            {loading ? <span className="auth-btn-spinner" /> : null}
                            {loading ? "Creating account..." : "Create Account"}
                        </button>
                    </form>

                    <p className="auth-footer-text">
                        Already have an account?{" "}
                        <Link to="/login" className="auth-link">Sign in</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}
