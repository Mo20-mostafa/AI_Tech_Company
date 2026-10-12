// ==========================================
// models/File.js
// File metadata model (Task 10).
// The actual file lives on disk; this stores metadata only.
// ==========================================

const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    originalName: { type: String, required: true }, // e.g. "contract.pdf"
    storedName: { type: String, required: true },   // e.g. "1712345-abc123.pdf"
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },         // in bytes
    path: { type: String, required: true },         // full path on disk
    uploadedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('File', fileSchema);