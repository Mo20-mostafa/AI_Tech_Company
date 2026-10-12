// ==========================================
// routes/users.routes.js
// Users management routes (Task 9).
// All paths are absolute (start with /api).
// ==========================================

const express = require('express');

const User = require('../models/User');
const Role = require('../models/Role');
const { authenticateToken, authorize } = require('../middleware/auth');
const { PERMISSIONS } = require('../utils/permissions');

const router = express.Router();

// ==========================================
// GET /api/users  (Admin / Employee)
// List all users (without passwords).
// ==========================================
router.get(
    '/api/users',
    authenticateToken,
    authorize(PERMISSIONS.USERS_READ),
    async (req, res) => {
        try {
            const users = await User.find()
                .select('-password')
                .sort({ createdAt: -1 });
            return res.json({ success: true, data: users });
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
);

// ==========================================
// PUT /api/users/:id/role  (Admin only)
// Assign a new role to a user.
// ==========================================
router.put(
    '/api/users/:id/role',
    authenticateToken,
    authorize(PERMISSIONS.USERS_ASSIGN_ROLE),
    async (req, res) => {
        try {
            const { role } = req.body;
            if (!role) {
                return res.status(400).json({
                    success: false,
                    message: 'Role is required.'
                });
            }

            const roleDoc = await Role.findOne({ name: role });
            if (!roleDoc) {
                return res.status(400).json({
                    success: false,
                    message: 'Role does not exist.'
                });
            }

            const user = await User.findByIdAndUpdate(
                req.params.id,
                { role: roleDoc.name, permissions: roleDoc.permissions },
                { new: true }
            ).select('-password');

            if (!user) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found.'
                });
            }
            return res.json({
                success: true,
                message: 'Role updated successfully!',
                user
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
);

// ==========================================
// DELETE /api/users/:id  (Admin only)
// Delete a user (cannot delete self).
// ==========================================
router.delete(
    '/api/users/:id',
    authenticateToken,
    authorize(PERMISSIONS.USERS_DELETE),
    async (req, res) => {
        try {
            if (req.params.id === req.user.id) {
                return res.status(400).json({
                    success: false,
                    message: 'You cannot delete your own account.'
                });
            }
            const deleted = await User.findByIdAndDelete(req.params.id);
            if (!deleted) {
                return res.status(404).json({
                    success: false,
                    message: 'User not found.'
                });
            }
            return res.json({
                success: true,
                message: 'User deleted successfully!'
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
);

module.exports = router;