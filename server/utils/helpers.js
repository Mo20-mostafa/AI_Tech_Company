// ==========================================
// utils/helpers.js
// Reusable helper functions used across the backend.
// ==========================================

const bcrypt = require('bcryptjs');

/**
 * Email validation regex.
 * Matches most common email formats (user@domain.tld).
 */
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Detect if a string is already a bcrypt hash.
 * Used for backward compatibility with pre-hashed passwords.
 */
const isHashed = (value) =>
    typeof value === 'string' && /^\$2[aby]\$/.test(value);

/**
 * Hash a plain-text password using bcrypt.
 * @param {string} plain - The plain password.
 * @returns {Promise<string>} The hashed password.
 */
const hashPassword = async (plain) => bcrypt.hash(plain, 10);

/**
 * Compare a plain password against a bcrypt hash.
 * @param {string} plain - The plain password.
 * @param {string} hashed - The stored hash.
 * @returns {Promise<boolean>} True if they match.
 */
const comparePassword = async (plain, hashed) => bcrypt.compare(plain, hashed);

/**
 * Format bytes into a human-readable string (e.g. "1.50 MB").
 * @param {number} bytes
 * @returns {string}
 */
const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

module.exports = {
    emailRegex,
    isHashed,
    hashPassword,
    comparePassword,
    formatBytes
};