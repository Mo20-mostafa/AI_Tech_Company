// ==========================================
// NEXUS AI - Authentication Logic
// Tasks 4 (Auth), 5 (Profile), 9 (RBAC), 11 (Shared Helpers)
// ==========================================

const API_URL = 'http://localhost:5000/api';

document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm') || document.getElementById('login-form');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);

    const registerForm = document.getElementById('registerForm') || document.getElementById('register-form');
    if (registerForm) registerForm.addEventListener('submit', handleRegister);

    const logoutBtn = document.getElementById('logoutBtn') || document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
});

// ==========================================
// LOGIN
// ==========================================

async function handleLogin(e) {
    e.preventDefault();

    const emailInput = document.getElementById('emailLogin') || document.getElementById('email');
    const passwordInput = document.getElementById('passwordLogin') || document.getElementById('password');
    const errorContainer = document.getElementById('auth-error') || document.getElementById('loginError');

    const email = emailInput?.value.trim();
    const password = passwordInput?.value;

    if (!email || !password) {
        showAuthError(errorContainer, 'Please fill in all fields.');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok && data.token && data.user) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('permissions', JSON.stringify(data.user.permissions || []));
            localStorage.setItem('userRole', data.user.role || 'customer');
            localStorage.setItem('username', data.user.name || '');

            const role = data.user.role;
            const perms = data.user.permissions || [];

            // Task 11 — route users based on role + permissions
            if (role === 'admin' || role === 'employee') {
                window.location.href = 'admin.html';
            } else if (role === 'team_member') {
                window.location.href = 'admin.html';
            } else if (perms.includes('requests:read_all') || perms.includes('inquiries:read')) {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'dashboard.html';
            }
        } else {
            showAuthError(errorContainer, data.message || data.error || 'Invalid email or password.');
        }
    } catch (error) {
        console.error('Login error:', error);
        showAuthError(errorContainer, 'Server connection error. Ensure backend is running.');
    }
}

// ==========================================
// REGISTER
// ==========================================

async function handleRegister(e) {
    e.preventDefault();

    const nameInput = document.getElementById('nameRegister')
        || document.getElementById('name')
        || document.getElementById('username');
    const emailInput = document.getElementById('emailRegister')
        || document.getElementById('email-reg')
        || document.getElementById('email');
    const passwordInput = document.getElementById('passwordRegister')
        || document.getElementById('password-reg')
        || document.getElementById('password');
    const errorContainer = document.getElementById('auth-error') || document.getElementById('registerError');

    const name = nameInput?.value.trim();
    const email = emailInput?.value.trim();
    const password = passwordInput?.value;

    if (!name || !email || !password) {
        showAuthError(errorContainer, 'Please provide name, email, and password.');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            alert('Registration successful! Please log in.');
            window.location.href = 'login.html';
        } else {
            showAuthError(errorContainer, data.message || data.error || 'Registration failed.');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showAuthError(errorContainer, 'Server connection error. Ensure backend is running.');
    }
}

// ==========================================
// LOGOUT
// ==========================================

function handleLogout() {
    ['token', 'user', 'permissions', 'userRole', 'username'].forEach(k => localStorage.removeItem(k));
    window.location.href = 'login.html';
}

// ==========================================
// ERROR DISPLAY
// ==========================================

function showAuthError(element, message) {
    if (element) {
        element.style.color = 'red';
        element.textContent = message;
    } else {
        alert(message);
    }
}

// ==========================================
// TASK 11 — SHARED HELPERS (used by all pages)
// ==========================================

/**
 * Get current auth token from storage.
 */
function getToken() {
    return localStorage.getItem('token');
}

/**
 * Get current user object from storage.
 */
function getUser() {
    try {
        return JSON.parse(localStorage.getItem('user') || 'null');
    } catch (e) {
        return null;
    }
}

/**
 * Alias for getUser() — backward compatible with old admin.js/main.js
 */
function getCurrentUser() {
    return getUser() || {};
}

/**
 * Get current user's permissions array.
 */
function getPermissions() {
    try {
        return JSON.parse(localStorage.getItem('permissions') || '[]');
    } catch (e) {
        return [];
    }
}

/**
 * Check if current user has a specific permission.
 * Admins always return true (bypass).
 */
function can(permission) {
    const user = getUser();
    if (!user) return false;
    if (user.role === 'admin') return true;
    return getPermissions().includes(permission);
}

/**
 * Check if current user has ANY of the given permissions.
 */
function canAny(permissions = []) {
    const user = getUser();
    if (!user) return false;
    if (user.role === 'admin') return true;
    return permissions.some(p => can(p));
}

/**
 * Ensure the current user is authenticated.
 * Redirects to login.html if no valid token/user.
 */
function requireAuth() {
    const token = getToken();
    const user = getUser();
    if (!token || !user) {
        window.location.href = 'login.html';
        return null;
    }
    return user;
}

/**
 * Ensure the current user has a specific permission.
 */
function requirePermission(permission) {
    const user = requireAuth();
    if (!user) return null;
    if (!can(permission)) {
        alert('Access denied. You do not have permission to view this page.');
        window.location.href = 'dashboard.html';
        return null;
    }
    return user;
}

/**
 * Wrapper around fetch that automatically adds the Authorization header.
 * Also parses JSON and handles common errors.
 */
async function apiFetch(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...(options.headers || {})
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, { ...options, headers });
    let data = null;
    try {
        data = await response.json();
    } catch (e) {
        data = { success: false, message: 'Invalid server response.' };
    }

    // Auto-logout on 401 for expired tokens
    if (response.status === 401) {
        handleLogout();
        return { success: false, message: 'Session expired. Please log in again.' };
    }

    return { ...data, _status: response.status, _ok: response.ok };
}

/**
 * Apply permission-based UI visibility across all pages.
 * Supports:
 *   [data-permission="x"]           → show if user has x
 *   [data-permission-any="x,y,z"]   → show if user has ANY of them
 *   [data-role="admin"]             → show if user role matches
 *   [data-permission="admin-panel"] → special: show if user has admin-side access
 *   [data-permission="dashboard"]   → special: show if user is a customer
 *   [data-permission="login-link"]  → show only if NOT logged in
 *   [data-permission="logout-link"] → show only if logged in
 *   [data-permission="projects-link"] → show if user has project access
 */
function applyPermissionUI() {
    const user = getUser();
    const token = getToken();
    const isLoggedIn = !!token && !!user;

    // 1. Admin Panel link — visible for admin + admin-side employees/team_members
    document.querySelectorAll('[data-permission="admin-panel"]').forEach(el => {
        const canSee = isLoggedIn && (
            user.role === 'admin' ||
            user.role === 'employee' ||
            user.role === 'team_member' ||
            canAny(['requests:read_all', 'inquiries:read', 'services:create', 'services:update', 'files:read_all'])
        );
        el.style.display = canSee ? '' : 'none';
    });

    // 2. Dashboard link — visible for logged-in customers only
    document.querySelectorAll('[data-permission="dashboard"]').forEach(el => {
        const canSee = isLoggedIn && (user.role === 'customer' || user.role === 'user');
        el.style.display = canSee ? '' : 'none';
    });

    // 3. Login link — hidden for logged-in users
    document.querySelectorAll('[data-permission="login-link"]').forEach(el => {
        el.style.display = isLoggedIn ? 'none' : '';
    });

    // 4. Logout link — visible only for logged-in users
    document.querySelectorAll('[data-permission="logout-link"]').forEach(el => {
        el.style.display = isLoggedIn ? '' : 'none';
    });

    // 5. Task 11 — Projects link (any authenticated user with project access)
    document.querySelectorAll('[data-permission="projects-link"]').forEach(el => {
        const canSee = isLoggedIn && (
            user.role === 'admin' ||
            user.role === 'team_member' ||
            user.role === 'employee' ||
            user.role === 'customer' ||
            can('projects:read')
        );
        el.style.display = canSee ? '' : 'none';
    });

    // 6. Generic permission check (any element with data-permission not matching above)
    const handledSpecial = ['admin-panel', 'dashboard', 'login-link', 'logout-link', 'projects-link'];
    document.querySelectorAll('[data-permission]').forEach(el => {
        const perm = el.getAttribute('data-permission');
        if (handledSpecial.includes(perm)) return;
        el.style.display = can(perm) ? '' : 'none';
    });

    // 7. data-permission-any
    document.querySelectorAll('[data-permission-any]').forEach(el => {
        const list = (el.getAttribute('data-permission-any') || '').split(',').map(s => s.trim());
        el.style.display = canAny(list) ? '' : 'none';
    });

    // 8. data-role
    document.querySelectorAll('[data-role]').forEach(el => {
        const requiredRole = el.getAttribute('data-role');
        el.style.display = (user && user.role === requiredRole) ? '' : 'none';
    });
}

// ==========================================
// SHARED UTILITIES (used by main.js, admin.js, dashboard.js, projects.js)
// ==========================================

/**
 * Sanitize HTML strings to prevent XSS.
 */
function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
    }[tag] || tag));
}

/**
 * Escape single/double quotes for inline JS strings.
 */
function escapeQuotes(str) {
    if (!str) return '';
    return String(str).replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

/**
 * Debounce function for performance.
 */
function debounce(func, delay = 300) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}