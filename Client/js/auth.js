// ==========================================
// NEXUS AI - Authentication Logic
// Tasks 4 (Auth), 5 (Profile), 9 (RBAC)
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

    // Support new IDs (emailLogin/passwordLogin) + old IDs (email/password)
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

            if (role === 'admin') {
                window.location.href = 'admin.html';
            } else if (role === 'employee' || perms.includes('requests:read_all') || perms.includes('inquiries:read')) {
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

    // Support new IDs + old IDs + legacy
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