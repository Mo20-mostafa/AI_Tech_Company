document.addEventListener('DOMContentLoaded', () => {
    fetchServices();

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

async function fetchServices() {
    try {
        const response = await fetch('http://localhost:5000/api/services');
        const result = await response.json();
        let servicesList = result.data || result;

        if (Array.isArray(servicesList) && servicesList.length === 0) {
            const initialServices = [
                {
                    title: "Streaming AI Engine",
                    description: "Real-time server-sent events for instant text & code generation."
                },
                {
                    title: "Multi-Modal Processing",
                    description: "Analyze text, visual documents, and raw datasets in milliseconds."
                },
                {
                    title: "Enterprise Security",
                    description: "JWT-based multi-layer access control with scalable API infrastructure."
                }
            ];

            for (const service of initialServices) {
                await fetch('http://localhost:5000/api/services', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(service)
                });
            }

            const reFetch = await fetch('http://localhost:5000/api/services');
            const reResult = await reFetch.json();
            servicesList = reResult.data || reResult;
        }

        const container = document.getElementById('servicesContainer') || document.querySelector('.services-grid');

        if (container && Array.isArray(servicesList)) {
            container.innerHTML = servicesList.map(service => `
                <div class="service-card">
                    <h3>${service.title}</h3>
                    <p>${service.description}</p>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error fetching services:', error);
    }
}