// ==========================================
// routes/auth.routes.js
// Authentication routes (Tasks 4 & 5).
// Handles: register, login, password reset, profile.
// All paths are absolute (start with /api).
// ==========================================

const express = require('express');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const Role = require('../models/Role');

const { authenticateToken } = require('../middleware/auth');
const {
    emailRegex,
    isHashed,
    hashPassword,
    comparePassword
} = require('../utils/helpers');

const { PERMISSIONS } = require('../utils/permissions');

const router = express.Router();

// The designated admin email — auto-promoted on register/login.
const ADMIN_EMAIL = 'emostafamamdoh@gmail.com';

// ==========================================
// POST /api/register
// ==========================================
router.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name?.trim() || !email?.trim() || !password?.trim()) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required.'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format provided.'
            });
        }

        const existing = await User.findOne({ email: normalizedEmail });
        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Email address already registered.'
            });
        }

        const targetRole = normalizedEmail === ADMIN_EMAIL ? 'admin' : 'customer';
        const roleDoc = await Role.findOne({ name: targetRole });
        const permissions = roleDoc ? roleDoc.permissions : [];

        await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: await hashPassword(password.trim()),
            role: targetRole,
            permissions
        });

        return res.status(201).json({
            success: true,
            message: 'Account created successfully!'
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// ==========================================
// POST /api/login
// ==========================================
router.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email?.trim() || !password?.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Email and password are required.'
            });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        let valid = false;
        if (isHashed(user.password)) {
            valid = await comparePassword(password.trim(), user.password);
        } else if (user.password === password.trim()) {
            user.password = await hashPassword(password.trim());
            valid = true;
        }

        if (!valid) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email or password.'
            });
        }

        if (normalizedEmail === ADMIN_EMAIL && user.role !== 'admin') {
            const adminRole = await Role.findOne({ name: 'admin' });
            user.role = 'admin';
            user.permissions = adminRole ? adminRole.permissions : Object.values(PERMISSIONS);
        }

        const roleDoc = await Role.findOne({ name: user.role });
        if (roleDoc && JSON.stringify(user.permissions) !== JSON.stringify(roleDoc.permissions)) {
            user.permissions = roleDoc.permissions;
        }
        await user.save();

        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'secretkey',
            { expiresIn: '2h' }
        );

        return res.json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                permissions: user.permissions
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// ==========================================
// POST /api/reset-password
// ==========================================
router.post('/api/reset-password', async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        if (!email?.trim() || !newPassword?.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Email and new password are required.'
            });
        }

        const user = await User.findOne({ email: email.trim().toLowerCase() });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User account not found.'
            });
        }

        user.password = await hashPassword(newPassword.trim());
        await user.save();

        return res.json({
            success: true,
            message: 'Password reset successfully!'
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// ==========================================
// GET /api/user/profile
// ==========================================
router.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User account not found.'
            });
        }
        return res.json({ success: true, user });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// ==========================================
// PUT /api/user/profile
// ==========================================
router.put('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name?.trim() || !email?.trim()) {
            return res.status(400).json({
                success: false,
                message: 'Name and email are required.'
            });
        }
        if (!emailRegex.test(email.trim())) {
            return res.status(400).json({
                success: false,
                message: 'Please provide a valid email.'
            });
        }

        const dup = await User.findOne({
            email: email.trim().toLowerCase(),
            _id: { $ne: req.user.id }
        });
        if (dup) {
            return res.status(400).json({
                success: false,
                message: 'Email address is already in use.'
            });
        }

        const updateData = {
            name: name.trim(),
            email: email.trim().toLowerCase()
        };
        if (password && password.trim().length > 0) {
            updateData.password = await hashPassword(password.trim());
        }

        const updated = await User.findByIdAndUpdate(req.user.id, updateData, {
            new: true,
            runValidators: true
        }).select('-password');

        return res.json({
            success: true,
            message: 'Profile details updated successfully!',
            user: updated
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

module.exports = router;