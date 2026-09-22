import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import api, { apiRequest } from '../utils/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(() => localStorage.getItem('auth_token'));
    const [loading, setLoading] = useState(true);

    const logout = useCallback(() => {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        setToken(null);
        setUser(null);
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
        setToken(data.token);
        setUser(data.user);
        return data;
    };

    const register = async (formData) => {
        const res = await api.post('/api/auth/register', formData);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Registration failed');
        return data;
    };

    const value = {
        user,
        token,
        loading,
        isAuthenticated: !!user,
        isAdmin: user?.role === 'admin',
        login,
        logout,
        register
    };

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
    return ctx;
}

export default AuthContext;
