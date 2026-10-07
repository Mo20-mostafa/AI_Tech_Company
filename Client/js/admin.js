/* ==========================================
   NEXUS AI - Internal Service Management Logic
   Task 6 (Services CMS), Task 7 (Request Management), Task 8 (Search & Filtering)
   Task 9 (RBAC — Permission-Based UI)
   Task 10 (File Management — Admin View)
   Task 11 (Project Statistics Widget)

   NOTE: This file depends on helpers defined in `js/auth.js`:
         - getToken, getUser, getCurrentUser, can, canAny
         - apiFetch, escapeHTML, escapeQuotes, debounce
         - applyPermissionUI, handleLogout
   ========================================== */

const SERVICES_API_URL = 'http://localhost:5000/api/services';
const REQUESTS_API_URL = 'http://localhost:5000/api/admin/requests';
const FILES_API_URL = 'http://localhost:5000/api/files';
const PROJECTS_STATS_URL = 'http://localhost:5000/api/projects/stats'; // Task 11

// ------------------------------------------
// PAGE ACCESS GUARD
// ------------------------------------------

/**
 * Guards admin.html — allows:
 *   - admin (all permissions)
 *   - employee / team_member (any admin-side permission)
 * Redirects everyone else back to login.
 */
function guardPageAccess() {
    const token = getToken();
    const user = getUser();

    if (!token || !user) {
        alert('Please log in first.');
        window.location.href = 'login.html';
        return false;
    }

    const allowed = user.role === 'admin'
        || user.role === 'employee'
        || user.role === 'team_member'
        || canAny([
            'requests:read_all',
            'inquiries:read',
            'services:create',
            'services:update',
            'services:delete',
            'files:read_all',
            'projects:read'
        ]);

    if (!allowed) {
        alert('Unauthorized access! Insufficient permissions.');
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// ------------------------------------------
// BOOTSTRAP
// ------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    // 1. Access guard + UI adjustments based on permissions
    if (!guardPageAccess()) return;
    applyPermissionUI();

    // 2. Initial data loads
    loadAdminServices();
    loadAdminRequests();
    loadAllFiles();
    loadProjectStats(); // Task 11

    // 3. Service form (create / update)
    const serviceForm = document.getElementById('serviceForm');
    if (serviceForm) serviceForm.addEventListener('submit', handleServiceSubmit);

    // 4. Cancel edit
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    if (cancelEditBtn) cancelEditBtn.addEventListener('click', resetForm);

    // 5. Logout (delegates to handleLogout from auth.js)
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    // 6. Task 8 — Search & Sorting for services
    const adminSearchInput = document.getElementById('adminSearchInput');
    const adminSortSelect = document.getElementById('adminSortSelect');

    if (adminSearchInput) {
        adminSearchInput.addEventListener('input', debounce(() => loadAdminServices(), 300));
    }
    if (adminSortSelect) {
        adminSortSelect.addEventListener('change', () => loadAdminServices());
    }

    // 7. Task 8 — Status filter for requests
    const requestStatusFilter = document.getElementById('requestStatusFilter');
    if (requestStatusFilter) {
        requestStatusFilter.addEventListener('change', () => loadAdminRequests());
    }
});

// ------------------------------------------
// TASK 6 & 8: SERVICES MANAGEMENT
// ------------------------------------------

async function loadAdminServices() {
    const grid = document.getElementById('adminServicesGrid');
    if (!grid) return;

    const searchVal = document.getElementById('adminSearchInput')?.value || '';
    const sortVal = document.getElementById('adminSortSelect')?.value || 'newest';

    const queryParams = new URLSearchParams({ search: searchVal, sortBy: sortVal });

    try {
        const response = await fetch(`${SERVICES_API_URL}?${queryParams.toString()}`);
        const result = await response.json();
        const services = result.data || (Array.isArray(result) ? result : []);

        if (services.length === 0) {
            grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #666;">No services match your search criteria.</p>';
            return;
        }

        const showEdit = can('services:update');
        const showDelete = can('services:delete');

        grid.innerHTML = services.map(s => {
            const id = s._id || s.id;
            const editBtn = showEdit
                ? `<button class="btn-outline" onclick="prepareEdit('${id}', '${escapeQuotes(s.title)}', '${escapeQuotes(s.description)}')">Edit</button>`
                : '';
            const deleteBtn = showDelete
                ? `<button class="btn-outline" style="color: #c06345; border-color: #c06345;" onclick="deleteService('${id}')">Delete</button>`
                : '';

            const actions = (editBtn || deleteBtn)
                ? `<div style="display: flex; gap: 0.5rem; margin-top: 1.5rem;">${editBtn}${deleteBtn}</div>`
                : '';

            return `
                <div class="service-card card">
                    <h3>${escapeHTML(s.title)}</h3>
                    <p>${escapeHTML(s.description)}</p>
                    ${actions}
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading services:', error);
    }
}

async function handleServiceSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('serviceId').value;
    const title = document.getElementById('serviceTitle').value.trim();
    const description = document.getElementById('serviceDescription').value.trim();
    const statusMsg = document.getElementById('adminStatusMsg');

    const requiredPerm = id ? 'services:update' : 'services:create';
    if (!can(requiredPerm)) {
        if (statusMsg) {
            statusMsg.style.color = 'red';
            statusMsg.innerText = '❌ You do not have permission to perform this action.';
        }
        return;
    }

    const method = id ? 'PUT' : 'POST';
    const endpoint = id ? `${SERVICES_API_URL}/${id}` : SERVICES_API_URL;

    try {
        const response = await fetch(endpoint, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({ title, description })
        });

        const data = await response.json();

        if (response.ok) {
            statusMsg.style.color = 'green';
            statusMsg.innerText = id ? '✅ Service updated successfully!' : '✅ Service created successfully!';
            resetForm();
            loadAdminServices();
        } else {
            statusMsg.style.color = 'red';
            statusMsg.innerText = '❌ Error: ' + (data.message || 'Operation failed');
        }
    } catch (error) {
        statusMsg.style.color = 'red';
        statusMsg.innerText = '❌ Failed to connect to server.';
    }
}

function prepareEdit(id, title, description) {
    if (!can('services:update')) return;

    document.getElementById('serviceId').value = id;
    document.getElementById('serviceTitle').value = title;
    document.getElementById('serviceDescription').value = description;

    document.getElementById('formTitle').innerText = 'Update Service';
    document.getElementById('submitServiceBtn').innerText = 'Update Changes';
    document.getElementById('cancelEditBtn').style.display = 'inline-block';
}

async function deleteService(id) {
    if (!can('services:delete')) {
        alert('You do not have permission to delete services.');
        return;
    }
    if (!confirm('Are you sure you want to delete this service?')) return;

    try {
        const response = await fetch(`${SERVICES_API_URL}/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });

        if (response.ok) {
            loadAdminServices();
        } else {
            const data = await response.json().catch(() => ({}));
            alert('Failed to delete service: ' + (data.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Delete error:', error);
    }
}

function resetForm() {
    const serviceForm = document.getElementById('serviceForm');
    if (serviceForm) serviceForm.reset();
    document.getElementById('serviceId').value = '';
    document.getElementById('formTitle').innerText = 'Create New Service';
    document.getElementById('submitServiceBtn').innerText = 'Save Service';
    document.getElementById('cancelEditBtn').style.display = 'none';
}

// ------------------------------------------
// TASK 7 & 8: REQUEST MANAGEMENT
// ------------------------------------------

async function loadAdminRequests() {
    const container = document.getElementById('adminRequestsContainer')
        || document.getElementById('adminRequestsList')
        || document.getElementById('adminRequestsTable');

    if (!container) return;

    const selectedStatus = document.getElementById('requestStatusFilter')?.value || 'ALL';

    try {
        const response = await fetch(REQUESTS_API_URL, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        const result = await response.json();
        let requests = result.data || (Array.isArray(result) ? result : []);

        if (selectedStatus !== 'ALL') {
            requests = requests.filter(req => req.status === selectedStatus);
        }

        if (requests.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No requests found matching this filter.</p>';
            return;
        }

        const canUpdateStatus = can('requests:update_status');

        container.innerHTML = requests.map(req => {
            const clientName = req.userId?.name ? escapeHTML(req.userId.name) : 'Unknown Client';
            const clientEmail = req.userId?.email ? escapeHTML(req.userId.email) : 'N/A';

            const statusControl = canUpdateStatus
                ? `<select onchange="updateAdminRequestStatus('${req._id}', this.value)" style="padding: 4px 8px; border-radius: 4px; border: 1px solid #ccc; font-weight: bold;">
                        <option value="Pending" ${req.status === 'Pending' ? 'selected' : ''}>Pending ⏳</option>
                        <option value="In Progress" ${req.status === 'In Progress' ? 'selected' : ''}>In Progress 🔄</option>
                        <option value="Completed" ${req.status === 'Completed' ? 'selected' : ''}>Completed ✅</option>
                        <option value="Rejected" ${req.status === 'Rejected' ? 'selected' : ''}>Rejected ❌</option>
                   </select>`
                : `<span style="display:inline-block; padding: 4px 10px; border-radius: 4px; background:#f0f0f0; font-weight:bold;">${escapeHTML(req.status)}</span>`;

            return `
                <div class="request-admin-card card" style="margin-bottom: 15px; padding: 15px; border: 1px solid #e0e0e0; border-radius: 6px; background-color: #fff;">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f0f0f0; padding-bottom: 8px; margin-bottom: 10px;">
                        <h3 style="margin: 0; font-size: 1.1rem; color: #333;">${escapeHTML(req.title)}</h3>
                        <div>
                            <label style="font-size: 0.85rem; font-weight: bold; margin-right: 5px;">Status:</label>
                            ${statusControl}
                        </div>
                    </div>
                    <p style="margin: 5px 0; font-size: 0.9rem; color: #555;">
                        <strong>Customer:</strong> ${clientName} (<a href="mailto:${clientEmail}">${clientEmail}</a>)
                    </p>
                    <p style="margin: 10px 0; color: #444; line-height: 1.5;">${escapeHTML(req.description)}</p>
                    <small style="color: #888;">Submitted on: ${new Date(req.createdAt || Date.now()).toLocaleDateString()}</small>
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error fetching customer requests for admin:', error);
        container.innerHTML = '<p style="text-align: center; color: red;">Failed to load requests.</p>';
    }
}

async function updateAdminRequestStatus(requestId, newStatus) {
    if (!can('requests:update_status')) {
        alert('You do not have permission to update request statuses.');
        return;
    }

    try {
        const response = await fetch(`${REQUESTS_API_URL}/${requestId}/status`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({ status: newStatus })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            loadAdminRequests();
        } else {
            alert('Failed to update status: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error updating status:', error);
        alert('Server error while updating request status.');
    }
}

// ------------------------------------------
// TASK 10: FILE MANAGEMENT (Admin View)
// ------------------------------------------

async function loadAllFiles() {
    const container = document.getElementById('adminFilesList');
    if (!container) return;

    if (!can('files:read_all')) {
        const wrapper = container.closest('.card') || container.parentElement;
        if (wrapper) wrapper.style.display = 'none';
        return;
    }

    try {
        const response = await fetch(FILES_API_URL, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        const result = await response.json();

        if (!response.ok) {
            container.innerHTML = `<p style="text-align: center; color: red;">${escapeHTML(result.message || 'Failed to load files.')}</p>`;
            return;
        }

        const files = result.data || [];
        if (files.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No files uploaded yet.</p>';
            return;
        }

        const canDelete = can('files:delete_any');
        const fullURL = (u) => `http://localhost:5000${u}`;

        container.innerHTML = files.map(f => {
            const owner = f.owner
                ? `${escapeHTML(f.owner.name)} (${escapeHTML(f.owner.email)})`
                : 'Unknown';
            const deleteBtn = canDelete
                ? `<button class="btn-outline" style="color:#c06345; border-color:#c06345; margin-top:0.5rem;" onclick="deleteAnyFile('${f.id}', '${escapeQuotes(f.originalName)}')">Delete</button>`
                : '';

            return `
                <div class="file-admin-card card" style="margin-bottom: 12px; padding: 12px; border: 1px solid #e0e0e0; border-radius: 6px; background:#fff;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div>
                            <h4 style="margin:0; color:#111827; font-size:1rem;">${escapeHTML(f.originalName)}</h4>
                            <p style="margin:4px 0 0; font-size:0.82rem; color:#6B7280;">
                                ${escapeHTML(f.mimeType)} • ${escapeHTML(f.sizeHuman)}
                            </p>
                            <p style="margin:4px 0 0; font-size:0.82rem; color:#D97757; font-weight:600;">
                                Owner: ${owner}
                            </p>
                            <p style="margin:4px 0 0; font-size:0.75rem; color:#9CA3AF;">
                                Uploaded: ${new Date(f.uploadedAt).toLocaleString()}
                            </p>
                        </div>
                        <a href="${fullURL(f.url)}" target="_blank"
                           style="color:#D97757; font-weight:600; text-decoration:none; font-size:0.85rem; margin-left:1rem;">
                            View ↗
                        </a>
                    </div>
                    ${deleteBtn}
                </div>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading files:', error);
        container.innerHTML = '<p style="text-align: center; color: red;">Failed to load files.</p>';
    }
}

async function deleteAnyFile(fileId, fileName) {
    if (!can('files:delete_any')) {
        alert('You do not have permission to delete files.');
        return;
    }
    if (!confirm(`Delete "${fileName}"? This cannot be undone.`)) return;

    try {
        const response = await fetch(`${FILES_API_URL}/${fileId}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        const result = await response.json();

        if (response.ok && result.success) {
            loadAllFiles();
        } else {
            alert('Failed to delete file: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Delete file error:', error);
        alert('Server error while deleting file.');
    }
}

// ------------------------------------------
// TASK 11: PROJECT STATISTICS WIDGET
// ------------------------------------------

/**
 * Load project statistics for the admin dashboard widget.
 * Only admins can see the full stats (backend enforces this).
 */
async function loadProjectStats() {
    // Only show for users with projects:read
    if (!can('projects:read')) return;

    try {
        const result = await apiFetch('/projects/stats');

        if (!result.success || !result.data) {
            // Silently skip — the widget stays with dashes
            return;
        }

        const s = result.data;
        document.getElementById('statTotal').textContent = s.total ?? '—';
        document.getElementById('statNotStarted').textContent = s.notStarted ?? '—';
        document.getElementById('statInProgress').textContent = s.inProgress ?? '—';
        document.getElementById('statCompleted').textContent = s.completed ?? '—';
        document.getElementById('statOnHold').textContent = s.onHold ?? '—';
    } catch (err) {
        console.warn('Could not load project stats:', err.message);
    }
}