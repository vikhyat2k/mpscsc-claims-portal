// Centralized API helper - handles auth headers and relative URLs
// This replaces all hardcoded http://localhost:5000 references

function getToken() {
    return localStorage.getItem('auth_token');
}

/**
 * Drop-in replacement for fetch() that automatically injects the JWT auth header.
 * Usage: apiRequest('/api/employees', { method: 'POST', body: JSON.stringify(data) })
 */
export async function apiRequest(path, options = {}) {
    const token = getToken();
    const isFormData = options.body instanceof FormData;
    const headers = {
        ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        ...(options.headers || {})
    };

    const response = await fetch(path, {
        ...options,
        headers
    });

    // Handle session expiry globally
    if (response.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        window.dispatchEvent(new CustomEvent('auth:expired'));
    }

    return response;
}

const api = {
    get:    (path)        => apiRequest(path, { method: 'GET' }),
    post:   (path, body)  => apiRequest(path, { method: 'POST',  body: JSON.stringify(body) }),
    put:    (path, body)  => apiRequest(path, { method: 'PUT',   body: JSON.stringify(body) }),
    patch:  (path, body)  => apiRequest(path, { method: 'PATCH', body: JSON.stringify(body) }),
    delete: (path)        => apiRequest(path, { method: 'DELETE' }),
};

export default api;
