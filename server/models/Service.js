// ==========================================
// models/Service.js
// Company Service model (Tasks 3, 6, 8).
// ==========================================

const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Service', serviceSchema);