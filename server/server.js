require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const mongoURI = process.env.MONGO_URI;

mongoose.connect(mongoURI)
    .then(() => console.log('MongoDB Connected Successfully'))
    .catch((err) => console.error('MongoDB Connection Error:', err));


// 1. TASK 2: Contact & Inquiry System
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
        console.log('Saved to Database:', newInquiry);

        return res.status(201).json({
            success: true,
            message: 'Thank you! Your inquiry has been received successfully.'
        });
    } catch (error) {
        console.error('Error handling contact submission:', error);
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


// 2. TASK 3: Services CRUD Operations
// ==========================================
const serviceSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
});

const Service = mongoose.model('Service', serviceSchema);

// Read All Services
app.get('/api/services', async (req, res) => {
    try {
        const services = await Service.find().sort({ createdAt: -1 });
        return res.json({ success: true, data: services });
    } catch (err) {
        return res.status(500).json({ success: false, message: err.message });
    }
});

// Create New Service
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

// Update Service
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

// Delete Service
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