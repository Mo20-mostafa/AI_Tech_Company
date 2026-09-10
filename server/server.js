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

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Nexus AI Backend running on http://localhost:${PORT}`);
});