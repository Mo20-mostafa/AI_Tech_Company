// ==========================================
// server.js
// Nexus AI — Integrated Full-Stack Backend
// Entry point: wires everything together.
// ==========================================

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const path = require('path');

// ==========================================
// DATABASE
// ==========================================
const { connectDB } = require('./config/db');

// ==========================================
// MIDDLEWARE (for uploads static serving)
// ==========================================
const { UPLOADS_DIR } = require('./middleware/upload');

// ==========================================
// ROUTES
// ==========================================
const authRoutes = require('./routes/auth.routes');
const contactRoutes = require('./routes/contact.routes');
const servicesRoutes = require('./routes/services.routes');
const requestsRoutes = require('./routes/requests.routes');
const rolesRoutes = require('./routes/roles.routes');
const usersRoutes = require('./routes/users.routes');
const filesRoutes = require('./routes/files.routes');
const projectsRoutes = require('./routes/projects.routes');

// ==========================================
// APP SETUP
// ==========================================
const app = express();

// Global middlewares
app.use(cors());
app.use(express.json());

// Serve uploaded files statically
app.use('/uploads', express.static(UPLOADS_DIR));

// ==========================================
// ROOT HEALTH CHECK
// ==========================================
app.get('/', (req, res) => {
    res.send('Nexus AI Integrated Backend Service is Running Smoothly.');
});

// ==========================================
// API ROUTES
// Each router carries its own absolute paths (e.g. /api/login).
// ==========================================
app.use(authRoutes);
app.use(contactRoutes);
app.use(servicesRoutes);
app.use(requestsRoutes);
app.use(rolesRoutes);
app.use(usersRoutes);
app.use(filesRoutes);
app.use(projectsRoutes);

// ==========================================
// 404 HANDLER (for unknown API routes)
// ==========================================
app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route not found: ${req.method} ${req.originalUrl}`
    });
});

// ==========================================
// GLOBAL ERROR HANDLER
// ==========================================
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
        success: false,
        message: 'Internal server error.'
    });
});

// ==========================================
// SERVER BOOT
// ==========================================
const PORT = process.env.PORT || 5000;

// Connect to DB first, then start the server.
connectDB().then(() => {
    app.listen(PORT, () => {
        console.log(`Nexus AI Server online and listening on http://localhost:${PORT}`);
    });
});