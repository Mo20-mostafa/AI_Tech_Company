// ==========================================
// routes/roles.routes.js
// Roles management routes (Task 9).
// All paths are absolute (start with /api).
// ==========================================

const express = require('express');

const Role = require('../models/Role');
const { authenticateToken, authorize } = require('../middleware/auth');
const { PERMISSIONS } = require('../utils/permissions');

const router = express.Router();

// ==========================================
// GET /api/roles  (Admin / Employee)
// List all roles.
// ==========================================
router.get(
    '/api/roles',
    authenticateToken,
    authorize(PERMISSIONS.ROLES_READ),
    async (req, res) => {
        try {
            const roles = await Role.find().sort({ name: 1 });
            return res.json({ success: true, data: roles });
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
);

// ==========================================
// POST /api/roles  (Admin)
// Create a custom role.
// ==========================================
router.post(
    '/api/roles',
    authenticateToken,
    authorize(PERMISSIONS.ROLES_CREATE),
    async (req, res) => {
        try {
            const { name, displayName, description, permissions } = req.body;
            if (!name?.trim() || !displayName?.trim()) {
                return res.status(400).json({
                    success: false,
                    message: 'Name and displayName are required.'
                });
            }
            const exists = await Role.findOne({ name: name.trim().toLowerCase() });
            if (exists) {
                return res.status(400).json({
                    success: false,
                    message: 'Role already exists.'
                });
            }

            const role = await Role.create({
                name: name.trim().toLowerCase(),
                displayName: displayName.trim(),
                description: description || '',
                permissions: Array.isArray(permissions) ? permissions : [],
                isSystem: false
            });
            return res.status(201).json({
                success: true,
                message: 'Role created successfully!',
                data: role
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
);

// ==========================================
// PUT /api/roles/:id  (Admin)
// Update a role (system roles can only update display/description).
// ==========================================
router.put(
    '/api/roles/:id',
    authenticateToken,
    authorize(PERMISSIONS.ROLES_UPDATE),
    async (req, res) => {
        try {
            const role = await Role.findById(req.params.id);
            if (!role) {
                return res.status(404).json({
                    success: false,
                    message: 'Role not found.'
                });
            }

            const { displayName, description, permissions } = req.body;
            if (displayName) role.displayName = displayName;
            if (description !== undefined) role.description = description;
            if (Array.isArray(permissions) && !role.isSystem) {
                role.permissions = permissions;
            }

            await role.save();
            return res.json({
                success: true,
                message: 'Role updated successfully!',
                data: role
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
);

// ==========================================
// DELETE /api/roles/:id  (Admin)
// Delete a custom role (system roles are protected).
// ==========================================
router.delete(
    '/api/roles/:id',
    authenticateToken,
    authorize(PERMISSIONS.ROLES_DELETE),
    async (req, res) => {
        try {
            const role = await Role.findById(req.params.id);
            if (!role) {
                return res.status(404).json({
                    success: false,
                    message: 'Role not found.'
                });
            }
            if (role.isSystem) {
                return res.status(400).json({
                    success: false,
                    message: 'Cannot delete system roles.'
                });
            }

            await Role.findByIdAndDelete(req.params.id);
            return res.json({
                success: true,
                message: 'Role deleted successfully!'
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
);

module.exports = router;