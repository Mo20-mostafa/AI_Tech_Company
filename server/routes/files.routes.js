// ==========================================
// routes/files.routes.js
// File & Document Management routes (Task 10).
// All paths are absolute (start with /api).
// ==========================================

const express = require('express');
const fs = require('fs');

const File = require('../models/File');
const { authenticateToken, authorize } = require('../middleware/auth');
const { uploadSingle } = require('../middleware/upload');
const { formatBytes } = require('../utils/helpers');
const { PERMISSIONS } = require('../utils/permissions');

const router = express.Router();

// ==========================================
// POST /api/files  (Authenticated user)
// Upload a file — metadata stored in DB, file saved on disk.
// ==========================================
router.post(
    '/api/files',
    authenticateToken,
    uploadSingle,
    async (req, res) => {
        try {
            const { originalname, filename, mimetype, size, path: filePath } = req.file;

            const record = await File.create({
                userId: req.user.id,
                originalName: originalname,
                storedName: filename,
                mimeType: mimetype,
                size,
                path: filePath
            });

            return res.status(201).json({
                success: true,
                message: 'File uploaded successfully!',
                data: {
                    id: record._id,
                    originalName: record.originalName,
                    mimeType: record.mimeType,
                    size: record.size,
                    sizeHuman: formatBytes(record.size),
                    uploadedAt: record.uploadedAt,
                    url: `/uploads/${record.storedName}`
                }
            });
        } catch (err) {
            // Best-effort cleanup if DB write failed after disk write succeeded
            if (req.file && req.file.path) {
                fs.unlink(req.file.path, () => {});
            }
            return res.status(500).json({
                success: false,
                message: 'Server error saving file metadata.'
            });
        }
    }
);

// ==========================================
// GET /api/user/files  (Authenticated user)
// List the current user's own files.
// ==========================================
router.get(
    '/api/user/files',
    authenticateToken,
    async (req, res) => {
        try {
            const files = await File.find({ userId: req.user.id })
                .sort({ uploadedAt: -1 });
            const data = files.map(f => ({
                id: f._id,
                originalName: f.originalName,
                mimeType: f.mimeType,
                size: f.size,
                sizeHuman: formatBytes(f.size),
                uploadedAt: f.uploadedAt,
                url: `/uploads/${f.storedName}`
            }));
            return res.json({ success: true, data });
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
);

// ==========================================
// DELETE /api/user/files/:id  (Owner only)
// Delete own file (removes from disk + DB).
// ==========================================
router.delete(
    '/api/user/files/:id',
    authenticateToken,
    async (req, res) => {
        try {
            const file = await File.findById(req.params.id);
            if (!file) {
                return res.status(404).json({
                    success: false,
                    message: 'File not found.'
                });
            }

            if (file.userId.toString() !== req.user.id) {
                return res.status(403).json({
                    success: false,
                    message: 'Access denied. You can only delete your own files.'
                });
            }

            // Best-effort disk cleanup
            fs.unlink(file.path, (err) => {
                if (err) console.warn('Could not delete file from disk:', err.message);
            });

            await File.findByIdAndDelete(req.params.id);

            return res.json({
                success: true,
                message: 'File deleted successfully!'
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
);

// ==========================================
// GET /api/files  (Admin / Employee)
// List all files uploaded by any user.
// ==========================================
router.get(
    '/api/files',
    authenticateToken,
    authorize(PERMISSIONS.FILES_READ_ALL),
    async (req, res) => {
        try {
            const files = await File.find()
                .populate('userId', 'name email')
                .sort({ uploadedAt: -1 });

            const data = files.map(f => ({
                id: f._id,
                originalName: f.originalName,
                mimeType: f.mimeType,
                size: f.size,
                sizeHuman: formatBytes(f.size),
                uploadedAt: f.uploadedAt,
                url: `/uploads/${f.storedName}`,
                owner: f.userId ? {
                    id: f.userId._id,
                    name: f.userId.name,
                    email: f.userId.email
                } : null
            }));

            return res.json({ success: true, data });
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
);

// ==========================================
// DELETE /api/files/:id  (Admin only)
// Delete any file.
// ==========================================
router.delete(
    '/api/files/:id',
    authenticateToken,
    authorize(PERMISSIONS.FILES_DELETE_ANY),
    async (req, res) => {
        try {
            const file = await File.findById(req.params.id);
            if (!file) {
                return res.status(404).json({
                    success: false,
                    message: 'File not found.'
                });
            }

            fs.unlink(file.path, (err) => {
                if (err) console.warn('Could not delete file from disk:', err.message);
            });

            await File.findByIdAndDelete(req.params.id);
            return res.json({
                success: true,
                message: 'File deleted successfully!'
            });
        } catch (err) {
            return res.status(500).json({ success: false, message: err.message });
        }
    }
);

module.exports = router;