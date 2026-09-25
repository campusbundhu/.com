const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const MONGO_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb+srv://campusbundhu:campusbundhu123@cluster0.mongodb.net/campusbundhu?retryWrites=true&w=majority';

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Connected to CLOUD Database (Atlas)'))
    .catch(err => console.error('❌ Connection error:', err));

const itemSchema = new mongoose.Schema({
    type: { type: String, required: true, default: 'notes' },
    title: { type: String, required: true },
    branch: { type: String, default: 'GENERAL' },
    link: { type: String, default: '' },
    price: { type: String, default: '' },
    desc: { type: String, default: '' },
    author: { type: String, default: 'Student' },
    date: { type: Date, default: Date.now }
});

const Item = mongoose.model('Item', itemSchema);


// GET all items (notes, hostels, store, mess)
app.get('/api/items', async (req, res) => {
    try {
        const items = await Item.find().sort({ date: -1 });
        res.json({ success: true, count: items.length, items });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST a new item/note
app.post('/api/items', async (req, res) => {
    try {
        const newItem = new Item({
            type: req.body.type || 'notes',
            title: req.body.title,
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

// Serve frontend SPA for all other routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});