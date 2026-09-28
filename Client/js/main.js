/* ==========================================
   NEXUS AI - Main Client Application Logic
   Handles dynamic service rendering, search/filtering,
   demo simulation, and public contact form submissions.
   ========================================== */

document.addEventListener('DOMContentLoaded', () => {
    // 1. Fetch and render public company services dynamically on initial load
    fetchServices();

    // 2. Task 8: Real-time Search & Sorting Event Listeners for Public Visitors
    const searchInput = document.getElementById('publicSearchInput') || document.getElementById('searchInput');
    const sortSelect = document.getElementById('publicSortSelect') || document.getElementById('sortSelect');

    if (searchInput) {
        searchInput.addEventListener('input', debounce(() => {
            fetchServices();
        }, 300));
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', () => {
            fetchServices();
        });
    }

    // ==========================================
    // INTERACTIVE MODEL DEMO FEATURE
    // ==========================================
    const runDemoBtn = document.getElementById('runDemoBtn');
    const demoOutput = document.getElementById('demoOutput');

    if (runDemoBtn && demoOutput) {
        runDemoBtn.addEventListener('click', () => {
            demoOutput.textContent = '';
            const textToStream = "NEXUS AI System initialized. Processing prompt... Stream connected successfully.";
            let index = 0;
            runDemoBtn.disabled = true;

            const interval = setInterval(() => {
                if (index < textToStream.length) {
                    demoOutput.textContent += textToStream.charAt(index);
                    index++;
                } else {
                    clearInterval(interval);
                    runDemoBtn.disabled = false;
                }
            }, 30);
        });
    }

    // ==========================================
    // PUBLIC CONTACT INQUIRY FORM (TASK 2)
    // ==========================================
    const contactForm = document.getElementById('contactForm') || document.querySelector('form');
    const responseMsg = document.getElementById('responseMessage');

    if (contactForm) {
        contactForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const originalBtnText = submitBtn ? submitBtn.innerText : 'Send';

            const formData = {
                name: document.getElementById('name')?.value || contactForm.querySelector('[name="name"]')?.value,
                email: document.getElementById('email')?.value || contactForm.querySelector('[name="email"]')?.value,
                subject: document.getElementById('subject')?.value || contactForm.querySelector('[name="subject"]')?.value,
                message: document.getElementById('message')?.value || contactForm.querySelector('[name="message"]')?.value
            };

            if (responseMsg) {
                responseMsg.style.color = '#555';
                responseMsg.innerText = 'Sending...';
            }

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerText = 'Sending...';
            }

            try {
                const response = await fetch('http://localhost:5000/api/contact', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });

                const data = await response.json();

                if (response.ok) {
                    if (responseMsg) {
                        responseMsg.style.color = 'green';
                        responseMsg.innerText = '✅ ' + (data.message || 'Submitted successfully!');
                    }
                    contactForm.reset();
                } else {
                    const errorText = data.error || data.message || 'Failed to submit.';
                    if (responseMsg) {
                        responseMsg.style.color = 'red';
                        responseMsg.innerText = '❌ Error: ' + errorText;
                    }
                }
            } catch (error) {
                if (responseMsg) {
                    responseMsg.style.color = 'red';
                    responseMsg.innerText = '❌ Connection failed! Make sure node server is running.';
                }
            } finally {
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerText = originalBtnText;
                }
            }
        });
    }
});

// ==========================================
// DYNAMIC PUBLIC SERVICES FETCHING & BACKEND SEARCH/FILTERING (TASK 8)
// ==========================================
/**
 * Fetches company services dynamically from the backend API with optional search and sort queries.
 */
async function fetchServices() {
    try {
        const searchVal = (document.getElementById('publicSearchInput') || document.getElementById('searchInput'))?.value || '';
        const sortVal = (document.getElementById('publicSortSelect') || document.getElementById('sortSelect'))?.value || 'newest';

        const queryParams = new URLSearchParams({
            search: searchVal,
            sortBy: sortVal
        });

        const response = await fetch(`http://localhost:5000/api/services?${queryParams.toString()}`);
        const result = await response.json();
        
        const servicesList = result.data || (Array.isArray(result) ? result : []);

        const container = document.getElementById('servicesContainer') 
            || document.getElementById('public-services-list') 
            || document.querySelector('.services-grid');

        if (container) {
            if (servicesList.length === 0) {
                container.innerHTML = '<p style="text-align: center; grid-column: 1/-1; color: #666;">No services match your search terms.</p>';
                return;
            }

            container.innerHTML = servicesList.map(service => `
                <div class="service-card card">
                    <h3>${escapeHTML(service.title)}</h3>
                    <p>${escapeHTML(service.description)}</p>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error fetching public services:', error);
    }
}

/**
 * Helper utility to sanitize and escape HTML strings to prevent XSS.
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

// Utility Function for Performance Debouncing
function debounce(func, delay = 300) {
    let timeout;
    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), delay);
    };
}