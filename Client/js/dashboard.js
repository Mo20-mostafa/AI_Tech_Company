// Base API endpoint configuration
const API_URL = 'http://localhost:5000/api';

document.addEventListener('DOMContentLoaded', () => {
    // 1. Verify user authentication status
    verifyUserAuth();

    // 2. Fetch and render user contact messages / submissions
    loadContactMessages();
});

/**
 * Verifies that the user has a valid stored JWT token before accessing the dashboard.
 */
function verifyUserAuth() {
    const token = localStorage.getItem('token');

    if (!token) {
        alert('Authentication required. Please log in first.');
        window.location.href = 'login.html';
    }
}

/**
 * Returns Request Headers with Bearer JWT Authorization token.
 */
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
}

/**
 * Fetches saved contact inquiries from server and renders them dynamically.
 */
async function loadContactMessages() {
    const messagesContainer = document.getElementById('messages-list') 
        || document.getElementById('contactMessages') 
        || document.getElementById('messagesContainer');

    if (!messagesContainer) return;

    try {
        const response = await fetch(`${API_URL}/contact`, {
            headers: getAuthHeaders()
        });

        const result = await response.json();
        const messages = result.data || (Array.isArray(result) ? result : []);

        if (messages.length === 0) {
            messagesContainer.innerHTML = '<p style="text-align: center; color: #666;">No contact inquiries found.</p>';
            return;
        }

        messagesContainer.innerHTML = messages.map(msg => `
            <div class="message-card card" style="margin-bottom: 15px; padding: 15px; border: 1px solid #e0e0e0; border-radius: 6px; background-color: #fff;">
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f0f0f0; padding-bottom: 8px; margin-bottom: 10px;">
                    <h3 style="margin: 0; font-size: 1.1rem; color: #333;">${escapeHTML(msg.subject || 'No Subject')}</h3>
                    <small style="color: #888;">${new Date(msg.createdAt || Date.now()).toLocaleDateString()}</small>
                </div>
                <p style="margin: 5px 0;"><strong>From:</strong> ${escapeHTML(msg.name)} (&lt;a href="mailto:${escapeHTML(msg.email)}"&gt;${escapeHTML(msg.email)}&lt;/a&gt;)</p>
                <p style="margin: 10px 0; color: #444; line-height: 1.5;">${escapeHTML(msg.message)}</p>
                <div style="margin-top: 10px; text-align: right;">
                    <button onclick="deleteContactMessage('${msg._id}')" class="btn btn-danger" style="background-color: #d9534f; color: #fff; padding: 5px 12px; border: none; border-radius: 4px; cursor: pointer;">Delete</button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error fetching contact messages:', error);
        messagesContainer.innerHTML = '<p style="text-align: center; color: red;">Failed to load messages. Please ensure server is active.</p>';
    }
}

/**
 * Sends DELETE request to remove a specific contact message entry.
 */
async function deleteContactMessage(id) {
    if (!confirm('Are you sure you want to delete this message?')) return;

    try {
        const response = await fetch(`${API_URL}/contact/${id}`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });

        const result = await response.json();

        if (response.ok && result.success) {
            alert(result.message || 'Message deleted successfully.');
            loadContactMessages();
        } else {
            alert(result.message || result.error || 'Failed to delete message.');
        }
    } catch (error) {
        console.error('Error deleting contact message:', error);
        alert('Server error occurred during deletion.');
    }
}

/**
 * Helper function to prevent XSS vulnerability by escaping HTML strings.
 */
function escapeHTML(str) {
    if (!str) return '';
    return str.replace(/[&<>'"]/g, 
        tag => ({
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            "'": '&#39;',
            '"': '&quot;'
        }[tag] || tag)
    );
}