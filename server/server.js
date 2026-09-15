const cors = require('cors');
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const app = express();

app.use(cors());
app.use(express.json());

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const mongoURI = process.env.MONGO_URI;

mongoose.connect(mongoURI)
    .then(() => console.log('MongoDB Connected Successfully'))
    .catch((err) => console.error('MongoDB Connection Error:', err));


// ==========================================
// 1. User & Authentication System
// ==========================================
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// Register Route
app.post('/api/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name?.trim() || !email?.trim() || !password?.trim()) {
            return res.status(400).json({ success: false, message: 'All fields are required.' });
        }

        const existingUser = await User.findOne({ email: email.trim().toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already registered.' });
        }

        const newUser = new User({
            name: name.trim(),
            email: email.trim().toLowerCase(),
            password: password.trim()
        });

        await newUser.save();
        return res.status(201).json({ success: true, message: 'User registered successfully!' });
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

        const user = await User.findOne({ email: email.trim().toLowerCase(), password: password.trim() });
        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid email or password.' });
        }

        const token = jwt.sign({ id: user._id, email: user.email }, process.env.JWT_SECRET || 'secretkey', { expiresIn: '1h' });

        return res.json({
            success: true,
            token,
            user: { id: user._id, name: user.name, email: user.email }
        });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});


// ==========================================
// 2. TASK 2: Contact & Inquiry System
// ==========================================
const inquirySchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const Inquiry = mongoose.model('Inquiry', inquirySchema);

app.post('/api/contact', async (req, res) => {
    try {
        const { name, email, subject, message } = req.body;

        if (!name?.trim() || !email?.trim() || !subject?.trim() || !message?.trim()) {
            return res.status(400).json({ success: false, message: 'All fields are required.' });
        }

        if (!emailRegex.test(email.trim())) {
            return res.status(400).json({ success: false, message: 'Please provide a valid email address.' });
        }

        const newInquiry = new Inquiry({
            name: name.trim(),
            email: email.trim(),
            subject: subject.trim(),
            message: message.trim()
        });

        await newInquiry.save();
        return res.status(201).json({ success: true, message: 'Thank you! Your inquiry has been received successfully.' });
    } catch (error) {
        return res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
});

app.get('/api/inquiries', async (req, res) => {
    try {
        const data = await Inquiry.find();
        return res.json(data);
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});


// ==========================================
// 3. TASK 3: Services CRUD Operations
// ==========================================
const serviceSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const Service = mongoose.model('Service', serviceSchema);

app.get('/api/services', async (req, res) => {
    try {
        const services = await Service.find().sort({ createdAt: -1 });
        return res.json({ success: true, data: services });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

app.post('/api/services', async (req, res) => {
    try {
        const { title, description } = req.body;
        if (!title?.trim() || !description?.trim()) {
            return res.status(400).json({ success: false, message: 'Title and Description are required.' });
        }

        const newService = new Service({ title: title.trim(), description: description.trim() });
        await newService.save();
        return res.status(201).json({ success: true, data: newService, message: 'Service created successfully' });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

app.put('/api/services/:id', async (req, res) => {
    try {
        const { title, description } = req.body;
        const updatedService = await Service.findByIdAndUpdate(
            req.params.id,
            { title: title?.trim(), description: description?.trim() },
            { new: true, runValidators: true }
        );

        if (!updatedService) {
            return res.status(404).json({ success: false, message: 'Service not found' });
        }

        return res.json({ success: true, data: updatedService, message: 'Service updated successfully' });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

app.delete('/api/services/:id', async (req, res) => {
    try {
        const deletedService = await Service.findByIdAndDelete(req.params.id);
        if (!deletedService) {
            return res.status(404).json({ success: false, message: 'Service not found' });
        }

        return res.json({ success: true, message: 'Service deleted successfully' });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// ==========================================
// Server Port Listener
// ==========================================
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Nexus AI Backend running on http://localhost:${PORT}`);
});