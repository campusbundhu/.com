// ... existing code ...
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5001; 
const JWT_SECRET = 'campus-bandhu-secret-key-999';

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static(__dirname));

// --- CLOUD DATABASE CONNECTION ---
// ... existing code ...
const User = mongoose.model('User', UserSchema);
const Listing = mongoose.model('Listing', ListingSchema);
const Inquiry = mongoose.model('Inquiry', InquirySchema);
const Contact = mongoose.model('Contact', ContactSchema);

// --- ITEM SCHEMA (For Notes, Hostels, Store, Mess Sync) ---
const ItemSchema = new mongoose.Schema({
    type: { type: String, default: 'notes' },
    title: { type: String, required: true },
    branch: { type: String, default: 'GENERAL' },
    link: { type: String, default: '' },
    price: { type: String, default: '' },
    desc: { type: String, default: '' },
    author: { type: String, default: 'Student' },
    date: { type: Date, default: Date.now }
});

const Item = mongoose.model('Item', ItemSchema);

// --- ROUTES ---

// 1. ITEMS API (For live notes sync on frontend)
app.get('/api/items', async (req, res) => {
    try {
        const items = await Item.find().sort({ date: -1 });
        res.json({ success: true, count: items.length, items });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

app.post('/api/items', async (req, res) => {
    try {
        const newItem = new Item({
            type: req.body.type || 'notes',
            title: req.body.title || req.body.name,
            branch: req.body.branch || 'GENERAL',
            link: req.body.link || '',
            price: req.body.price || '',
            desc: req.body.desc || '',
            author: req.body.author || 'Anonymous Student',
            date: new Date()
        });
        const saved = await newItem.save();
        res.status(201).json({ success: true, item: saved });
    } catch (err) {
        res.status(400).json({ success: false, error: err.message });
    }
});

// 2. AUTHENTICATION
// ... existing code ...
app.get('/api/admin/contacts', async (req, res) => {
    try {
        const contacts = await Contact.find().sort({ timestamp: -1 });
        res.json(contacts);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching contacts' });
    }
});

// Serve frontend SPA index.html for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => console.log(`🚀 Server running on port ${PORT}`));