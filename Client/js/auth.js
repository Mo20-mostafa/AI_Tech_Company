// Base API endpoint configuration
const API_URL = 'http://localhost:5000/api';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Attach listener for Login Form submission
    const loginForm = document.getElementById('loginForm') || document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }

    // 2. Attach listener for Registration Form submission
    const registerForm = document.getElementById('registerForm') || document.getElementById('register-form');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegister);
    }

    // 3. Attach listener for Logout action button
    const logoutBtn = document.getElementById('logoutBtn') || document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', handleLogout);
    }
});

/**
 * Handles user authentication/login request and stores access token.
 */
async function handleLogin(e) {
    e.preventDefault();

    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
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

        if (response.ok && data.token) {
            // Save authentication details in LocalStorage
            localStorage.setItem('token', data.token);
            localStorage.setItem('userRole', data.role || 'user');
            if (data.username) localStorage.setItem('username', data.username);

            // Redirect based on user permissions role
            if (data.role === 'admin') {
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

/**
 * Handles new account registration request.
 */
async function handleRegister(e) {
    e.preventDefault();

    const usernameInput = document.getElementById('username') || document.getElementById('name');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorContainer = document.getElementById('auth-error') || document.getElementById('registerError');

    const username = usernameInput?.value.trim();
    const email = emailInput?.value.trim();
    const password = passwordInput?.value;

    if (!username || !email || !password) {
        showAuthError(errorContainer, 'Please provide name, email, and password.');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, email, password })
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

/**
 * Clears active token and logs user out.
 */
function handleLogout() {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('username');
    window.location.href = 'login.html';
}

/**
 * Displays error status message on UI.
 */
function showAuthError(element, message) {
    if (element) {
        element.style.color = 'red';
        element.textContent = message;
    } else {
        alert(message);
    }
}