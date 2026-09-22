import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function ImpersonationBanner() {
    const { isImpersonating, user, impersonator, stopImpersonation } = useAuth();
    const navigate = useNavigate();

    if (!isImpersonating) return null;

    const handleExit = () => {
        stopImpersonation();
        navigate('/admin/users');
    };

    return (
        <div className="impersonation-banner no-print" role="alert">
            <div className="impersonation-banner-content">
                <div className="impersonation-banner-info">
                    <span className="impersonation-pulse-dot" />
                    <ShieldAlert size={18} className="impersonation-banner-icon" />
                    <span>
                        <strong>Admin Impersonation Mode:</strong> Logged in as{' '}
                        <strong className="impersonation-target-user">{user?.full_name || 'User'}</strong>
                        {' '}({user?.email})
                        {impersonator?.full_name && (
                            <span className="impersonation-admin-tag">
                                · by {impersonator.full_name}
                            </span>
                        )}
                    </span>
                </div>
                <button
                    type="button"
                    onClick={handleExit}
                    className="impersonation-exit-btn"
                    title="Exit impersonation and return to Admin Control"
                >
                    <ArrowLeft size={14} />
                    <span>Exit & Return to Admin</span>
                </button>
            </div>
        </div>
    );
}
