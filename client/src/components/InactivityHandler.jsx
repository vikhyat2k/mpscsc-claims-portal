import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock, ShieldAlert, LogOut, CheckCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useLanguage } from '../contexts/LanguageContext';
import { getTranslations } from '../utils/translations';

// Inactivity configuration (Default: 15 minutes timeout, 60 seconds warning)
const INACTIVITY_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const WARNING_DURATION_SEC = 60; // 60 seconds countdown
const WARNING_THRESHOLD_MS = INACTIVITY_TIMEOUT_MS - (WARNING_DURATION_SEC * 1000);
const THROTTLE_INTERVAL_MS = 3000; // Throttle activity updates to once every 3s
const STORAGE_KEY = 'mpscsc_last_active';

export default function InactivityHandler() {
    const { user, logout } = useAuth();
    const { language } = useLanguage();
    const t = getTranslations(language);
    const navigate = useNavigate();

    const [showWarning, setShowWarning] = useState(false);
    const [secondsRemaining, setSecondsRemaining] = useState(WARNING_DURATION_SEC);
    const lastReportedRef = useRef(Date.now());

    // Reset activity timestamp in localStorage and in memory
    const recordActivity = useCallback(() => {
        const now = Date.now();
        if (now - lastReportedRef.current >= THROTTLE_INTERVAL_MS) {
            lastReportedRef.current = now;
            try {
                localStorage.setItem(STORAGE_KEY, String(now));
            } catch {
                // Ignore storage access errors
            }
        }
    }, []);

    // Explicitly extend session by user interaction in modal
    const handleStayLoggedIn = useCallback(() => {
        const now = Date.now();
        lastReportedRef.current = now;
        try {
            localStorage.setItem(STORAGE_KEY, String(now));
        } catch {
            // Ignore storage access errors
        }
        setShowWarning(false);
        setSecondsRemaining(WARNING_DURATION_SEC);
    }, []);

    // Perform inactivity logout
    const handleInactivityLogout = useCallback(() => {
        setShowWarning(false);
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch {
            // Ignore storage access errors
        }
        logout();
        navigate('/login?reason=inactivity', {
            replace: true,
            state: { reason: 'inactivity' }
        });
    }, [logout, navigate]);

    // Track user input events
    useEffect(() => {
        if (!user) return;

        // Initialize last active timestamp on login/mount
        const initialNow = Date.now();
        lastReportedRef.current = initialNow;
        try {
            if (!localStorage.getItem(STORAGE_KEY)) {
                localStorage.setItem(STORAGE_KEY, String(initialNow));
            }
        } catch {
            // Ignore storage access errors
        }

        const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
        const onActivity = () => {
            // If warning modal is showing, require explicit click on "Stay Logged In"
            if (!showWarning) {
                recordActivity();
            }
        };

        events.forEach(evt => window.addEventListener(evt, onActivity, { passive: true }));

        // Cross-tab synchronization via storage events
        const onStorageChange = (e) => {
            if (e.key === STORAGE_KEY && e.newValue) {
                const updatedTime = Number(e.newValue);
                const elapsed = Date.now() - updatedTime;
                if (elapsed < WARNING_THRESHOLD_MS) {
                    setShowWarning(false);
                    setSecondsRemaining(WARNING_DURATION_SEC);
                }
            }
        };
        window.addEventListener('storage', onStorageChange);

        return () => {
            events.forEach(evt => window.removeEventListener(evt, onActivity));
            window.removeEventListener('storage', onStorageChange);
        };
    }, [user, showWarning, recordActivity]);

    // Periodic timer checking for inactivity and ticking warning countdown
    useEffect(() => {
        if (!user) {
            setShowWarning(false);
            return;
        }

        const interval = setInterval(() => {
            let lastActive = lastReportedRef.current;
            try {
                const stored = localStorage.getItem(STORAGE_KEY);
                if (stored) {
                    lastActive = Number(stored);
                }
            } catch {
                // Ignore storage access errors
            }

            const now = Date.now();
            const elapsed = now - lastActive;

            if (elapsed >= INACTIVITY_TIMEOUT_MS) {
                // Inactivity limit reached - log out immediately
                handleInactivityLogout();
            } else if (elapsed >= WARNING_THRESHOLD_MS) {
                // Within warning window
                const timeLeft = Math.max(1, Math.ceil((INACTIVITY_TIMEOUT_MS - elapsed) / 1000));
                setShowWarning(true);
                setSecondsRemaining(timeLeft);
            } else {
                // User was active in this or another tab
                if (showWarning) {
                    setShowWarning(false);
                    setSecondsRemaining(WARNING_DURATION_SEC);
                }
            }
        }, 1000);

        return () => clearInterval(interval);
    }, [user, showWarning, handleInactivityLogout]);

    if (!user || !showWarning) {
        return null;
    }

    const tInactivity = t?.inactivity || {
        modalTitle: "Session Expiring Soon",
        warningText: "You have been inactive for a while. For your security, your session will expire in",
        secondsText: "seconds",
        stayLoggedIn: "Stay Logged In",
        logOutNow: "Log Out Now"
    };

    return (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="inactivity-title"
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.72)',
                backdropFilter: 'blur(6px)',
                WebkitBackdropFilter: 'blur(6px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 99999,
                padding: '1.25rem'
            }}
        >
            <div
                style={{
                    backgroundColor: '#ffffff',
                    borderRadius: '16px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(226, 232, 240, 0.8)',
                    maxWidth: '480px',
                    width: '100%',
                    padding: '2rem',
                    textAlign: 'center',
                    position: 'relative',
                    overflow: 'hidden'
                }}
            >
                {/* Visual Top Accent Bar */}
                <div
                    style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '5px',
                        background: 'linear-gradient(90deg, #f59e0b, #ef4444)'
                    }}
                />

                {/* Animated Clock / Security Icon */}
                <div
                    style={{
                        width: '64px',
                        height: '64px',
                        borderRadius: '50%',
                        backgroundColor: '#fef3c7',
                        color: '#d97706',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 1.25rem',
                        boxShadow: '0 0 0 8px #fef9c3'
                    }}
                >
                    <Clock size={32} strokeWidth={2.2} />
                </div>

                {/* Modal Title */}
                <h3
                    id="inactivity-title"
                    style={{
                        fontSize: '1.35rem',
                        fontWeight: '700',
                        color: '#0f172a',
                        marginBottom: '0.65rem'
                    }}
                >
                    {tInactivity.modalTitle}
                </h3>

                {/* Explanatory Text */}
                <p
                    style={{
                        fontSize: '0.95rem',
                        color: '#475569',
                        lineHeight: 1.55,
                        marginBottom: '1.5rem'
                    }}
                >
                    {tInactivity.warningText}{' '}
                    <strong style={{ color: '#dc2626', fontSize: '1.1rem' }}>
                        {secondsRemaining} {tInactivity.secondsText}
                    </strong>
                    .
                </p>

                {/* Prominent Visual Countdown Circle / Pill */}
                <div
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        backgroundColor: '#fff1f2',
                        border: '1px solid #fecdd3',
                        color: '#be123c',
                        padding: '0.45rem 1rem',
                        borderRadius: '9999px',
                        fontWeight: '600',
                        fontSize: '0.9rem',
                        marginBottom: '1.75rem'
                    }}
                >
                    <ShieldAlert size={16} />
                    <span>
                        00:{secondsRemaining < 10 ? `0${secondsRemaining}` : secondsRemaining}
                    </span>
                </div>

                {/* Action Buttons */}
                <div
                    style={{
                        display: 'flex',
                        gap: '0.75rem',
                        justifyContent: 'center',
                        flexWrap: 'wrap'
                    }}
                >
                    <button
                        type="button"
                        onClick={handleStayLoggedIn}
                        style={{
                            flex: '1 1 180px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem 1.25rem',
                            backgroundColor: '#2563eb',
                            color: '#ffffff',
                            border: 'none',
                            borderRadius: '8px',
                            fontWeight: '600',
                            fontSize: '0.95rem',
                            cursor: 'pointer',
                            boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.25)',
                            transition: 'background-color 0.15s ease'
                        }}
                    >
                        <CheckCircle2 size={18} />
                        <span>{tInactivity.stayLoggedIn}</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleInactivityLogout}
                        style={{
                            flex: '1 1 140px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '0.5rem',
                            padding: '0.75rem 1.25rem',
                            backgroundColor: '#ffffff',
                            color: '#475569',
                            border: '1px solid #cbd5e1',
                            borderRadius: '8px',
                            fontWeight: '500',
                            fontSize: '0.95rem',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                        }}
                    >
                        <LogOut size={16} />
                        <span>{tInactivity.logOutNow}</span>
                    </button>
                </div>
            </div>
        </div>
    );
}
