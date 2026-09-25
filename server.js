require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 5001; 
const JWT_SECRET = 'campus-bandhu-secret-key-999';

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// --- CLOUD DATABASE CONNECTION ---
const MONGO_URI = "mongodb+srv://campusbandhu06:campus06@cheatan.4ilrpq2.mongodb.net/?retryWrites=true&w=majority&appName=Cheatan";

mongoose.connect(MONGO_URI)
.then(() => console.log('✅ Connected to CLOUD Database (Atlas)'))
.catch(err => {
    console.error('❌ Cloud Connection Error:', err.message);
});

// --- SCHEMAS ---
const UserSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true },
    phone: { type: String, required: true },
    aadhaar: String,
    gender: String,
    createdAt: { type: Date, default: Date.now }
});

const ListingSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, required: true },
    price: { type: Number, required: true },
    location: { type: String, required: true },
    address: String,
    features: String,
    img: String, 
    images: [String], 
    ownerEmail: { type: String, required: true },
    ownerPhone: { type: String, required: true },
    owner: String, 
    rating: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
    occupancy: String, // NEW: For PGs (Single, Double, etc.)
    academicField: String, // NEW: For Notes/Books (11th, Engineering, etc.)
    nearestCollege: String, // NEW: Tag for nearest campus
    coords: { lat: Number, lng: Number },
    createdAt: { type: Date, default: Date.now }
});

const InquirySchema = new mongoose.Schema({
    listingId: String,
    itemName: String,
    ownerEmail: String,
    studentName: String,
    timestamp: { type: Date, default: Date.now }
});

const ContactSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true },
    message: { type: String, required: true },
    timestamp: { type: Date, default: Date.now }
});

const User = mongoose.model('User', UserSchema);
const Listing = mongoose.model('Listing', ListingSchema);
const Inquiry = mongoose.model('Inquiry', InquirySchema);
const Contact = mongoose.model('Contact', ContactSchema);

// --- ROUTES ---

// HEALTH CHECK 
app.get('/', (req, res) => {
    res.send('✅ CampusBandhu Server is running successfully on Port 5001!');
});

// 1. AUTHENTICATION
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, email, password, role, phone, aadhaar, gender } = req.body;
        
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: 'User already exists' });

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const newUser = new User({
            name, email, password: hashedPassword, role, phone, aadhaar, gender
        });
        await newUser.save();

        res.status(201).json({ 
            message: 'User created',
            user: { name, email, role, phone } 
        });
    } catch (err) {
        res.status(500).json({ message: 'Server Error: ' + err.message });
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email });
        
        if (!user) return res.status(400).json({ message: 'User not found' });

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

        const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '1d' });

        res.json({
            token,
            user: {
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone
            }
        });
    } catch (err) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// 2. LISTINGS
app.get('/api/listings', async (req, res) => {
    try {
        const listings = await Listing.find().sort({ createdAt: -1 });
        const formatted = listings.map(l => ({ ...l._doc, id: l._id }));
        res.json(formatted);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching listings' });
    }
});

app.post('/api/listings', async (req, res) => {
    try {
        const newListing = new Listing(req.body);
        const saved = await newListing.save();
        res.status(201).json({ ...saved._doc, id: saved._id });
    } catch (err) {
        res.status(500).json({ message: 'Error creating listing' });
    }
});

app.delete('/api/listings/:id', async (req, res) => {
    try {
        await Listing.findByIdAndDelete(req.params.id);
        res.json({ message: 'Deleted successfully' });
    } catch (err) {
        res.status(500).json({ message: 'Delete failed' });
    }
});

// 3. INQUIRIES
app.post('/api/inquiries', async (req, res) => {
    try {
        const newInquiry = new Inquiry(req.body);
        await newInquiry.save();
        res.status(201).json(newInquiry);
    } catch (err) {
        res.status(500).json({ message: 'Error saving inquiry' });
    }
});

app.get('/api/inquiries/:email', async (req, res) => {
    try {
        const inquiries = await Inquiry.find({ ownerEmail: req.params.email }).sort({ timestamp: -1 });
        res.json(inquiries);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching inquiries' });
    }
});

// 4. ADMIN
app.get('/api/admin/inquiries', async (req, res) => {
    try {
        const inquiries = await Inquiry.find().sort({ timestamp: -1 });
        res.json(inquiries);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching all inquiries' });
    }
});

app.post('/api/contact', async (req, res) => {
    try {
        const newContact = new Contact(req.body);
        await newContact.save();
        res.status(201).json(newContact);
    } catch (err) {
        res.status(500).json({ message: 'Error saving contact message' });
    }
});

app.get('/api/admin/contacts', async (req, res) => {
    try {
        const contacts = await Contact.find().sort({ timestamp: -1 });
        res.json(contacts);
    } catch (err) {
        res.status(500).json({ message: 'Error fetching contacts' });
    }
});

app.listen(PORT, () => console.log(`🚀 Server running at http://localhost:${PORT}`));