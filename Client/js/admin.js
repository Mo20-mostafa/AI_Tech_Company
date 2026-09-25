/* ==========================================
   NEXUS AI - Internal Service Management Logic
   Task 6 (Services CMS) & Task 7 (Request Management)
   ========================================== */

const SERVICES_API_URL = 'http://localhost:5000/api/services';
const REQUESTS_API_URL = 'http://localhost:5000/api/admin/requests';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Verify Authorization & Admin Permissions (RBAC Rule 5)
    checkAdminAuth();

    // 2. Fetch existing services from database (Task 6)
    loadAdminServices();

    // 3. Fetch customer submitted requests (Task 7)
    loadAdminRequests();

    // 4. Attach Form Submit Event for Create & Update Operations (Task 6)
    const serviceForm = document.getElementById('serviceForm');
    if (serviceForm) {
        serviceForm.addEventListener('submit', handleServiceSubmit);
    }

    // 5. Cancel Edit Mode Event
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', resetForm);
    }

    // 6. Logout Handler
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        });
    }
});

/**
 * Verify JWT Token and ensure user possesses Admin status.
 */
function checkAdminAuth() {
    const token = localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || '{}');

    if (!token || user.role !== 'admin') {
        alert('Unauthorized access! Admin credentials required.');
        window.location.href = 'login.html';
    }
}

/**
 * Helper to generate Authorization Headers for Admin Requests.
 */
function getAdminAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

// ==========================================
// TASK 6: SERVICE MANAGEMENT (CMS)
// ==========================================

/**
 * Fetch and display all active services from backend (Task 6 - Req 2)
 */
async function loadAdminServices() {
    const grid = document.getElementById('adminServicesGrid');
    if (!grid) return;

    try {
        const response = await fetch(SERVICES_API_URL);
        const result = await response.json();
        const services = result.data || (Array.isArray(result) ? result : []);

        if (services.length === 0) {
            grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: #666;">No active services found.</p>';
            return;
        }

        grid.innerHTML = services.map(s => `
            <div class="service-card card">
                <h3>${escapeHTML(s.title)}</h3>
                <p>${escapeHTML(s.description)}</p>
                <div style="display: flex; gap: 0.5rem; margin-top: 1.5rem;">
                    <button class="btn-outline" onclick="prepareEdit('${s._id || s.id}', '${escapeQuotes(s.title)}', '${escapeQuotes(s.description)}')">Edit</button>
                    <button class="btn-outline" style="color: #c06345; border-color: #c06345;" onclick="deleteService('${s._id || s.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading services:', error);
    }
}

/**
 * Handle Service Creation (POST) & Updates (PUT) (Task 6 - Req 1 & 3)
 */
async function handleServiceSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('serviceId').value;
    const title = document.getElementById('serviceTitle').value.trim();
    const description = document.getElementById('serviceDescription').value.trim();
    const statusMsg = document.getElementById('adminStatusMsg');

    const method = id ? 'PUT' : 'POST';
    const endpoint = id ? `${SERVICES_API_URL}/${id}` : SERVICES_API_URL;

    try {
        const response = await fetch(endpoint, {
            method: method,
            headers: getAdminAuthHeaders(),
            body: JSON.stringify({ title, description })
        });

        const data = await response.json();

        if (response.ok) {
            statusMsg.style.color = 'green';
            statusMsg.innerText = id ? '✅ Service updated successfully!' : '✅ Service created successfully!';
            resetForm();
            loadAdminServices(); // Refresh admin view
        } else {
            statusMsg.style.color = 'red';
            statusMsg.innerText = '❌ Error: ' + (data.message || 'Operation failed');
        }
    } catch (error) {
        statusMsg.style.color = 'red';
        statusMsg.innerText = '❌ Failed to connect to server.';
    }
}

/**
 * Populate form fields to switch to Edit Mode
 */
function prepareEdit(id, title, description) {
    document.getElementById('serviceId').value = id;
    document.getElementById('serviceTitle').value = title;
    document.getElementById('serviceDescription').value = description;
    
    document.getElementById('formTitle').innerText = 'Update Service';
    document.getElementById('submitServiceBtn').innerText = 'Update Changes';
    document.getElementById('cancelEditBtn').style.display = 'inline-block';
}

/**
 * Delete a Service from the Database (DELETE) (Task 6 - Req 4)
 */
async function deleteService(id) {
    if (!confirm('Are you sure you want to delete this service?')) return;

    try {
        const response = await fetch(`${SERVICES_API_URL}/${id}`, {
            method: 'DELETE',
            headers: getAdminAuthHeaders()
        });

        if (response.ok) {
            loadAdminServices(); // Refresh view after deletion
        } else {
            alert('Failed to delete service.');
        }
    } catch (error) {
        console.error('Delete error:', error);
    }
}

/**
 * Reset Form inputs and buttons state
 */
function resetForm() {
    document.getElementById('serviceForm').reset();
    document.getElementById('serviceId').value = '';
    document.getElementById('formTitle').innerText = 'Create New Service';
    document.getElementById('submitServiceBtn').innerText = 'Save Service';
    document.getElementById('cancelEditBtn').style.display = 'none';
}

// ==========================================
// TASK 7: COMPANY-SIDE REQUEST MANAGEMENT
// ==========================================

/**
 * Fetches and displays all customer requests for Company/Admin review.
 */
async function loadAdminRequests() {
    const container = document.getElementById('adminRequestsContainer') 
        || document.getElementById('adminRequestsList')
        || document.getElementById('adminRequestsTable');

    if (!container) return;

    try {
        const response = await fetch(REQUESTS_API_URL, {
            headers: getAdminAuthHeaders()
        });

        const result = await response.json();
        const requests = result.data || (Array.isArray(result) ? result : []);

        if (requests.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #666; padding: 20px;">No customer requests submitted yet.</p>';
            return;
        }

        container.innerHTML = requests.map(req => {
            const clientName = req.userId?.name ? escapeHTML(req.userId.name) : 'Unknown Client';
            const clientEmail = req.userId?.email ? escapeHTML(req.userId.email) : 'N/A';

            return `
                <div class="request-admin-card card" style="margin-bottom: 15px; padding: 15px; border: 1px solid #e0e0e0; border-radius: 6px; background-color: #fff;">
                    <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f0f0f0; padding-bottom: 8px; margin-bottom: 10px;">
                        <h3 style="margin: 0; font-size: 1.1rem; color: #333;">${escapeHTML(req.title)}</h3>
                        <div>
                            <label style="font-size: 0.85rem; font-weight: bold; margin-right: 5px;">Status:</label>
                            <select onchange="updateAdminRequestStatus('${req._id}', this.value)" style="padding: 4px 8px; border-radius: 4px; border: 1px solid #ccc; font-weight: bold;">
                                <option value="Pending" ${req.status === 'Pending' ? 'selected' : ''}>Pending ⏳</option>
                                <option value="In Progress" ${req.status === 'In Progress' ? 'selected' : ''}>In Progress 🔄</option>
                                <option value="Completed" ${req.status === 'Completed' ? 'selected' : ''}>Completed ✅</option>
                                <option value="Rejected" ${req.status === 'Rejected' ? 'selected' : ''}>Rejected ❌</option>
                            </select>
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

/**
 * Updates status of a specific customer request (PUT /api/admin/requests/:id/status)
 */
async function updateAdminRequestStatus(requestId, newStatus) {
    try {
        const response = await fetch(`${REQUESTS_API_URL}/${requestId}/status`, {
            method: 'PUT',
            headers: getAdminAuthHeaders(),
            body: JSON.stringify({ status: newStatus })
        });

        const result = await response.json();

        if (response.ok && result.success) {
            alert('Request status updated successfully!');
            loadAdminRequests(); // Refresh list to confirm state
        } else {
            alert('Failed to update status: ' + (result.message || 'Unknown error'));
        }
    } catch (error) {
        console.error('Error updating status:', error);
        alert('Server error while updating request status.');
    }
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}

function escapeQuotes(str) {
    if (!str) return '';
    return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}