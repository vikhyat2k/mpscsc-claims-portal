import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { apiRequest } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(() => localStorage.getItem('auth_token'));
    const [impersonator, setImpersonator] = useState(() => {
        try {
            const backup = localStorage.getItem('admin_impersonator_backup');
            return backup ? JSON.parse(backup).user : null;
        } catch {
            return null;
        }
    });
    const [loading, setLoading] = useState(true);

    const logout = useCallback(() => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        localStorage.removeItem('admin_impersonator_backup');
        setToken(null);
        setUser(null);
        setImpersonator(null);
    }, []);

    // Validate token on app load
    useEffect(() => {
        const validateToken = async () => {
            const storedToken = localStorage.getItem('auth_token');
            if (!storedToken) {
                setLoading(false);
                return;
            }
            try {
                const res = await api.get('/api/auth/me');
                if (res.ok) {
                    const userData = await res.json();
                    setUser(userData);
                    setToken(storedToken);
                    // Check if currently impersonating
                    try {
                        const backup = localStorage.getItem('admin_impersonator_backup');
                        if (backup) {
                            setImpersonator(JSON.parse(backup).user);
                        } else if (userData.is_impersonated && userData.impersonated_by) {
                            setImpersonator(userData.impersonated_by);
                        } else {
                            setImpersonator(null);
                        }
                    } catch {
                        // ignore parsing error
                    }
                } else {
                    logout();
                }
            } catch {
                logout();
            } finally {
                setLoading(false);
            }
        };
        validateToken();
    }, [logout]);

    // Listen for global auth expiry events from api.js
    useEffect(() => {
        const handler = () => logout();
        window.addEventListener('auth:expired', handler);
        return () => window.removeEventListener('auth:expired', handler);
    }, [logout]);

    const login = async (email, password) => {
        const res = await api.post('/api/auth/login', { email, password });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Login failed');
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));
        localStorage.removeItem('admin_impersonator_backup');
        setToken(data.token);
        setUser(data.user);
        setImpersonator(null);
        return data;
    };

    const register = async (formData) => {
        const res = await api.post('/api/auth/register', formData);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');
        return data;
    };

    // Impersonate a user as Admin
    const impersonateUser = async (targetUserId) => {
        const res = await api.post(`/api/admin/impersonate/${targetUserId}`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Failed to impersonate user');

        // Backup current admin credentials in localStorage
        const adminBackup = {
            token: token || localStorage.getItem('auth_token'),
            user: user || JSON.parse(localStorage.getItem('auth_user') || '{}')
        };
        localStorage.setItem('admin_impersonator_backup', JSON.stringify(adminBackup));

        // Set active credentials to impersonated user
        localStorage.setItem('auth_token', data.token);
        localStorage.setItem('auth_user', JSON.stringify(data.user));

        setToken(data.token);
        setUser(data.user);
        setImpersonator(data.impersonator || adminBackup.user);
        return data;
    };

    // Stop impersonation and restore Admin credentials
    const stopImpersonation = useCallback(() => {
        try {
            const backupStr = localStorage.getItem('admin_impersonator_backup');
            if (backupStr) {
                const backup = JSON.parse(backupStr);
                localStorage.setItem('auth_token', backup.token);
                localStorage.setItem('auth_user', JSON.stringify(backup.user));
                localStorage.removeItem('admin_impersonator_backup');
                setToken(backup.token);
                setUser(backup.user);
                setImpersonator(null);
                return true;
            }
        } catch (e) {
            console.error('Failed to restore admin session:', e);
        }
        // If backup missing, logout completely
        logout();
        return false;
    }, [logout]);

    const value = {
        user,
        token,
        loading,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        impersonator,
        isImpersonating: !!impersonator,
        login,
        logout,
        register,
        impersonateUser,
        stopImpersonation
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}

export default AuthContext;

