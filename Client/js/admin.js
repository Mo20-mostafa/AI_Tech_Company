const API_URL = 'http://localhost:5000/api/services';

const serviceForm = document.getElementById('serviceForm');
const serviceIdInput = document.getElementById('serviceId');
const titleInput = document.getElementById('title');
const descInput = document.getElementById('description');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');
const servicesList = document.getElementById('servicesList');
const statusMsg = document.getElementById('statusMsg');

// READ: جلب الخدمات
async function fetchServices() {
    try {
        const res = await fetch(API_URL);
        const result = await res.json();
        if (result.success) {
            renderServices(result.data);
        }
    } catch (err) {
        showStatus('Error fetching services', true);
    }
}

function renderServices(services) {
    servicesList.innerHTML = '';
    if (services.length === 0) {
        servicesList.innerHTML = '<p>No services found.</p>';
        return;
    }
    services.forEach(item => {
        const div = document.createElement('div');
        div.style.cssText = 'padding: 15px; border: 1px solid #ddd; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; background: #fafafa; margin-bottom: 10px;';
        div.innerHTML = `
            <div>
                <h4 style="margin: 0 0 5px 0; font-size: 1.1rem; color: #222;">${item.title}</h4>
                <p style="margin: 0; color: #666; font-size: 0.95rem;">${item.description}</p>
            </div>
            <div style="display: flex; gap: 10px;">
                <button onclick="editService('${item._id}', '${escapeQuotes(item.title)}', '${escapeQuotes(item.description)}')" style="padding: 6px 12px; background: #007bff; color: white; border: none; border-radius: 4px; cursor: pointer;">Edit</button>
                <button onclick="deleteService('${item._id}')" style="padding: 6px 12px; background: #dc3545; color: white; border: none; border-radius: 4px; cursor: pointer;">Delete</button>
            </div>
        `;
        servicesList.appendChild(div);
    });
}

function escapeQuotes(str) {
    return str.replace(/'/g, "\\'").replace(/"/g, '&quot;');
}

// CREATE & UPDATE: إضافة أو تعديل
serviceForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = serviceIdInput.value;
    const payload = { title: titleInput.value, description: descInput.value };
    
    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_URL}/${id}` : API_URL;

    try {
        const res = await fetch(url, {
            method: method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        const result = await res.json();
        if (res.ok) {
            showStatus(result.message, false);
            resetForm();
            fetchServices();
        } else {
            showStatus(result.message || 'Operation failed', true);
        }
    } catch (err) {
        showStatus('Server connection failed', true);
    }
});

// DELETE: حذف خدمة
async function deleteService(id) {
    if (!confirm('Are you sure you want to delete this service?')) return;
    try {
        const res = await fetch(`${API_URL}/${id}`, { method: 'DELETE' });
        const result = await res.json();
        if (res.ok) {
            showStatus(result.message, false);
            fetchServices();
        } else {
            showStatus(result.message, true);
        }
    } catch (err) {
        showStatus('Delete request failed', true);
    }
}

function editService(id, title, description) {
    serviceIdInput.value = id;
    titleInput.value = title;
    descInput.value = description;
    saveBtn.innerText = 'Update Service';
    cancelBtn.style.display = 'inline-block';
}

cancelBtn.addEventListener('click', resetForm);

function resetForm() {
    serviceIdInput.value = '';
    titleInput.value = '';
    descInput.value = '';
    saveBtn.innerText = 'Add Service';
    cancelBtn.style.display = 'none';
}

function showStatus(msg, isError) {
    statusMsg.style.color = isError ? 'red' : 'green';
    statusMsg.innerText = (isError ? '❌ ' : '✅ ') + msg;
    setTimeout(() => { statusMsg.innerText = ''; }, 4000);
}

fetchServices();