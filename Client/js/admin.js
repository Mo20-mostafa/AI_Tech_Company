const API_URL = 'http://localhost:5000/api';
const token = localStorage.getItem('token');

if (!token) {
    window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    const navLinks = document.querySelector('.nav-links');
    if (navLinks) {
        const logoutLi = document.createElement('li');
        logoutLi.innerHTML = '<a href="#" id="logout-btn" style="color: #f44336;">Logout</a>';
        navLinks.appendChild(logoutLi);

        document.getElementById('logout-btn').addEventListener('click', (e) => {
            e.preventDefault();
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = 'login.html';
        });
    }

    loadServices();
    loadInquiries();

    const serviceForm = document.getElementById('service-form');
    if (serviceForm) {
        serviceForm.addEventListener('submit', handleServiceSubmit);
    }
});

async function loadServices() {
    try {
        const res = await fetch(`${API_URL}/services`);
        const result = await res.json();
        const services = result.data || [];
        const container = document.getElementById('services-list');
        if (!container) return;

        container.innerHTML = '';
        services.forEach(service => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <h3>${service.title}</h3>
                <p>${service.description}</p>
                <div style="margin-top: 15px;">
                    <button class="btn btn-outline" onclick="editService('${service._id}', '${service.title}', '${service.description}')">Edit</button>
                    <button class="btn btn-primary" style="background-color: #f44336;" onclick="deleteService('${service._id}')">Delete</button>
                </div>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error(err);
    }
}

async function loadInquiries() {
    try {
        const res = await fetch(`${API_URL}/inquiries`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            return;
        }

        const inquiries = await res.json();
        const container = document.getElementById('inquiries-list');
        if (!container) return;

        container.innerHTML = '';
        inquiries.forEach(inq => {
            const card = document.createElement('div');
            card.className = 'card';
            card.innerHTML = `
                <h3>${inq.subject}</h3>
                <p><strong>From:</strong> ${inq.name} (${inq.email})</p>
                <p>${inq.message}</p>
                <small>${new Date(inq.createdAt).toLocaleString()}</small>
            `;
            container.appendChild(card);
        });
    } catch (err) {
        console.error(err);
    }
}

async function handleServiceSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('service-id').value;
    const title = document.getElementById('service-title').value;
    const description = document.getElementById('service-desc').value;

    const method = id ? 'PUT' : 'POST';
    const url = id ? `${API_URL}/services/${id}` : `${API_URL}/services`;

    try {
        const res = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ title, description })
        });

        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            return;
        }

        if (res.ok) {
            document.getElementById('service-form').reset();
            document.getElementById('service-id').value = '';
            loadServices();
        }
    } catch (err) {
        console.error(err);
    }
}

function editService(id, title, description) {
    document.getElementById('service-id').value = id;
    document.getElementById('service-title').value = title;
    document.getElementById('service-desc').value = description;
}

async function deleteService(id) {
    if (!confirm('Are you sure you want to delete this service?')) return;

    try {
        const res = await fetch(`${API_URL}/services/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (res.status === 401 || res.status === 403) {
            localStorage.removeItem('token');
            window.location.href = 'login.html';
            return;
        }

        if (res.ok) {
            loadServices();
        }
    } catch (err) {
        console.error(err);
    }
}