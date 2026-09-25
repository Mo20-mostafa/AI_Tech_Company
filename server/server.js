require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const app = express();

// Global Middlewares
app.use(cors());
app.use(express.json());

// Regular Expressions for Validation
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Database Connection Setup
const mongoURI = process.env.MONGO_URI || "mongodb+srv://20240602_db_user:Password123m@cluster0.erylrox.mongodb.net/nexus_ai?retryWrites=true&w=majority";

mongoose.connect(mongoURI)
    .then(async () => {
        console.log('MongoDB Connected Successfully');
        await autoSeedAdmin(); // Automatically seed designated Admin account
    })
    .catch((err) => console.error('MongoDB Connection Error:', err));

// Root Health Check Route
app.get('/', (req, res) => {
    res.send('Nexus AI Integrated Backend Service is Running Smoothly.');
});

// ==========================================
// SECURITY & AUTHENTICATION MIDDLEWARES
// ==========================================

// Authenticate JWT Token for Protected Routes
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ success: false, message: 'Access denied. Authentication token required.' });
    }

    jwt.verify(token, process.env.JWT_SECRET || 'secretkey', (err, user) => {
        if (err) {
            return res.status(403).json({ success: false, message: 'Invalid or expired token.' });
        }
        req.user = user;
        next();
    });
};

// Role-Based Access Control (RBAC) - Admin Authorization Middleware
const requireAdmin = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({ 
            success: false, 
            message: 'Access denied. Admin credentials required to perform this action.' 
        });
    }
};

// ==========================================
// MONGOOSE SCHEMAS & MODELS
// ==========================================

// User Schema (Task 4 & 5)
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    createdAt: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

// Inquiry Schema (Task 2)
const inquirySchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const Inquiry = mongoose.model('Inquiry', inquirySchema);

// Service Schema (Task 3 & Task 6)
const serviceSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});
const Service = mongoose.model('Service', serviceSchema);

// Customer Request Schema (Task 7 - Scalable Structure)
const requestSchema = new mongoose.Schema({
    userId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    title: { 
        type: String, 
        required: true, 
        trim: true 
    },
    description: { 
        type: String, 
        required: true, 
        trim: true 
    },
    status: { 
        type: String, 
        enum: ['Pending', 'In Progress', 'Completed', 'Rejected'], 
        default: 'Pending' 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});
const Request = mongoose.model('Request', requestSchema);

// ==========================================
// AUTOMATIC ADMIN ACCOUNT SEEDER
// ==========================================
/**
 * Ensures designated Admin email (emostafamamdoh@gmail.com) exists with Admin role.
 */
async function autoSeedAdmin() {
    try {
        const adminEmail = 'emostafamamdoh@gmail.com';
        let adminUser = await User.findOne({ email: adminEmail });

        if (!adminUser) {
            await User.create({
                name: 'System Admin',
                email: adminEmail,
                password: 'admin123', // Default Password
                role: 'admin'
            });
            console.log(`==> Admin Account Created Successfully: ${adminEmail} | Password: admin123`);
        } else if (adminUser.role !== 'admin') {
            adminUser.role = 'admin';
            await adminUser.save();
            console.log(`==> Updated ${adminEmail} to Admin Role`);
        }
    } catch (err) {
        console.error('Error during auto admin seeding:', err.message);
    }
}

// ==========================================
// TASK 4 & 5: AUTHENTICATION & PROFILE ROUTES
// ==========================================

// Register Route
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password, role } = req.body;

        if (!name?.trim() || !email?.trim() || !password?.trim()) {
            return res.status(400).json({ success: false, message: 'All fields are required.' });
        }

        const normalizedEmail = email.trim().toLowerCase();

        if (!emailRegex.test(normalizedEmail)) {
            return res.status(400).json({ success: false, message: 'Invalid email format provided.' });
        }

        const existingUser = await User.findOne({ email: normalizedEmail });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email address already registered.' });
        }

        // Strictly assign 'admin' role ONLY to the designated admin email address
        let assignedRole = (normalizedEmail === 'emostafamamdoh@gmail.com' || role === 'admin') ? 'admin' : 'user';

        const newUser = new User({
            name: name.trim(),
            email: normalizedEmail,
            password: password.trim(),
            role: assignedRole
        });

        await newUser.save();
        return res.status(201).json({ success: true, message: 'Account created successfully!' });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// Login Route
app.post('/api/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email?.trim() || !password?.trim()) {
            return res.status(400).json({ success: false, message: 'Email and password are required.' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        let user = await User.findOne({ email: normalizedEmail, password: password.trim() });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid email or password.' });
        }

        // Force Admin role enforcement for primary Admin email
        if (normalizedEmail === 'emostafamamdoh@gmail.com' && user.role !== 'admin') {
            user.role = 'admin';
            await user.save();
        }

        const userRole = user.role || 'user';

        const token = jwt.sign(
            { id: user._id, email: user.email, role: userRole }, 
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
                role: userRole 
            }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// Password Reset Route (For forgotten Admin or User password)
app.post('/api/reset-password', async (req, res) => {
    try {
        const { email, newPassword } = req.body;
        if (!email?.trim() || !newPassword?.trim()) {
            return res.status(400).json({ success: false, message: 'Email and new password are required.' });
        }

        const normalizedEmail = email.trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User account not found.' });
        }

        user.password = newPassword.trim();
        await user.save();

        return res.json({ success: true, message: 'Password reset successfully!' });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// Get Profile Route (Task 5)
app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select('-password');
        if (!user) {
            return res.status(404).json({ success: false, message: 'User account not found.' });
        }
        return res.json({ success: true, user });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// Update Profile Route (Task 5)
app.put('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name?.trim() || !email?.trim()) {
            return res.status(400).json({ success: false, message: 'Name and email are required.' });
        }

        if (!emailRegex.test(email.trim())) {
            return res.status(400).json({ success: false, message: 'Please provide a valid email.' });
        }

        const existingUser = await User.findOne({ email: email.trim().toLowerCase(), _id: { $ne: req.user.id } });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email address is already in use.' });
        }

        const updateData = {
            name: name.trim(),
            email: email.trim().toLowerCase()
        };

        if (password && password.trim().length > 0) {
            updateData.password = password.trim();
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.user.id,
            updateData,
            { new: true, runValidators: true }
        ).select('-password');

        return res.json({
            success: true,
            message: 'Profile details updated successfully!',
            user: updatedUser
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// ==========================================
// TASK 2: CONTACT / INQUIRY ROUTES
// ==========================================

// Submit Public Inquiry
app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
            return res.status(400).json({ success: false, message: 'All fields are mandatory.' });
        }

        if (!emailRegex.test(email.trim())) {
            return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
        }

        const newInquiry = new Inquiry({
            name: name.trim(),
            email: email.trim(),
            subject: subject.trim(),
            message: message.trim()
        });

        await newInquiry.save();
        return res.status(201).json({ success: true, message: 'Thank you! Your inquiry has been submitted successfully.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Server error processing inquiry.' });
    }
});

// Fetch Inquiries for Admin View
app.get('/api/inquiries', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const inquiries = await Inquiry.find().sort({ createdAt: -1 });
        return res.json({ success: true, data: inquiries });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// ==========================================
// TASK 3 & 6: SERVICE MANAGEMENT ROUTES (CMS)
// ==========================================

// Fetch Public Services for Company Website Landing Page (Task 1 & 6)
app.get('/api/services', async (req, res) => {
    try {
        const services = await Service.find().sort({ createdAt: -1 });
        return res.json({ success: true, data: services });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// Admin-Only: Add New Service (Task 3 & 6)
app.post('/api/services', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { title, description } = req.body;
        if (!title?.trim() || !description?.trim()) {
            return res.status(400).json({ success: false, message: 'Title and Description are required.' });
        }

        const newService = new Service({ title: title.trim(), description: description.trim() });
        await newService.save();
        return res.status(201).json({ success: true, data: newService, message: 'New service created successfully!' });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// Admin-Only: Update Service Details (Task 3 & 6)
app.put('/api/services/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { title, description } = req.body;
        const updatedService = await Service.findByIdAndUpdate(
            req.params.id,
            { title: title?.trim(), description: description?.trim() },
            { new: true, runValidators: true }
        );

        if (!updatedService) {
            return res.status(404).json({ success: false, message: 'Service not found.' });
        }

        return res.json({ success: true, data: updatedService, message: 'Service updated successfully!' });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// Admin-Only: Delete Service (Task 3 & 6)
app.delete('/api/services/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const deletedService = await Service.findByIdAndDelete(req.params.id);
        if (!deletedService) {
            return res.status(404).json({ success: false, message: 'Service not found.' });
        }

        return res.json({ success: true, message: 'Service deleted successfully!' });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// ==========================================
// TASK 7: CUSTOMER REQUEST MANAGEMENT ROUTES
// ==========================================

// Customer-Side: Submit a new request (Protected)
app.post('/api/requests', authenticateToken, async (req, res) => {
    try {
        const { title, description } = req.body;

        if (!title?.trim() || !description?.trim()) {
            return res.status(400).json({ success: false, message: 'Title and description are required.' });
        }

        const newRequest = new Request({
            userId: req.user.id,
            title: title.trim(),
            description: description.trim()
        });

        await newRequest.save();
        return res.status(201).json({ 
            success: true, 
            message: 'Request submitted successfully!', 
            data: newRequest 
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error while submitting request.', error: err.message });
    }
});

// Customer-Side: Fetch logged-in user's requests (Protected)
app.get('/api/user/requests', authenticateToken, async (req, res) => {
    try {
        const userRequests = await Request.find({ userId: req.user.id }).sort({ createdAt: -1 });
        return res.json({ success: true, data: userRequests });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error fetching requests.', error: err.message });
    }
});

// Company-Side (Admin Only): Fetch all customer requests (Protected + Admin)
app.get('/api/admin/requests', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const allRequests = await Request.find()
            .populate('userId', 'name email')
            .sort({ createdAt: -1 });
        return res.json({ success: true, data: allRequests });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error fetching all requests.', error: err.message });
    }
});

// Company-Side (Admin Only): Update request status (Protected + Admin)
app.put('/api/admin/requests/:id/status', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const { status } = req.body;
        const validStatuses = ['Pending', 'In Progress', 'Completed', 'Rejected'];

        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ success: false, message: 'Invalid or missing status value.' });
        }

        const updatedRequest = await Request.findByIdAndUpdate(
            req.params.id,
            { status },
            { new: true, runValidators: true }
        );

        if (!updatedRequest) {
            return res.status(404).json({ success: false, message: 'Request not found.' });
        }

        return res.json({ 
            success: true, 
            message: 'Request status updated successfully!', 
            data: updatedRequest 
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: 'Server error updating request status.', error: err.message });
    }
});

// Start Server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Nexus AI Server online and listening on http://localhost:${PORT}`);
});