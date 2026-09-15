const API_URL = 'http://localhost:5000/api';

const showLoginBtn = document.getElementById('show-login-btn');
const showRegisterBtn = document.getElementById('show-register-btn');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const loginMessage = document.getElementById('login-message');
const registerMessage = document.getElementById('register-message');

showLoginBtn.addEventListener('click', () => {
    loginForm.style.display = 'block';
    registerForm.style.display = 'none';
    showLoginBtn.className = 'btn btn-primary';
    showRegisterBtn.className = 'btn btn-outline';
});

showRegisterBtn.addEventListener('click', () => {
    registerForm.style.display = 'block';
    loginForm.style.display = 'none';
    showRegisterBtn.className = 'btn btn-primary';
    showLoginBtn.className = 'btn btn-outline';
});

registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    registerMessage.textContent = '';

    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;

    try {
        const response = await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password })
        });

        const data = await response.json();

        if (response.ok) {
            registerMessage.style.color = '#4CAF50';
            registerMessage.textContent = 'Account created successfully! Switching to login...';
            registerForm.reset();
            setTimeout(() => {
                showLoginBtn.click();
            }, 1500);
        } else {
            registerMessage.style.color = '#f44336';
            registerMessage.textContent = data.message || 'Registration failed.';
        }
    } catch (err) {
        registerMessage.style.color = '#f44336';
        registerMessage.textContent = 'Error connecting to server.';
    }
});

loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    loginMessage.textContent = '';

    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const response = await fetch(`${API_URL}/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });

        const data = await response.json();

        if (response.ok && data.token) {
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            loginMessage.style.color = '#4CAF50';
            loginMessage.textContent = 'Login successful! Redirecting to Admin Panel...';
            setTimeout(() => {
                window.location.href = 'admin.html';
            }, 1000);
        } else {
            loginMessage.style.color = '#f44336';
            loginMessage.textContent = data.message || 'Invalid email or password.';
        }
    } catch (err) {
        loginMessage.style.color = '#f44336';
        loginMessage.textContent = 'Error connecting to server.';
    }
});