const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'campusbandhu_super_secret_key_2026';
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campusbandhu';

// Middleware to enable CORS and parse JSON body requests (large payloads allowed for base64 images)
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB Database successfully'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// 1. User Schema
const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, required: true },
    phone: { type: String, required: true },
    gender: { type: String, default: 'Other' },
    aadhaar: { type: String, default: '' },
    createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

// 2. Listing Schema
const listingSchema = new mongoose.Schema({
    name: { type: String, required: true },
    type: { type: String, required: true }, // pgs, mess, notes, books, gadget, library, class
    price: { type: Number, required: true },
    location: { type: String, default: 'Jalgaon' },
    address: { type: String, required: true },
    img: { type: String },
    images: [{ type: String }],
    owner: { type: String },
    ownerEmail: { type: String, required: true },
    ownerPhone: { type: String },
    rating: { type: Number, default: 4.5 },
    saved: { type: Boolean, default: false },
    coords: {
        lat: { type: Number, default: 21.0077 },
        lng: { type: Number, default: 75.5626 }
    },
    createdAt: { type: Date, default: Date.now }
});

const Listing = mongoose.model('Listing', listingSchema);

// --- AUTH ROUTES ---

// POST: Sign Up new user
app.post('/api/auth/signup', async (req, res) => {
    try {
        const { name, email, password, role, phone, gender, aadhaar } = req.body;

        if (!name || !email || !password || !role || !phone) {
            return res.status(400).json({ message: 'Please fill in all required fields.' });
        }

        // Check if user already exists
        const existingUser = await User.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.status(400).json({ message: 'User with this email already exists.' });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Save User
        const newUser = new User({
            name,
            email: email.toLowerCase(),
            password: hashedPassword,
            role,
            phone,
            gender,
            aadhaar
        });

        await newUser.save();

        res.status(201).json({ message: 'User registered successfully!' });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ message: 'Server error during signup.' });
    }
});

// POST: Login user
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: 'Please enter email and password.' });
        }

        // Find user by email
        const user = await User.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        // Verify password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(400).json({ message: 'Invalid credentials.' });
        }

        // Generate JWT Token
        const token = jwt.sign(
            { id: user._id, email: user.email, role: user.role },
            JWT_SECRET,
            { expiresIn: '7d' }
        );

        res.json({
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                role: user.role,
                phone: user.phone
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error during login.' });
    }
});

// --- LISTINGS ROUTES ---

// GET: Fetch all listings
app.get('/api/listings', async (req, res) => {
    try {
        const listings = await Listing.find().sort({ createdAt: -1 });
        // Format _id to id for frontend compatibility
        const formatted = listings.map(doc => ({
            id: doc._id,
            name: doc.name,
            type: doc.type,
            price: doc.price,
            location: doc.location,
            address: doc.address,
            img: doc.img,
            images: doc.images,
            owner: doc.owner,
            ownerEmail: doc.ownerEmail,
            ownerPhone: doc.ownerPhone,
            rating: doc.rating,
            saved: doc.saved,
            coords: doc.coords
        }));
        res.json(formatted);
    } catch (error) {
        console.error('Get listings error:', error);
        res.status(500).json({ message: 'Failed to fetch listings.' });
    }
});

// POST: Add new listing
app.post('/api/listings', async (req, res) => {
    try {
        const { name, type, price, location, address, img, images, owner, ownerEmail, ownerPhone, coords } = req.body;

        const newListing = new Listing({
            name,
            type,
            price,
            location: location || 'Jalgaon Region',
            address,
            img,
            images: images || [img],
            owner,
            ownerEmail,
            ownerPhone,
            coords
        });

        const savedListing = await newListing.save();

        res.status(201).json({
            id: savedListing._id,
            name: savedListing.name,
            type: savedListing.type,
            price: savedListing.price,
            location: savedListing.location,
            address: savedListing.address,
            img: savedListing.img,
            images: savedListing.images,
            owner: savedListing.owner,
            ownerEmail: savedListing.ownerEmail,
            ownerPhone: savedListing.ownerPhone,
            rating: savedListing.rating,
            saved: savedListing.saved,
            coords: savedListing.coords
        });
    } catch (error) {
        console.error('Add listing error:', error);
        res.status(500).json({ message: 'Failed to save listing.' });
    }
});

// PUT: Update listing (e.g. toggle saved or edit)
app.put('/api/listings/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;

        const updated = await Listing.findByIdAndUpdate(id, updates, { new: true });
        if (!updated) {
            return res.status(404).json({ message: 'Listing not found.' });
        }

        res.json({
            id: updated._id,
            ...updated._doc
        });
    } catch (error) {
        console.error('Update listing error:', error);
        res.status(500).json({ message: 'Failed to update listing.' });
    }
});

// DELETE: Delete listing
app.delete('/api/listings/:id', async (req, res) => {
    try {
        const { id } = req.params;
        await Listing.findByIdAndDelete(id);
        res.json({ message: 'Listing deleted successfully.' });
    } catch (error) {
        console.error('Delete listing error:', error);
        res.status(500).json({ message: 'Failed to delete listing.' });
    }
});

app.listen(PORT, () => {
    console.log(`🚀 CampusBandhu Backend Server is running on http://localhost:${PORT}`);
});