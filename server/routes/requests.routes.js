// ==========================================
// routes/requests.routes.js
// Customer Requests routes (Task 7).
// All paths are absolute (start with /api).
// ==========================================

const express = require('express');

const Request = require('../models/Request');
const { authenticateToken, authorize } = require('../middleware/auth');
const { PERMISSIONS } = require('../utils/permissions');

const router = express.Router();

// ==========================================
// POST /api/requests  (Customer)
// Submit a new service request.
// ==========================================
router.post(
    '/api/requests',
    authenticateToken,
    authorize(PERMISSIONS.REQUESTS_CREATE_OWN),
    async (req, res) => {
        try {
            const { title, description } = req.body;
            if (!title?.trim() || !description?.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Title and description are required.'
                });
            }
            const newReq = await Request.create({
                userId: req.user.id,
                title: title.trim(),
                description: description.trim()
            });
            return res.status(201).json({
                success: true,
                message: 'Request submitted successfully!',
                data: newReq
            });
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: 'Server error while submitting request.',
                error: err.message
            });
        }
    }
);

// ==========================================
// GET /api/user/requests  (Customer - own only)
// List the authenticated user's requests.
// ==========================================
router.get(
    '/api/user/requests',
    authenticateToken,
    authorize(PERMISSIONS.REQUESTS_READ_OWN),
    async (req, res) => {
        try {
            const list = await Request.find({ userId: req.user.id })
                .sort({ createdAt: -1 });
            return res.json({ success: true, data: list });
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: 'Server error fetching requests.',
                error: err.message
            });
        }
    }
);

// ==========================================
// GET /api/admin/requests  (Admin / Employee)
// List all requests across users.
// ==========================================
router.get(
    '/api/admin/requests',
    authenticateToken,
    authorize(PERMISSIONS.REQUESTS_READ_ALL),
    async (req, res) => {
        try {
            const list = await Request.find()
                .populate('userId', 'name email')
                .sort({ createdAt: -1 });
            return res.json({ success: true, data: list });
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: 'Server error fetching all requests.',
                error: err.message
            });
        }
    }
);

// ==========================================
// PUT /api/admin/requests/:id/status  (Admin / Employee)
// Update a request's status.
// ==========================================
router.put(
    '/api/admin/requests/:id/status',
    authenticateToken,
    authorize(PERMISSIONS.REQUESTS_UPDATE_STATUS),
    async (req, res) => {
        try {
            const { status } = req.body;
            const valid = ['Pending', 'In Progress', 'Completed', 'Rejected'];
            if (!status || !valid.includes(status)) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid or missing status value.'
                });
            }
            const updated = await Request.findByIdAndUpdate(
                req.params.id,
                { status },
                { new: true, runValidators: true }
            );
            if (!updated) {
                return res.status(404).json({
                    success: false,
                    message: 'Request not found.'
                });
            }
            return res.json({
                success: true,
                message: 'Request status updated successfully!',
                data: updated
            });
        } catch (err) {
            return res.status(500).json({
                success: false,
                message: 'Server error updating request status.',
                error: err.message
            });
        }
    }
);

module.exports = router;