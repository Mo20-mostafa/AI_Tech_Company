/* ==========================================
   NEXUS AI - Internal Service Management Logic
   Task 6 Implementation (Admin CRUD Operations)
   ========================================== */

const API_URL = 'http://localhost:5000/api/services';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Verify Authorization & Admin Permissions (RBAC Rule 5)
    checkAdminAuth();

    // 2. Fetch existing services from database
    loadAdminServices();

    // 3. Attach Form Submit Event for Create & Update Operations
    const serviceForm = document.getElementById('serviceForm');
    if (serviceForm) {
        serviceForm.addEventListener('submit', handleServiceSubmit);
    }

    // 4. Cancel Edit Mode Event
    const cancelEditBtn = document.getElementById('cancelEditBtn');
    if (cancelEditBtn) {
        cancelEditBtn.addEventListener('click', resetForm);
    }

    // 5. Logout Handler
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
 * Fetch and display all active services from backend (Task 6 - Req 2)
 */
async function loadAdminServices() {
    const grid = document.getElementById('adminServicesGrid');
    if (!grid) return;

    try {
        const response = await fetch(API_URL);
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
    const token = localStorage.getItem('token');
    const id = document.getElementById('serviceId').value;
    const title = document.getElementById('serviceTitle').value.trim();
    const description = document.getElementById('serviceDescription').value.trim();
    const statusMsg = document.getElementById('adminStatusMsg');

    const method = id ? 'PUT' : 'POST';
    const endpoint = id ? `${API_URL}/${id}` : API_URL;

    try {
        const response = await fetch(endpoint, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
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

    const token = localStorage.getItem('token');

    try {
        const response = await fetch(`${API_URL}/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
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

function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag));
}

function escapeQuotes(str) {
    if (!str) return '';
    return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}