// ==========================================
// routes/contact.routes.js
// Contact / Inquiry routes (Task 2).
// All paths are absolute (start with /api).
// ==========================================

const express = require('express');

const Inquiry = require('../models/Inquiry');
const { authenticateToken, authorize } = require('../middleware/auth');
const { emailRegex } = require('../utils/helpers');
const { PERMISSIONS } = require('../utils/permissions');

const router = express.Router();

// ==========================================
// POST /api/contact  (Public)
// Submit a new inquiry from the contact form.
// ==========================================
router.post('/api/contact', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
            return res.status(400).json({
                success: false,
                message: 'All fields are mandatory.'
            });
        }
        if (!emailRegex.test(email.trim())) {
            return res.status(400).json({
                success: false,
                message: 'Please enter a valid email address.'
            });
        }

        await Inquiry.create({
            name: name.trim(),
            email: email.trim(),
            subject: subject.trim(),
            message: message.trim()
        });

        return res.status(201).json({
            success: true,
            message: 'Thank you! Your inquiry has been submitted successfully.'
        });
    } catch (error) {
        return res.status(500).json({
            success: false,
            message: 'Server error processing inquiry.'
        });
    }
});

// ==========================================
// GET /api/inquiries  (Admin / Employee)
// List all inquiries, newest first.
// ==========================================
router.get(
    '/api/inquiries',
    authenticateToken,
    authorize(PERMISSIONS.INQUIRIES_READ),
    async (req, res) => {
        try {
            const inquiries = await Inquiry.find().sort({ createdAt: -1 });
            return res.json({ success: true, data: inquiries });
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
);

module.exports = router;