/* ==========================================
   NEXUS AI - Customer Dashboard Logic
   Tasks 5 (Profile), 7 (Customer Requests),
   9 (RBAC), 10 (File Management), 11 (My Projects)

   NOTE: This file depends on helpers defined in `js/auth.js`:
         - getToken, getUser, can, canAny
         - apiFetch, escapeHTML, escapeQuotes, debounce
         - applyPermissionUI, handleLogout
   ========================================== */

const API_URL = 'http://localhost:5000/api';
const PROJECTS_API_URL = 'http://localhost:5000/api/projects'; // Task 11

// ==========================================
// BOOTSTRAP
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // 0. Guard access + apply permission-based UI
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

    // 6. Task 11 — customer's projects
    loadUserProjects();

    // 7. Logout button
    const logoutBtn = document.getElementById('logoutBtn') || document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
});

// ==========================================
// AUTH GUARD
// ==========================================

function verifyUserAuth() {
    const token = getToken();
    const user = getUser();
    if (!token || !user) {
        alert('Authentication required. Please log in first.');
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// ==========================================
// TASK 5: USER PROFILE
// ==========================================

async function loadUserProfile() {
    const nameInput = document.getElementById('profileName') || document.getElementById('name');
    const emailInput = document.getElementById('profileEmail') || document.getElementById('email');
    if (!nameInput && !emailInput) return;

    try {
        const response = await fetch(`${API_URL}/user/profile`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
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
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
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
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
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
        const response = await fetch(`${API_URL}/user/requests`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        const result = await response.json();
        const requests = result.data || (Array.isArray(result) ? result : []);

        // Cache for client-side filtering
        window.__cachedRequests = requests;

        if (requests.length === 0) {
            requestsContainer.innerHTML = '<p style="text-align: center; color: #666;">No service requests submitted yet.</p>';
            return;
        }

        // If filter UI exists, let it handle rendering
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
        let badgeClass = 'badge-pending';
        if (req.status === 'In Progress') badgeClass = 'badge-progress';
        if (req.status === 'Completed') badgeClass = 'badge-completed';
        if (req.status === 'Rejected') badgeClass = 'badge-rejected';

        return `
            <div class="request-item">
                <div class="request-header">
                    <h4 style="font-size: 1.05rem; color: #111827;">${escapeHTML(req.title)}</h4>
                    <span class="badge ${badgeClass}">${escapeHTML(req.status)}</span>
                </div>
                <p style="color: #4B5563; font-size: 0.95rem; margin-bottom: 0.5rem; line-height: 1.4;">${escapeHTML(req.description)}</p>
                <small style="color: #9CA3AF;">Submitted: ${new Date(req.createdAt || Date.now()).toLocaleDateString()}</small>
            </div>
        `;
    }).join('');
}

// ==========================================
// TASK 11: MY PROJECTS (Customer View)
// ==========================================

/**
 * Load and render the customer's own projects.
 * Backend already filters by `client: req.user.id` for customers.
 */
async function loadUserProjects() {
    const container = document.getElementById('userProjectsList');
    if (!container) return;

    // Hide section if user lacks projects:read
    if (!can('projects:read')) {
        const wrapper = container.closest('.dash-card') || container.parentElement;
        if (wrapper) wrapper.style.display = 'none';
        return;
    }

    try {
        const result = await apiFetch('/projects');

        if (!result.success) {
            container.innerHTML = `<p style="text-align:center; color:#EF4444;">${escapeHTML(result.message || 'Failed to load projects.')}</p>`;
            return;
        }

        const projects = result.data || [];
        if (projects.length === 0) {
            container.innerHTML = '<p style="text-align:center; color:#6B7280;">No projects assigned to you yet.</p>';
            return;
        }

        container.innerHTML = projects.map(p => {
            const badgeClass = getProjectBadgeClass(p.status);
            const members = Array.isArray(p.assignedMembers) && p.assignedMembers.length > 0
                ? `<div class="project-members">
                     ${p.assignedMembers.map(m => `<span class="member-chip">${escapeHTML(m.name || 'Member')}</span>`).join('')}
                   </div>`
                : '';

            return `
                <div class="project-item">
                    <div class="project-header">
                        <h4 style="font-size: 1.05rem; color: #111827;">${escapeHTML(p.name)}</h4>
                        <span class="badge ${badgeClass}">${escapeHTML(p.status)}</span>
                    </div>
                    <p style="color: #4B5563; font-size: 0.95rem; line-height: 1.4;">${escapeHTML(p.description)}</p>
                    <div class="project-meta">
                        Created: ${new Date(p.createdAt || Date.now()).toLocaleDateString()}
                    </div>
                    ${members}
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading projects:', error);
        container.innerHTML = '<p style="text-align:center; color:#EF4444;">Failed to load projects.</p>';
    }
}

/** Map project status → CSS badge class */
function getProjectBadgeClass(status) {
    switch (status) {
        case 'In Progress': return 'badge-progress';
        case 'Completed':   return 'badge-completed';
        case 'On Hold':     return 'badge-on-hold';
        case 'Not Started':
        default:            return 'badge-not-started';
    }
}

// ==========================================
// TASK 10: FILE & DOCUMENT MANAGEMENT
// ==========================================

async function loadUserFiles() {
    const container = document.getElementById('userFilesList');
    if (!container) return;

    try {
        const response = await fetch(`${API_URL}/user/files`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
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
                // Do NOT set Content-Type manually for multipart/form-data
                headers: { 'Authorization': `Bearer ${getToken()}` },
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

async function deleteUserFile(fileId, fileName) {
    if (!confirm(`Delete "${fileName}"? This cannot be undone.`)) return;

    try {
        const response = await fetch(`${API_URL}/user/files/${fileId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getToken()}` }
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