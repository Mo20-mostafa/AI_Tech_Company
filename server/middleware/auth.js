// ==========================================
// middleware/auth.js
// Authentication & authorization middlewares (Tasks 4, 9).
// ==========================================

const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Verify JWT token and attach `req.user` with id, email, role, permissions.
 * Returns 401 if no token, 403 if invalid/expired.
 */
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access denied. Authentication token required.'
        });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
        const user = await User.findById(decoded.id).select('-password');

        if (!user || user.isActive === false) {
            return res.status(403).json({
                success: false,
                message: 'Invalid or expired token.'
            });
        }

        req.user = {
            id: user._id.toString(),
            email: user.email,
            role: user.role,
            permissions: user.permissions || []
        };
        next();
    } catch (err) {
        return res.status(403).json({
            success: false,
            message: 'Invalid or expired token.'
        });
    }
};

/**
 * Require the user to have the 'admin' role.
 */
const requireAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') return next();
    return res.status(403).json({
        success: false,
        message: 'Access denied. Admin credentials required.'
    });
};

/**
 * Require the user to have specific permission(s).
 * Admins bypass this check automatically.
 * @param {string|string[]} required - Permission(s) needed.
 */
const authorize = (required) => (req, res, next) => {
    const needed = Array.isArray(required) ? required : [required];
    const userPerms = (req.user && req.user.permissions) || [];

    if (req.user && req.user.role === 'admin') return next();

    const ok = needed.every(p => userPerms.includes(p));
    if (!ok) {
        return res.status(403).json({
            success: false,
            message: 'Access denied. Insufficient permissions.'
        });
    }
    next();
};

module.exports = {
    authenticateToken,
    requireAdmin,
    authorize
};