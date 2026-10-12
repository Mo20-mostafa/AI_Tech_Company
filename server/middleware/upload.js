// ==========================================
// middleware/upload.js
// Multer configuration for file uploads (Task 10).
// ==========================================

const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { formatBytes } = require('../utils/helpers');

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    console.log('==> uploads/ directory created');
}

// Allowed file types (images + documents only)
const ALLOWED_MIME_TYPES = [
    'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain'
];

// Max file size: 10 MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Storage: unique random filename on disk (original name kept in DB)
const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
        const uniqueName =
            `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

// File filter — reject anything not in the allow-list
const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return cb(null, true);
    }
    cb(new Error(
        'File type not allowed. Please upload an image or document ' +
        '(pdf, doc, docx, xls, xlsx, ppt, pptx, txt).'
    ));
};

// Configure multer
const upload = multer({
    storage: fileStorage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter
});

/**
 * Wrap multer's single-file upload and translate errors into JSON responses.
 * Expects the file field to be named "file".
 */
const uploadSingle = (req, res, next) => {
    upload.single('file')(req, res, (err) => {
        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return res.status(400).json({
                    success: false,
                    message: `File too large. Max size is ${formatBytes(MAX_FILE_SIZE)}.`
                });
            }
            return res.status(400).json({ success: false, message: err.message });
        }
        if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }
        if (!req.file) {
            return res.status(400).json({
                success: false,
                message: 'No file uploaded. Please choose a file.'
            });
        }
        next();
    });
};

module.exports = {
    UPLOADS_DIR,
    uploadSingle
};