/* ==========================================
   NEXUS AI - Client Project Management Platform (Task 11)
   Full CRUD for projects with RBAC + client-side filtering.
   Roles: Admin (full), Team Member (assigned only), Customer (own only).

   NOTE: This file depends on helpers defined in `js/auth.js`:
         - getToken, getUser, can, canAny
         - apiFetch, escapeHTML, escapeQuotes, debounce
         - applyPermissionUI, handleLogout, requireAuth
   ========================================== */

const PROJECTS_API = 'http://localhost:5000/api/projects';
const USERS_API = 'http://localhost:5000/api/users';

// In-memory cache for client-side filtering
let cachedProjects = [];

// ==========================================
// BOOTSTRAP
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
    // 1. Guard access: must be authenticated
    const user = requireAuth();
    if (!user) return;

    // 2. Apply permission-based UI visibility
    applyPermissionUI();

    // 3. Load initial data
    loadProjects();
    loadProjectStats();     // admin only (silently skipped otherwise)
    loadFormDropdowns();    // admin only (fills client + team member selects)

    // 4. Logout
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    // 5. Create form submission
    const createForm = document.getElementById('createProjectForm');
    if (createForm) createForm.addEventListener('submit', handleCreateProject);

    // 6. Search & filter (client-side)
    const searchInput = document.getElementById('projSearchInput');
    const statusFilter = document.getElementById('projStatusFilter');
    if (searchInput) searchInput.addEventListener('input', debounce(renderFilteredProjects, 200));
    if (statusFilter) statusFilter.addEventListener('change', renderFilteredProjects);
});

// ==========================================
// LOAD PROJECTS (GET /api/projects)
// ==========================================

async function loadProjects() {
    const container = document.getElementById('projectsList');
    if (!container) return;

    try {
        const result = await apiFetch('/projects');

        if (!result.success) {
            container.innerHTML = `<p class="state-msg error">${escapeHTML(result.message || 'Failed to load projects.')}</p>`;
            return;
        }

        cachedProjects = result.data || [];

        if (cachedProjects.length === 0) {
            container.innerHTML = '<p class="state-msg">No projects found.</p>';
            return;
        }

        renderFilteredProjects();
    } catch (err) {
        console.error('Load projects error:', err);
        container.innerHTML = '<p class="state-msg error">Failed to load projects.</p>';
    }
}

// ==========================================
// CLIENT-SIDE FILTER & RENDER
// ==========================================

function renderFilteredProjects() {
    const container = document.getElementById('projectsList');
    if (!container) return;

    const searchVal = (document.getElementById('projSearchInput')?.value || '').toLowerCase().trim();
    const statusVal = document.getElementById('projStatusFilter')?.value || 'ALL';

    let list = cachedProjects.slice();

    if (statusVal !== 'ALL') list = list.filter(p => p.status === statusVal);
    if (searchVal) list = list.filter(p => (p.name || '').toLowerCase().includes(searchVal));

    if (list.length === 0) {
        container.innerHTML = '<p class="state-msg">No matching projects.</p>';
        return;
    }

    container.innerHTML = list.map(p => renderProjectCard(p)).join('');
}

function renderProjectCard(p) {
    const badge = getProjectBadgeClass(p.status);
    const clientName = p.client?.name ? escapeHTML(p.client.name) : 'Unknown';
    const clientEmail = p.client?.email ? escapeHTML(p.client.email) : '—';

    const members = (Array.isArray(p.assignedMembers) && p.assignedMembers.length > 0)
        ? p.assignedMembers.map(m => `<span class="member-chip">${escapeHTML(m.name || 'Member')}</span>`).join('')
        : '<span style="color:#9CA3AF; font-size:0.8rem;">No members assigned</span>';

    // ---- Action buttons based on permissions ----
    const actions = [];

    // Status dropdown — visible if user can update (admin or assigned team member)
    if (can('projects:update')) {
        actions.push(`
            <select onchange="updateProjectStatus('${p._id}', this.value)">
                <option value="Not Started" ${p.status === 'Not Started' ? 'selected' : ''}>Not Started</option>
                <option value="In Progress" ${p.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                <option value="Completed"   ${p.status === 'Completed'   ? 'selected' : ''}>Completed</option>
                <option value="On Hold"     ${p.status === 'On Hold'     ? 'selected' : ''}>On Hold</option>
            </select>
        `);
    }

    // Edit — admin OR assigned team member
    if (can('projects:update')) {
        actions.push(`
            <button class="btn btn-outline"
                    onclick="openEditProject('${p._id}', '${escapeQuotes(p.name)}', '${escapeQuotes(p.description)}')">
                Edit
            </button>
        `);
    }

    // Assign members — admin only
    if (can('projects:assign')) {
        actions.push(`
            <button class="btn btn-outline" onclick="openAssignMembers('${p._id}')">
                Assign Members
            </button>
        `);
    }

    // Delete — admin only
    if (can('projects:delete')) {
        actions.push(`
            <button class="btn btn-danger-outline"
                    onclick="deleteProject('${p._id}', '${escapeQuotes(p.name)}')">
                Delete
            </button>
        `);
    }

    const actionsHtml = actions.length > 0
        ? `<div class="project-actions">${actions.join('')}</div>`
        : '';

    return `
        <div class="project-card" data-project-id="${p._id}">
            <div class="project-header">
                <h4>${escapeHTML(p.name)}</h4>
                <span class="badge ${badge}">${escapeHTML(p.status)}</span>
            </div>
            <p class="project-desc">${escapeHTML(p.description)}</p>
            <p class="project-meta"><strong>Client:</strong> ${clientName} (${clientEmail})</p>
            <p class="project-meta"><strong>Created:</strong> ${new Date(p.createdAt || Date.now()).toLocaleDateString()}</p>
            <div class="members-row">${members}</div>
            ${actionsHtml}
        </div>
    `;
}

function getProjectBadgeClass(status) {
    switch (status) {
        case 'In Progress': return 'badge-in-progress';
        case 'Completed':   return 'badge-completed';
        case 'On Hold':     return 'badge-on-hold';
        case 'Not Started':
        default:            return 'badge-not-started';
    }
}

// ==========================================
// CREATE PROJECT (Admin only)
// ==========================================

async function handleCreateProject(e) {
    e.preventDefault();

    if (!can('projects:create')) {
        showFormMsg('❌ You do not have permission to create projects.', 'red');
        return;
    }

    const name = document.getElementById('projName')?.value.trim();
    const description = document.getElementById('projDescription')?.value.trim();
    const client = document.getElementById('projClient')?.value;
    const membersSelect = document.getElementById('projMembers');
    const assignedMembers = membersSelect
        ? Array.from(membersSelect.selectedOptions).map(o => o.value).filter(Boolean)
        : [];

    if (!name || !description || !client) {
        showFormMsg('❌ Name, description, and client are required.', 'red');
        return;
    }

    try {
        const result = await apiFetch('/projects', {
            method: 'POST',
            body: JSON.stringify({ name, description, client, assignedMembers })
        });

        if (result.success) {
            showFormMsg('✅ Project created successfully!', 'green');
            document.getElementById('createProjectForm').reset();
            loadProjects();
            loadProjectStats();
        } else {
            showFormMsg('❌ ' + (result.message || 'Failed to create project.'), 'red');
        }
    } catch (err) {
        console.error('Create project error:', err);
        showFormMsg('❌ Server error while creating project.', 'red');
    }
}

function showFormMsg(text, color) {
    const el = document.getElementById('createProjectMsg');
    if (!el) return;
    el.style.color = color;
    el.innerText = text;
}

// ==========================================
// UPDATE STATUS (Admin or assigned Team Member)
// ==========================================

async function updateProjectStatus(projectId, newStatus) {
    if (!can('projects:update')) {
        alert('You do not have permission to update project status.');
        return;
    }

    try {
        const result = await apiFetch(`/projects/${projectId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status: newStatus })
        });

        if (result.success) {
            loadProjects();
            loadProjectStats();
        } else {
            alert('Failed to update status: ' + (result.message || 'Unknown error'));
            loadProjects(); // revert select
        }
    } catch (err) {
        console.error('Update status error:', err);
        alert('Server error while updating status.');
    }
}

// ==========================================
// EDIT PROJECT (Admin or assigned Team Member)
// ==========================================

async function openEditProject(projectId, currentName, currentDescription) {
    if (!can('projects:update')) return;

    const newName = prompt('Project name:', currentName);
    if (newName === null) return; // user cancelled
    if (!newName.trim()) { alert('Project name cannot be empty.'); return; }

    const newDescription = prompt('Project description:', currentDescription);
    if (newDescription === null) return;
    if (!newDescription.trim()) { alert('Project description cannot be empty.'); return; }

    try {
        const result = await apiFetch(`/projects/${projectId}`, {
            method: 'PUT',
            body: JSON.stringify({ name: newName.trim(), description: newDescription.trim() })
        });

        if (result.success) {
            loadProjects();
        } else {
            alert('Failed to update project: ' + (result.message || 'Unknown error'));
        }
    } catch (err) {
        console.error('Edit project error:', err);
        alert('Server error while updating project.');
    }
}

// ==========================================
// ASSIGN MEMBERS (Admin only)
// ==========================================

async function openAssignMembers(projectId) {
    if (!can('projects:assign')) return;

    // Fetch all team_member users
    let teamMembers = [];
    try {
        const result = await apiFetch('/users');
        if (result.success && Array.isArray(result.data)) {
            teamMembers = result.data.filter(u => u.role === 'team_member');
        }
    } catch (err) {
        console.error('Load team members error:', err);
    }

    if (teamMembers.length === 0) {
        alert('No team members available. Create a user with the "team_member" role first.');
        return;
    }

    // Build a simple prompt-based multi-select using IDs
    const optionsText = teamMembers
        .map((m, i) => `${i + 1}. ${m.name} (${m.email}) — ID: ${m._id}`)
        .join('\n');

    const input = prompt(
        `Enter the numbers of the team members to assign (comma-separated).\n\n${optionsText}\n\nExample: 1,3`,
        ''
    );
    if (input === null) return;

    const pickedIndices = input.split(',')
        .map(s => parseInt(s.trim(), 10) - 1)
        .filter(i => Number.isInteger(i) && i >= 0 && i < teamMembers.length);

    if (pickedIndices.length === 0) {
        alert('No valid selection. Nothing was changed.');
        return;
    }

    const assignedMembers = pickedIndices.map(i => teamMembers[i]._id);

    try {
        const result = await apiFetch(`/projects/${projectId}/assign`, {
            method: 'PUT',
            body: JSON.stringify({ assignedMembers })
        });

        if (result.success) {
            loadProjects();
        } else {
            alert('Failed to assign members: ' + (result.message || 'Unknown error'));
        }
    } catch (err) {
        console.error('Assign members error:', err);
        alert('Server error while assigning members.');
    }
}

// ==========================================
// DELETE PROJECT (Admin only)
// ==========================================

async function deleteProject(projectId, projectName) {
    if (!can('projects:delete')) {
        alert('You do not have permission to delete projects.');
        return;
    }
    if (!confirm(`Delete project "${projectName}"? This cannot be undone.`)) return;

    try {
        const result = await apiFetch(`/projects/${projectId}`, { method: 'DELETE' });

        if (result.success) {
            loadProjects();
            loadProjectStats();
        } else {
            alert('Failed to delete project: ' + (result.message || 'Unknown error'));
        }
    } catch (err) {
        console.error('Delete project error:', err);
        alert('Server error while deleting project.');
    }
}

// ==========================================
// STATISTICS (Admin only)
// ==========================================

async function loadProjectStats() {
    if (!can('projects:read')) return;
    // Stats widget only exists for admins (data-role="admin")
    const user = getUser();
    if (!user || user.role !== 'admin') return;

    try {
        const result = await apiFetch('/projects/stats');
        if (!result.success || !result.data) return;

        const s = result.data;
        const set = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = (v ?? '—'); };
        set('statTotal', s.total);
        set('statNotStarted', s.notStarted);
        set('statInProgress', s.inProgress);
        set('statCompleted', s.completed);
        set('statOnHold', s.onHold);
    } catch (err) {
        console.warn('Could not load project stats:', err.message);
    }
}

// ==========================================
// FORM DROPDOWNS (Admin only — clients + team members)
// ==========================================

async function loadFormDropdowns() {
    // Only admins see the create form
    if (!can('projects:create')) return;

    try {
        const result = await apiFetch('/users');
        if (!result.success || !Array.isArray(result.data)) return;

        const users = result.data;
        const clients = users.filter(u => u.role === 'customer');
        const members = users.filter(u => u.role === 'team_member');

        // Client select
        const clientSelect = document.getElementById('projClient');
        if (clientSelect) {
            if (clients.length === 0) {
                clientSelect.innerHTML = '<option value="">No customers registered yet</option>';
            } else {
                clientSelect.innerHTML = '<option value="">-- Select a customer --</option>' +
                    clients.map(c => `<option value="${c._id}">${escapeHTML(c.name)} (${escapeHTML(c.email)})</option>`).join('');
            }
        }

        // Team members multi-select
        const membersSelect = document.getElementById('projMembers');
        if (membersSelect) {
            if (members.length === 0) {
                membersSelect.innerHTML = '<option value="">No team members available</option>';
            } else {
                membersSelect.innerHTML = members
                    .map(m => `<option value="${m._id}">${escapeHTML(m.name)} (${escapeHTML(m.email)})</option>`)
                    .join('');
            }
        }
    } catch (err) {
        console.error('Load dropdowns error:', err);
    }
}