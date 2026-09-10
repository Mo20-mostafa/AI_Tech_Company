document.addEventListener('DOMContentLoaded', () => {
    // 1. Interactive Demo Section
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

    // 2. Contact Form Integration & Backend Validation UI
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
                    } else {
                        alert('✅ ' + (data.message || 'Submitted successfully!'));
                    }
                    contactForm.reset();
                } else {
                    // عرض خطأ الـ Validation القادم من Backend (مثل إيميل خاطئ أو حقول فارغة)
                    const errorText = data.error || data.message || 'Failed to submit.';
                    if (responseMsg) {
                        responseMsg.style.color = 'red';
                        responseMsg.innerText = '❌ Error: ' + errorText;
                    } else {
                        alert('❌ Error: ' + errorText);
                    }
                }
            } catch (error) {
                if (responseMsg) {
                    responseMsg.style.color = 'red';
                    responseMsg.innerText = '❌ Connection failed! Make sure node server is running.';
                } else {
                    alert('❌ Connection failed! Make sure node server is running.');
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