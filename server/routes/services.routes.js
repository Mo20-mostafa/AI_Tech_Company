// ==========================================
// routes/services.routes.js
// Services CRUD + Search/Filter (Tasks 3, 6, 8).
// All paths are absolute (start with /api).
// ==========================================

const express = require('express');

const Service = require('../models/Service');
const { authenticateToken, authorize } = require('../middleware/auth');
const { PERMISSIONS } = require('../utils/permissions');

const router = express.Router();

// ==========================================
// GET /api/services  (Public)
// List services with optional search + sort.
// Query params:
//   - search  : matches title or description (case-insensitive)
//   - sortBy  : 'title_asc' | 'title_desc' | 'oldest' (default: newest)
// ==========================================
router.get('/api/services', async (req, res) => {
    try {
        const { search, sortBy } = req.query;
        const filter = {};

        if (search && search.trim() !== '') {
            const rx = new RegExp(search.trim(), 'i');
            filter.$or = [{ title: rx }, { description: rx }];
        }

        let sort = { createdAt: -1 };
        if (sortBy === 'title_asc') sort = { title: 1 };
        else if (sortBy === 'title_desc') sort = { title: -1 };
        else if (sortBy === 'oldest') sort = { createdAt: 1 };

        const services = await Service.find(filter).sort(sort);
        return res.json({ success: true, data: services });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// ==========================================
// POST /api/services  (Admin / Employee)
// Create a new service.
// ==========================================
router.post(
    '/api/services',
    authenticateToken,
    authorize(PERMISSIONS.SERVICES_CREATE),
    async (req, res) => {
        try {
            const { title, description } = req.body;
            if (!title?.trim() || !description?.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Title and Description are required.'
                });
            }
            const service = await Service.create({
                title: title.trim(),
                description: description.trim()
            });
            return res.status(201).json({
                success: true,
                data: service,
                message: 'New service created successfully!'
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
);

// ==========================================
// PUT /api/services/:id  (Admin / Employee)
// Update an existing service.
// ==========================================
router.put(
    '/api/services/:id',
    authenticateToken,
    authorize(PERMISSIONS.SERVICES_UPDATE),
    async (req, res) => {
        try {
            const { title, description } = req.body;
            const updated = await Service.findByIdAndUpdate(
                req.params.id,
                {
                    title: title?.trim(),
                    description: description?.trim()
                },
                { new: true, runValidators: true }
            );
            if (!updated) {
                return res.status(404).json({
                    success: false,
                    message: 'Service not found.'
                });
            }
            return res.json({
                success: true,
                data: updated,
                message: 'Service updated successfully!'
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
);

// ==========================================
// DELETE /api/services/:id  (Admin only)
// Delete a service.
// ==========================================
router.delete(
    '/api/services/:id',
    authenticateToken,
    authorize(PERMISSIONS.SERVICES_DELETE),
    async (req, res) => {
        try {
            const deleted = await Service.findByIdAndDelete(req.params.id);
            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    message: 'Service not found.'
                });
            }
            return res.json({
                success: true,
                message: 'Service deleted successfully!'
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
);

module.exports = router;