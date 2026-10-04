/* ==========================================
   NEXUS AI - Customer Dashboard Logic
   Tasks 5 (Profile), 7 (Customer Requests),
   9 (RBAC), 10 (File Management)
   ========================================== */

const API_URL = 'http://localhost:5000/api';

document.addEventListener('DOMContentLoaded', () => {
    // 0. Guard access + apply permission-based UI (Task 9)
    if (!verifyUserAuth()) return;
    applyPermissionUI();

    // 1-4. Load data & attach listeners
    loadUserProfile();
    loadUserRequests();
    setupRequestFormListener();
    setupProfileFormListener();

    // 5. Task 10 — file upload + list
    loadUserFiles();
    setupFileUploadListener();

    // 6. Logout button handler
    const logoutBtn = document.getElementById('logoutBtn') || document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
});

// ==========================================
// TASK 9: PERMISSION HELPERS
// ==========================================

function getCurrentUser() {
    try { return JSON.parse(localStorage.getItem('user') || '{}'); }
    catch { return {}; }
}

function can(permission) {
    const user = getCurrentUser();
    if (user.role === 'admin') return true;
    return Array.isArray(user.permissions) && user.permissions.includes(permission);
}

function applyPermissionUI() {
    const requestForm = document.getElementById('createRequestForm') || document.getElementById('requestForm');
    if (requestForm && !can('requests:create_own')) {
        const wrapper = requestForm.closest('.dash-card') || requestForm.parentElement;
        if (wrapper) wrapper.style.display = 'none';
    }

    const requestsContainer = document.getElementById('user-requests-list')
        || document.getElementById('userRequestsList')
        || document.getElementById('myRequestsContainer');
    if (requestsContainer && !can('requests:read_own')) {
        const wrapper = requestsContainer.closest('.dash-card') || requestsContainer.parentElement;
        if (wrapper) wrapper.style.display = 'none';
    }
}

// ==========================================
// AUTH GUARD
// ==========================================

function verifyUserAuth() {
    const token = localStorage.getItem('token');
    const user = getCurrentUser();
    if (!token || !user.email) {
        alert('Authentication required. Please log in first.');
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

/** File upload uses multipart/form-data — must NOT set Content-Type manually */
function getUploadHeaders() {
    const token = localStorage.getItem('token');
    return { 'Authorization': `Bearer ${token}` };
}

function handleLogout() {
    ['token', 'user', 'permissions', 'userRole', 'username'].forEach(k => localStorage.removeItem(k));
    window.location.href = 'login.html';
}

// ==========================================
// TASK 5: USER PROFILE
// ==========================================

async function loadUserProfile() {
    const nameInput = document.getElementById('profileName') || document.getElementById('name');
    const emailInput = document.getElementById('profileEmail') || document.getElementById('email');
    if (!nameInput && !emailInput) return;

    try {
        const response = await fetch(`${API_URL}/user/profile`, { headers: getAuthHeaders() });
        const data = await response.json();

        if (response.ok && data.success && data.user) {
            if (nameInput) nameInput.value = data.user.name || '';
            if (emailInput) emailInput.value = data.user.email || '';
            localStorage.setItem('user', JSON.stringify(data.user));
            localStorage.setItem('permissions', JSON.stringify(data.user.permissions || []));
        } else {
            console.warn('Failed to load profile:', data.message);
        }
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

function setupProfileFormListener() {
    const profileForm = document.getElementById('profileForm') || document.getElementById('updateProfileForm');
    if (!profileForm) return;

    profileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const nameInput = document.getElementById('profileName') || document.getElementById('name');
        const emailInput = document.getElementById('profileEmail') || document.getElementById('email');
        const passwordInput = document.getElementById('profilePassword') || document.getElementById('newPassword');

        const payload = {
            name: nameInput?.value.trim(),
            email: emailInput?.value.trim()
        };
        if (passwordInput?.value?.trim()) payload.password = passwordInput.value.trim();

        if (!payload.name || !payload.email) { alert('Name and email are required.'); return; }

        try {
            const response = await fetch(`${API_URL}/user/profile`, {
                method: 'PUT',
                headers: getAuthHeaders(),
                body: JSON.stringify(payload)
            });
            const data = await response.json();

            if (response.ok && data.success) {
                alert('Profile updated successfully!');
                if (data.user) {
                    localStorage.setItem('user', JSON.stringify(data.user));
                    localStorage.setItem('permissions', JSON.stringify(data.user.permissions || []));
                }
                if (passwordInput) passwordInput.value = '';
            } else {
                alert('Failed to update profile: ' + (data.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error updating profile:', error);
            alert('Server error while updating profile.');
        }
    });
}

// ==========================================
// TASK 7: CUSTOMER REQUESTS
// ==========================================

function setupRequestFormListener() {
    const requestForm = document.getElementById('createRequestForm') || document.getElementById('requestForm');
    if (!requestForm) return;

    requestForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        if (!can('requests:create_own')) { alert('You do not have permission to submit requests.'); return; }

        const titleInput = document.getElementById('reqTitle') || document.getElementById('requestTitle');
        const descInput = document.getElementById('reqDescription') || document.getElementById('requestDescription');
        const title = titleInput?.value.trim();
        const description = descInput?.value.trim();

        if (!title || !description) { alert('Please fill in both the title and description fields.'); return; }

        try {
            const response = await fetch(`${API_URL}/requests`, {
                method: 'POST',
                headers: getAuthHeaders(),
                body: JSON.stringify({ title, description })
            });
            const result = await response.json();

            if (response.ok && result.success) {
                alert(result.message || 'Request submitted successfully!');
                requestForm.reset();
                loadUserRequests();
            } else {
                alert(result.message || 'Failed to submit request.');
            }
        } catch (error) {
            console.error('Error submitting request:', error);
            alert('Server connection error while submitting request.');
        }
    });
}

async function loadUserRequests() {
    const requestsContainer = document.getElementById('user-requests-list')
        || document.getElementById('userRequestsList')
        || document.getElementById('myRequestsContainer');
    if (!requestsContainer) return;

    try {
        const response = await fetch(`${API_URL}/user/requests`, { headers: getAuthHeaders() });
        const result = await response.json();
        const requests = result.data || (Array.isArray(result) ? result : []);

        // Cache for client-side filtering (used in dashboard.html inline filter)
        window.__cachedRequests = requests;

        if (requests.length === 0) {
            requestsContainer.innerHTML = '<p style="text-align: center; color: #666;">No service requests submitted yet.</p>';
            return;
        }

        // If a client-side filter UI exists, let it handle rendering
        const filterUI = document.getElementById('userRequestSearch') || document.getElementById('userRequestStatusFilter');
        if (filterUI && typeof window.applyClientFilters === 'function') {
            window.applyClientFilters();
            return;
        }

        requestsContainer.innerHTML = renderRequests(requests);
    } catch (error) {
        console.error('Error fetching user requests:', error);
        requestsContainer.innerHTML = '<p style="text-align: center; color: red;">Failed to load requests. Please try again later.</p>';
    }
}

/** Shared renderer for request cards (used by fallback + filter) */
function renderRequests(requests) {
    return requests.map(req => {
        let badgeColor = '#ffc107';
        if (req.status === 'In Progress') badgeColor = '#17a2b8';
        if (req.status === 'Completed') badgeColor = '#28a745';
        if (req.status === 'Rejected') badgeColor = '#dc3545';

        return `
            <div class="request-card card" style="margin-bottom: 15px; padding: 15px; border: 1px solid #e0e0e0; border-radius: 6px; background-color: #fff;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f0f0f0; padding-bottom: 8px; margin-bottom: 10px;">
                    <h3 style="margin: 0; font-size: 1.1rem; color: #333;">${escapeHTML(req.title)}</h3>
                    <span style="background-color: ${badgeColor}; color: #fff; padding: 4px 10px; border-radius: 12px; font-size: 0.85rem; font-weight: bold;">
                        ${escapeHTML(req.status)}
                    </span>
                </div>
                <p style="margin: 10px 0; color: #444; line-height: 1.5;">${escapeHTML(req.description)}</p>
                <small style="color: #888;">Submitted on: ${new Date(req.createdAt || Date.now()).toLocaleDateString()}</small>
            </div>
        `;
    }).join('');
}

// ==========================================
// TASK 10: FILE & DOCUMENT MANAGEMENT
// ==========================================

/** Load and render the current user's uploaded files */
async function loadUserFiles() {
    const container = document.getElementById('userFilesList');
    if (!container) return;

    try {
        const response = await fetch(`${API_URL}/user/files`, { headers: getAuthHeaders() });
        const result = await response.json();

        if (!response.ok || !result.success) {
            container.innerHTML = `<p style="text-align:center; color:#EF4444;">${escapeHTML(result.message || 'Failed to load files.')}</p>`;
            return;
        }

        const files = result.data || [];
        if (files.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#6B7280;">No files uploaded yet.</p>';
            return;
        }

        const fullURL = (u) => `http://localhost:5000${u}`;

        container.innerHTML = files.map(f => `
            <div class="file-item">
                <div class="meta">
                    <h4>${escapeHTML(f.originalName)}</h4>
                    <p>${escapeHTML(f.mimeType)} • ${escapeHTML(f.sizeHuman)} • ${new Date(f.uploadedAt).toLocaleString()}</p>
                </div>
                <div class="actions">
                    <a class="view-link" href="${fullURL(f.url)}" target="_blank">View</a>
                    <button type="button" class="delete-file" onclick="deleteUserFile('${f.id}', '${escapeQuotes(f.originalName)}')">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading files:', error);
        container.innerHTML = '<p style="text-align:center; color:#EF4444;">Failed to load files.</p>';
    }
}

/** Attach upload form listener (multipart/form-data) */
function setupFileUploadListener() {
    const form = document.getElementById('fileUploadForm');
    const input = document.getElementById('fileInput');
    const btn = document.getElementById('uploadFileBtn');
    const msg = document.getElementById('fileUploadMsg');
    if (!form || !input) return;

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (!input.files || input.files.length === 0) {
            if (msg) { msg.style.color = '#EF4444'; msg.textContent = 'Please choose a file first.'; }
            return;
        }

        const file = input.files[0];

        // Client-side quick check (server also validates)
        const MAX_MB = 10;
        if (file.size > MAX_MB * 1024 * 1024) {
            if (msg) { msg.style.color = '#EF4444'; msg.textContent = `File too large. Max size is ${MAX_MB} MB.`; }
            return;
        }

        const fd = new FormData();
        fd.append('file', file);

        if (btn) { btn.disabled = true; btn.textContent = 'Uploading...'; }
        if (msg) { msg.style.color = '#555'; msg.textContent = 'Uploading...'; }

        try {
            const response = await fetch(`${API_URL}/files`, {
                method: 'POST',
                headers: getUploadHeaders(), // do NOT set Content-Type manually
                body: fd
            });
            const result = await response.json();

            if (response.ok && result.success) {
                if (msg) { msg.style.color = '#10B981'; msg.textContent = '✅ ' + (result.message || 'File uploaded successfully!'); }
                input.value = '';
                loadUserFiles();
            } else {
                if (msg) { msg.style.color = '#EF4444'; msg.textContent = '❌ ' + (result.message || 'Upload failed.'); }
            }
        } catch (error) {
            console.error('Upload error:', error);
            if (msg) { msg.style.color = '#EF4444'; msg.textContent = '❌ Server connection error while uploading.'; }
        } finally {
            if (btn) { btn.disabled = false; btn.textContent = 'Upload File'; }
        }
    });
}

/** Delete the current user's own file */
async function deleteUserFile(fileId, fileName) {
    if (!confirm(`Delete "${fileName}"? This cannot be undone.`)) return;

    try {
        const response = await fetch(`${API_URL}/user/files/${fileId}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        const result = await response.json();

        if (response.ok && result.success) {
            loadUserFiles();
        } else {
            alert('Failed to delete file: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Delete file error:', error);
        alert('Server error while deleting file.');
    }
}

// ==========================================
// UTILITIES
// ==========================================

function escapeHTML(str) {
    if (!str) return '';
    return String(str).replace(/[&<>'"]/g,
        tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
    );
}

/** Escape single quotes for inline onclick handlers */
function escapeQuotes(str) {
    if (!str) return '';
    return String(str).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}