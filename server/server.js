require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

const app = express();

// ==========================================
// GLOBAL MIDDLEWARES
// ==========================================
app.use(cors());
app.use(express.json());

// Email validation regex
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ==========================================
// TASK 10: FILE UPLOAD SETUP
// ==========================================

// Ensure uploads directory exists
const UPLOADS_DIR = path.join(__dirname, 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
    console.log('==> uploads/ directory created');
}

// Allowed file types for safe upload (images + documents only)
const ALLOWED_MIME_TYPES = [
    // Images
    'image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/webp',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain'
];

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Multer storage — save with a unique random filename (keeps original name in DB)
const fileStorage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${crypto.randomBytes(8).toString('hex')}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

// File filter — reject anything not in the allow-list
const fileFilter = (req, file, cb) => {
    if (ALLOWED_MIME_TYPES.includes(file.mimetype)) {
        return cb(null, true);
    }
    cb(new Error('File type not allowed. Please upload an image or document (pdf, doc, docx, xls, xlsx, ppt, pptx, txt).'));
};

// Configure multer with limits + filter
const upload = multer({
    storage: fileStorage,
    limits: { fileSize: MAX_FILE_SIZE },
    fileFilter
});

// ==========================================
// CENTRAL PERMISSIONS REGISTRY (Task 9 - RBAC)
// Add new permissions here — they propagate everywhere.
// ==========================================
const PERMISSIONS = {
    SERVICES_READ: 'services:read',
    SERVICES_CREATE: 'services:create',
    SERVICES_UPDATE: 'services:update',
    SERVICES_DELETE: 'services:delete',
    INQUIRIES_READ: 'inquiries:read',
    REQUESTS_CREATE_OWN: 'requests:create_own',
    REQUESTS_READ_OWN: 'requests:read_own',
    REQUESTS_READ_ALL: 'requests:read_all',
    REQUESTS_UPDATE_STATUS: 'requests:update_status',
    USERS_READ: 'users:read',
    USERS_ASSIGN_ROLE: 'users:assign_role',
    USERS_DELETE: 'users:delete',
    ROLES_READ: 'roles:read',
    ROLES_CREATE: 'roles:create',
    ROLES_UPDATE: 'roles:update',
    ROLES_DELETE: 'roles:delete',
    // Task 10 — file management
    FILES_READ_ALL: 'files:read_all',
    FILES_DELETE_ANY: 'files:delete_any',
    // Task 11 — project management
    PROJECTS_READ: 'projects:read',
    PROJECTS_CREATE: 'projects:create',
    PROJECTS_UPDATE: 'projects:update',
    PROJECTS_DELETE: 'projects:delete',
    PROJECTS_ASSIGN: 'projects:assign'
};

// Default roles seeded on boot (source of truth)
const DEFAULT_ROLES = {
    admin: {
        displayName: 'Administrator',
        description: 'Full system access',
        permissions: Object.values(PERMISSIONS)
    },
    employee: {
        displayName: 'Regular Employee',
        description: 'Can read data and update request statuses',
        permissions: [
            PERMISSIONS.SERVICES_READ,
            PERMISSIONS.INQUIRIES_READ,
            PERMISSIONS.REQUESTS_READ_ALL,
            PERMISSIONS.REQUESTS_UPDATE_STATUS,
            PERMISSIONS.USERS_READ,
            PERMISSIONS.FILES_READ_ALL,
            PERMISSIONS.PROJECTS_READ // Task 11
        ]
    },
    customer: {
        displayName: 'Customer',
        description: 'End-user with own-data access',
        permissions: [
            PERMISSIONS.SERVICES_READ,
            PERMISSIONS.REQUESTS_CREATE_OWN,
            PERMISSIONS.REQUESTS_READ_OWN,
            PERMISSIONS.PROJECTS_READ // Task 11 — can view own projects
        ]
    },
    // Task 11 — new role for project team members
    team_member: {
        displayName: 'Team Member',
        description: 'Can view and update assigned projects',
        permissions: [
            PERMISSIONS.SERVICES_READ,
            PERMISSIONS.PROJECTS_READ,
            PERMISSIONS.PROJECTS_UPDATE
        ]
    }
};

// ==========================================
// DATABASE CONNECTION
// ==========================================
const mongoURI = process.env.MONGO_URI
    || "mongodb+srv://20240602_db_user:Password123m@cluster0.erylrox.mongodb.net/nexus_ai?retryWrites=true&w=majority";

mongoose.connect(mongoURI)
    .then(async () => {
        console.log('MongoDB Connected Successfully');
        await seedRoles();     // Seed default roles (idempotent)
        await seedAdminUser(); // Ensure designated admin exists
    })
    .catch((err) => console.error('MongoDB Connection Error:', err));

// ==========================================
// MONGOOSE MODELS
// ==========================================

// Role Model (Task 9)
const roleSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true, lowercase: true, trim: true },
    displayName: { type: String, required: true },
    description: { type: String, default: '' },
    permissions: { type: [String], default: [] },
    isSystem: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});
const Role = mongoose.model('Role', roleSchema);

// User Model (Task 4, 5, 9)
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, default: 'customer' },
    permissions: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// Inquiry Model (Task 2)
const inquirySchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const Inquiry = mongoose.model('Inquiry', inquirySchema);

// Service Model (Task 3, 6, 8)
const serviceSchema = new mongoose.Schema({
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    createdAt: { type: Date, default: Date.now }
});
const Service = mongoose.model('Service', serviceSchema);

// Request Model (Task 7)
const requestSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    status: {
        type: String,
        enum: ['Pending', 'In Progress', 'Completed', 'Rejected'],
        default: 'Pending'
    },
    createdAt: { type: Date, default: Date.now }
});
const Request = mongoose.model('Request', requestSchema);

// File Model (Task 10) — metadata only, actual file on disk
const fileSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    originalName: { type: String, required: true }, // e.g. "contract.pdf"
    storedName: { type: String, required: true },   // e.g. "1712345-abc123.pdf"
    mimeType: { type: String, required: true },
    size: { type: Number, required: true },         // in bytes
    path: { type: String, required: true },         // full path on disk
    uploadedAt: { type: Date, default: Date.now }
});
const File = mongoose.model('File', fileSchema);

// Project Model (Task 11) — client project management
const projectSchema = new mongoose.Schema({
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    status: {
        type: String,
        enum: ['Not Started', 'In Progress', 'Completed', 'On Hold'],
        default: 'Not Started'
    },
    client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    assignedMembers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});
const Project = mongoose.model('Project', projectSchema);

// ==========================================
// HELPERS
// ==========================================

// Detect if a password string is already a bcrypt hash
const isHashed = (value) => typeof value === 'string' && /^\$2[aby]\$/.test(value);

// Hash a plain password
const hashPassword = async (plain) => bcrypt.hash(plain, 10);

// Compare plain vs hash
const comparePassword = async (plain, hashed) => bcrypt.compare(plain, hashed);

// Format bytes to human-readable (e.g. 1.5 MB)
const formatBytes = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};

// ==========================================
// AUTH MIDDLEWARES
// ==========================================

const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access denied. Authentication token required.' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secretkey');
        const user = await User.findById(decoded.id).select('-password');
        if (!user || user.isActive === false) {
            return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
        }
        req.user = {
            id: user._id.toString(),
            email: user.email,
            role: user.role,
            permissions: user.permissions || []
        };
        next();
    } catch (err) {
        return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
    }
};

const requireAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') return next();
    return res.status(403).json({ success: false, message: 'Access denied. Admin credentials required.' });
};

const authorize = (required) => (req, res, next) => {
    const needed = Array.isArray(required) ? required : [required];
    const userPerms = (req.user && req.user.permissions) || [];
    if (req.user && req.user.role === 'admin') return next();
    const ok = needed.every(p => userPerms.includes(p));
    if (!ok) {
        return res.status(403).json({ success: false, message: 'Access denied. Insufficient permissions.' });
    }
    next();
};

// ==========================================
// SEEDERS (idempotent)
// ==========================================

async function seedRoles() {
    try {
        for (const [name, def] of Object.entries(DEFAULT_ROLES)) {
            const existing = await Role.findOne({ name });
            if (!existing) {
                await Role.create({
                    name,
                    displayName: def.displayName,
                    description: def.description,
                    permissions: def.permissions,
                    isSystem: true
                });
                console.log(`==> Role seeded: ${name}`);
            } else {
                existing.displayName = def.displayName;
                existing.description = def.description;
                existing.permissions = def.permissions;
                existing.isSystem = true;
                await existing.save();
            }
        }
    } catch (err) {
        console.error('Error seeding roles:', err.message);
    }
}

async function seedAdminUser() {
    try {
        const adminEmail = 'emostafamamdoh@gmail.com';
        const adminRole = await Role.findOne({ name: 'admin' });
        const adminPerms = adminRole ? adminRole.permissions : Object.values(PERMISSIONS);

        let admin = await User.findOne({ email: adminEmail });

        if (!admin) {
            await User.create({
                name: 'System Admin',
                email: adminEmail,
                password: await hashPassword('admin123'),
                role: 'admin',
                permissions: adminPerms
            });
            console.log(`==> Admin Account Created: ${adminEmail}`);
        } else {
            let changed = false;
            if (admin.role !== 'admin') { admin.role = 'admin'; changed = true; }
            if (JSON.stringify(admin.permissions) !== JSON.stringify(adminPerms)) {
                admin.permissions = adminPerms; changed = true;
            }
            if (changed) { await admin.save(); console.log(`==> Admin refreshed: ${adminEmail}`); }
        }
    } catch (err) {
        console.error('Error seeding admin:', err.message);
    }
}

// ==========================================
// ROOT HEALTH CHECK
// ==========================================
app.get('/', (req, res) => {
    res.send('Nexus AI Integrated Backend Service is Running Smoothly.');
});

// Serve uploaded files statically
app.use('/uploads', express.static(UPLOADS_DIR));

// ==========================================
// TASK 4 & 5: AUTH ROUTES
// ==========================================

app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name?.trim() || !email?.trim() || !password?.trim()) {
            return res.status(400).json({ success: false, message: 'All fields are required.' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({ success: false, message: 'Invalid email format provided.' });
        }

        const existing = await User.findOne({ email: normalizedEmail });
        if (existing) {
            return res.status(400).json({ success: false, message: 'Email address already registered.' });
        }

        const targetRole = normalizedEmail === 'emostafamamdoh@gmail.com' ? 'admin' : 'customer';
        const roleDoc = await Role.findOne({ name: targetRole });
        const permissions = roleDoc ? roleDoc.permissions : [];

        await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: await hashPassword(password.trim()),
            role: targetRole,
            permissions
        });

        return res.status(201).json({ success: true, message: 'Account created successfully!' });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email?.trim() || !password?.trim()) {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid email or password.' });
        }

        let valid = false;
        if (isHashed(user.password)) {
            valid = await comparePassword(password.trim(), user.password);
        } else if (user.password === password.trim()) {
            user.password = await hashPassword(password.trim());
            valid = true;
        }

        if (!valid) {
            return res.status(400).json({ success: false, message: 'Invalid email or password.' });
        }

        if (normalizedEmail === 'emostafamamdoh@gmail.com' && user.role !== 'admin') {
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

app.post('/api/reset-password', async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        if (!email?.trim() || !newPassword?.trim()) {
            return res.status(400).json({ success: false, message: 'Email and new password are required.' });
        }

        const user = await User.findOne({ email: email.trim().toLowerCase() });
        if (!user) {
            return res.status(404).json({ success: false, message: 'User account not found.' });
        }

        user.password = await hashPassword(newPassword.trim());
        await user.save();

        return res.json({ success: true, message: 'Password reset successfully!' });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) return res.status(404).json({ success: false, message: 'User account not found.' });
        return res.json({ success: true, user });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

app.put('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name?.trim() || !email?.trim()) {
            return res.status(400).json({ success: false, message: 'Name and email are required.' });
        }
        if (!emailRegex.test(email.trim())) {
            return res.status(400).json({ success: false, message: 'Please provide a valid email.' });
        }

        const dup = await User.findOne({ email: email.trim().toLowerCase(), _id: { $ne: req.user.id } });
        if (dup) return res.status(400).json({ success: false, message: 'Email address is already in use.' });

        const updateData = { name: name.trim(), email: email.trim().toLowerCase() };
        if (password && password.trim().length > 0) {
            updateData.password = await hashPassword(password.trim());
        }

        const updated = await User.findByIdAndUpdate(req.user.id, updateData, {
            new: true, runValidators: true
        }).select('-password');

        return res.json({ success: true, message: 'Profile details updated successfully!', user: updated });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// ==========================================
// TASK 2: CONTACT / INQUIRY ROUTES
// ==========================================

app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
            return res.status(400).json({ success: false, message: 'All fields are mandatory.' });
        }
        if (!emailRegex.test(email.trim())) {
            return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
        }

        await Inquiry.create({
            name: name.trim(),
            email: email.trim(),
            subject: subject.trim(),
            message: message.trim()
        });

        return res.status(201).json({ success: true, message: 'Thank you! Your inquiry has been submitted successfully.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server error processing inquiry.' });
    }
});

app.get('/api/inquiries', authenticateToken, authorize(PERMISSIONS.INQUIRIES_READ), async (req, res) => {
    try {
        const inquiries = await Inquiry.find().sort({ createdAt: -1 });
        return res.json({ success: true, data: inquiries });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// ==========================================
// TASK 3, 6 & 8: SERVICES (CRUD + Search/Filter)
// ==========================================

app.get('/api/services', async (req, res) => {
    try {
        const { search, sortBy } = req.query;
        const filter = {};

        if (search && search.trim() !== '') {
            const rx = new RegExp(search.trim(), 'i');
            filter.$or = [{ title: rx }, { description: rx }];
        }

        let sort = { createdAt: -1 };
        if (sortBy === 'title_asc') sort = { title: 1 };
        else if (sortBy === 'title_desc') sort = { title: -1 };
        else if (sortBy === 'oldest') sort = { createdAt: 1 };

        const services = await Service.find(filter).sort(sort);
        return res.json({ success: true, data: services });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/services', authenticateToken, authorize(PERMISSIONS.SERVICES_CREATE), async (req, res) => {
    try {
        const { title, description } = req.body;
        if (!title?.trim() || !description?.trim()) {
            return res.status(400).json({ success: false, message: 'Title and Description are required.' });
        }
        const service = await Service.create({ title: title.trim(), description: description.trim() });
        return res.status(201).json({ success: true, data: service, message: 'New service created successfully!' });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

app.put('/api/services/:id', authenticateToken, authorize(PERMISSIONS.SERVICES_UPDATE), async (req, res) => {
    try {
        const { title, description } = req.body;
        const updated = await Service.findByIdAndUpdate(
            req.params.id,
            { title: title?.trim(), description: description?.trim() },
            { new: true, runValidators: true }
        );
        if (!updated) return res.status(404).json({ success: false, message: 'Service not found.' });
        return res.json({ success: true, data: updated, message: 'Service updated successfully!' });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/services/:id', authenticateToken, authorize(PERMISSIONS.SERVICES_DELETE), async (req, res) => {
    try {
        const deleted = await Service.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ success: false, message: 'Service not found.' });
        return res.json({ success: true, message: 'Service deleted successfully!' });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// ==========================================
// TASK 7: CUSTOMER REQUESTS
// ==========================================

app.post('/api/requests', authenticateToken, authorize(PERMISSIONS.REQUESTS_CREATE_OWN), async (req, res) => {
    try {
        const { title, description } = req.body;
        if (!title?.trim() || !description?.trim()) {
            return res.status(400).json({ success: false, message: 'Title and description are required.' });
        }
        const newReq = await Request.create({
            userId: req.user.id,
            title: title.trim(),
            description: description.trim()
        });
        return res.status(201).json({ success: true, message: 'Request submitted successfully!', data: newReq });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error while submitting request.', error: err.message });
    }
});

app.get('/api/user/requests', authenticateToken, authorize(PERMISSIONS.REQUESTS_READ_OWN), async (req, res) => {
    try {
        const list = await Request.find({ userId: req.user.id }).sort({ createdAt: -1 });
        return res.json({ success: true, data: list });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error fetching requests.', error: err.message });
    }
});

app.get('/api/admin/requests', authenticateToken, authorize(PERMISSIONS.REQUESTS_READ_ALL), async (req, res) => {
    try {
        const list = await Request.find()
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });
        return res.json({ success: true, data: list });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error fetching all requests.', error: err.message });
    }
});

app.put('/api/admin/requests/:id/status', authenticateToken, authorize(PERMISSIONS.REQUESTS_UPDATE_STATUS), async (req, res) => {
    try {
        const { status } = req.body;
        const valid = ['Pending', 'In Progress', 'Completed', 'Rejected'];
        if (!status || !valid.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid or missing status value.' });
        }
        const updated = await Request.findByIdAndUpdate(req.params.id, { status }, { new: true, runValidators: true });
        if (!updated) return res.status(404).json({ success: false, message: 'Request not found.' });
        return res.json({ success: true, message: 'Request status updated successfully!', data: updated });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error updating request status.', error: err.message });
    }
});

// ==========================================
// TASK 9: ROLES & USERS MANAGEMENT
// ==========================================

app.get('/api/roles', authenticateToken, authorize(PERMISSIONS.ROLES_READ), async (req, res) => {
    try {
        const roles = await Role.find().sort({ name: 1 });
        return res.json({ success: true, data: roles });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/roles', authenticateToken, authorize(PERMISSIONS.ROLES_CREATE), async (req, res) => {
    try {
        const { name, displayName, description, permissions } = req.body;
        if (!name?.trim() || !displayName?.trim()) {
            return res.status(400).json({ success: false, message: 'Name and displayName are required.' });
        }
        const exists = await Role.findOne({ name: name.trim().toLowerCase() });
        if (exists) return res.status(400).json({ success: false, message: 'Role already exists.' });

        const role = await Role.create({
            name: name.trim().toLowerCase(),
            displayName: displayName.trim(),
            description: description || '',
            permissions: Array.isArray(permissions) ? permissions : [],
            isSystem: false
        });
        return res.status(201).json({ success: true, message: 'Role created successfully!', data: role });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

app.put('/api/roles/:id', authenticateToken, authorize(PERMISSIONS.ROLES_UPDATE), async (req, res) => {
    try {
        const role = await Role.findById(req.params.id);
        if (!role) return res.status(404).json({ success: false, message: 'Role not found.' });

        const { displayName, description, permissions } = req.body;
        if (displayName) role.displayName = displayName;
        if (description !== undefined) role.description = description;
        if (Array.isArray(permissions) && !role.isSystem) role.permissions = permissions;

        await role.save();
        return res.json({ success: true, message: 'Role updated successfully!', data: role });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/roles/:id', authenticateToken, authorize(PERMISSIONS.ROLES_DELETE), async (req, res) => {
    try {
        const role = await Role.findById(req.params.id);
        if (!role) return res.status(404).json({ success: false, message: 'Role not found.' });
        if (role.isSystem) return res.status(400).json({ success: false, message: 'Cannot delete system roles.' });

        await Role.findByIdAndDelete(req.params.id);
        return res.json({ success: true, message: 'Role deleted successfully!' });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

app.get('/api/users', authenticateToken, authorize(PERMISSIONS.USERS_READ), async (req, res) => {
    try {
        const users = await User.find().select('-password').sort({ createdAt: -1 });
        return res.json({ success: true, data: users });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

app.put('/api/users/:id/role', authenticateToken, authorize(PERMISSIONS.USERS_ASSIGN_ROLE), async (req, res) => {
    try {
        const { role } = req.body;
        if (!role) return res.status(400).json({ success: false, message: 'Role is required.' });

        const roleDoc = await Role.findOne({ name: role });
        if (!roleDoc) return res.status(400).json({ success: false, message: 'Role does not exist.' });

        const user = await User.findByIdAndUpdate(
            req.params.id,
            { role: roleDoc.name, permissions: roleDoc.permissions },
            { new: true }
        ).select('-password');

        if (!user) return res.status(404).json({ success: false, message: 'User not found.' });
        return res.json({ success: true, message: 'Role updated successfully!', user });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/users/:id', authenticateToken, authorize(PERMISSIONS.USERS_DELETE), async (req, res) => {
    try {
        if (req.params.id === req.user.id) {
            return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
        }
        const deleted = await User.findByIdAndDelete(req.params.id);
        if (!deleted) return res.status(404).json({ success: false, message: 'User not found.' });
        return res.json({ success: true, message: 'User deleted successfully!' });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// ==========================================
// TASK 10: FILE & DOCUMENT MANAGEMENT
// ==========================================

/**
 * Wrap multer's single-file upload and translate any errors into JSON responses.
 * Any authenticated user can upload (no permission gate — matches task scope).
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
            return res.status(400).json({ success: false, message: 'No file uploaded. Please choose a file.' });
        }
        next();
    });
};

// POST /api/files — upload a file (any authenticated user)
app.post('/api/files', authenticateToken, uploadSingle, async (req, res) => {
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
        return res.status(500).json({ success: false, message: 'Server error saving file metadata.' });
    }
});

// GET /api/user/files — list current user's files
app.get('/api/user/files', authenticateToken, async (req, res) => {
    try {
        const files = await File.find({ userId: req.user.id }).sort({ uploadedAt: -1 });
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
});

// DELETE /api/user/files/:id — delete own file (removes from disk + DB)
app.delete('/api/user/files/:id', authenticateToken, async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) {
            return res.status(404).json({ success: false, message: 'File not found.' });
        }

        // Ownership check: only the owner can delete their own file
        if (file.userId.toString() !== req.user.id) {
            return res.status(403).json({ success: false, message: 'Access denied. You can only delete your own files.' });
        }

        // Remove from disk (best-effort — don't fail if already gone)
        fs.unlink(file.path, (err) => {
            if (err) console.warn('Could not delete file from disk:', err.message);
        });

        // Remove DB record
        await File.findByIdAndDelete(req.params.id);

        return res.json({ success: true, message: 'File deleted successfully!' });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// GET /api/files — list all files (admin/employee with files:read_all)
app.get('/api/files', authenticateToken, authorize(PERMISSIONS.FILES_READ_ALL), async (req, res) => {
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
});

// DELETE /api/files/:id — delete ANY file (admin only)
app.delete('/api/files/:id', authenticateToken, authorize(PERMISSIONS.FILES_DELETE_ANY), async (req, res) => {
    try {
        const file = await File.findById(req.params.id);
        if (!file) {
            return res.status(404).json({ success: false, message: 'File not found.' });
        }

        // Remove from disk (best-effort)
        fs.unlink(file.path, (err) => {
            if (err) console.warn('Could not delete file from disk:', err.message);
        });

        await File.findByIdAndDelete(req.params.id);
        return res.json({ success: true, message: 'File deleted successfully!' });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// ==========================================
// TASK 11: CLIENT PROJECT MANAGEMENT
// ==========================================

/**
 * GET /api/projects
 * List projects based on user role:
 * - Admin: all projects
 * - Team Member: projects where they are assigned
 * - Customer: projects where they are the client
 */
app.get('/api/projects', authenticateToken, authorize(PERMISSIONS.PROJECTS_READ), async (req, res) => {
    try {
        let filter = {};

        if (req.user.role === 'admin') {
            filter = {};
        } else if (req.user.role === 'team_member') {
            filter = { assignedMembers: req.user.id };
        } else if (req.user.role === 'customer') {
            filter = { client: req.user.id };
        } else {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        const projects = await Project.find(filter)
            .populate('client', 'name email')
            .populate('assignedMembers', 'name email')
            .populate('createdBy', 'name email')
            .sort({ createdAt: -1 });

        return res.json({ success: true, data: projects });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * GET /api/projects/stats
 * Get project statistics for dashboard (Admin only)
 */
app.get('/api/projects/stats', authenticateToken, authorize(PERMISSIONS.PROJECTS_READ), async (req, res) => {
    try {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, message: 'Access denied.' });
        }

        const total = await Project.countDocuments();
        const notStarted = await Project.countDocuments({ status: 'Not Started' });
        const inProgress = await Project.countDocuments({ status: 'In Progress' });
        const completed = await Project.countDocuments({ status: 'Completed' });
        const onHold = await Project.countDocuments({ status: 'On Hold' });

        return res.json({
            success: true,
            data: { total, notStarted, inProgress, completed, onHold }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * GET /api/projects/:id
 * Get single project details (with access control)
 */
app.get('/api/projects/:id', authenticateToken, authorize(PERMISSIONS.PROJECTS_READ), async (req, res) => {
    try {
        const project = await Project.findById(req.params.id)
            .populate('client', 'name email')
            .populate('assignedMembers', 'name email')
            .populate('createdBy', 'name email');

        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found.' });
        }

        if (req.user.role !== 'admin') {
            const isAssigned = project.assignedMembers.some(m => m._id.toString() === req.user.id);
            const isClient = project.client._id.toString() === req.user.id;
            if (!isAssigned && !isClient) {
                return res.status(403).json({ success: false, message: 'Access denied. You are not assigned to this project.' });
            }
        }

        return res.json({ success: true, data: project });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * POST /api/projects
 * Create a new project (Admin only)
 */
app.post('/api/projects', authenticateToken, authorize(PERMISSIONS.PROJECTS_CREATE), async (req, res) => {
    try {
        const { name, description, client, assignedMembers } = req.body;

        if (!name?.trim() || !description?.trim() || !client) {
            return res.status(400).json({ success: false, message: 'Name, description, and client are required.' });
        }

        const clientUser = await User.findById(client);
        if (!clientUser || clientUser.role !== 'customer') {
            return res.status(400).json({ success: false, message: 'Invalid client. Must be a registered customer.' });
        }

        let validMembers = [];
        if (Array.isArray(assignedMembers) && assignedMembers.length > 0) {
            const members = await User.find({ _id: { $in: assignedMembers }, role: 'team_member' });
            validMembers = members.map(m => m._id);
        }

        const project = await Project.create({
            name: name.trim(),
            description: description.trim(),
            client,
            assignedMembers: validMembers,
            createdBy: req.user.id
        });

        const populated = await Project.findById(project._id)
            .populate('client', 'name email')
            .populate('assignedMembers', 'name email')
            .populate('createdBy', 'name email');

        return res.status(201).json({ success: true, message: 'Project created successfully!', data: populated });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * PUT /api/projects/:id
 * Update project (Admin, or assigned Team Member)
 */
app.put('/api/projects/:id', authenticateToken, authorize(PERMISSIONS.PROJECTS_UPDATE), async (req, res) => {
    try {
        const project = await Project.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found.' });
        }

        if (req.user.role !== 'admin') {
            const isAssigned = project.assignedMembers.some(m => m.toString() === req.user.id);
            if (!isAssigned) {
                return res.status(403).json({ success: false, message: 'Access denied. You are not assigned to this project.' });
            }
        }

        const { name, description } = req.body;
        if (name?.trim()) project.name = name.trim();
        if (description?.trim()) project.description = description.trim();
        project.updatedAt = Date.now();

        await project.save();

        const populated = await Project.findById(project._id)
            .populate('client', 'name email')
            .populate('assignedMembers', 'name email')
            .populate('createdBy', 'name email');

        return res.json({ success: true, message: 'Project updated successfully!', data: populated });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * PUT /api/projects/:id/status
 * Update project status (Admin, or assigned Team Member)
 */
app.put('/api/projects/:id/status', authenticateToken, authorize(PERMISSIONS.PROJECTS_UPDATE), async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['Not Started', 'In Progress', 'Completed', 'On Hold'];

        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid or missing status value.' });
        }

        const project = await Project.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found.' });
        }

        if (req.user.role !== 'admin') {
            const isAssigned = project.assignedMembers.some(m => m.toString() === req.user.id);
            if (!isAssigned) {
                return res.status(403).json({ success: false, message: 'Access denied. You are not assigned to this project.' });
            }
        }

        project.status = status;
        project.updatedAt = Date.now();
        await project.save();

        const populated = await Project.findById(project._id)
            .populate('client', 'name email')
            .populate('assignedMembers', 'name email')
            .populate('createdBy', 'name email');

        return res.json({ success: true, message: 'Project status updated successfully!', data: populated });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * PUT /api/projects/:id/assign
 * Assign team members to project (Admin only)
 */
app.put('/api/projects/:id/assign', authenticateToken, authorize(PERMISSIONS.PROJECTS_ASSIGN), async (req, res) => {
    try {
        const { assignedMembers } = req.body;

        if (!Array.isArray(assignedMembers)) {
            return res.status(400).json({ success: false, message: 'assignedMembers must be an array of user IDs.' });
        }

        const project = await Project.findById(req.params.id);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found.' });
        }

        const members = await User.find({ _id: { $in: assignedMembers }, role: 'team_member' });
        if (members.length !== assignedMembers.length) {
            return res.status(400).json({ success: false, message: 'One or more users are not valid team members.' });
        }

        project.assignedMembers = members.map(m => m._id);
        project.updatedAt = Date.now();
        await project.save();

        const populated = await Project.findById(project._id)
            .populate('client', 'name email')
            .populate('assignedMembers', 'name email')
            .populate('createdBy', 'name email');

        return res.json({ success: true, message: 'Team members assigned successfully!', data: populated });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

/**
 * DELETE /api/projects/:id
 * Delete project (Admin only)
 */
app.delete('/api/projects/:id', authenticateToken, authorize(PERMISSIONS.PROJECTS_DELETE), async (req, res) => {
    try {
        const project = await Project.findByIdAndDelete(req.params.id);
        if (!project) {
            return res.status(404).json({ success: false, message: 'Project not found.' });
        }
        return res.json({ success: true, message: 'Project deleted successfully!' });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// ==========================================
// SERVER BOOT
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Nexus AI Server online and listening on http://localhost:${PORT}`);
});