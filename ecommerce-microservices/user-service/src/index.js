const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const ADMIN_REGISTRATION_SECRET = process.env.ADMIN_REGISTRATION_SECRET || 'admin_secret_2024';

// Defense-in-depth: verifies x-user-role header set by the gateway
const internalAdminOnly = (req, res, next) => {
  if (req.headers['x-user-role'] !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin role required' });
  }
  next();
};

const app = express();
app.use(cors());
app.use(express.json());

const MONGO_URI = process.env.MONGO_URI || 'mongodb://mongodb:27017/userdb';
mongoose.connect(MONGO_URI).then(() => console.log('User Service: MongoDB connected')).catch(err => console.error(err));

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  phone: { type: String, default: '' },
  address: { type: String, default: '' },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  avatar: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);

async function seedAdmin() {
  const existing = await User.findOne({ email: 'admin@example.com' });
  if (!existing) {
    const hashed = await bcrypt.hash('123', 10);
    await User.create({ name: 'Admin', email: 'admin@example.com', password: hashed, role: 'admin' });
    console.log('Admin user seeded');
  }
}
seedAdmin();

app.get('/health', (req, res) => res.json({ status: 'ok', service: 'user-service' }));

app.post('/register', async (req, res) => {
  try {
    const { name, email, password, phone, address } = req.body;
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed, phone, address });
    res.status(201).json({ message: 'User registered', user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Requires adminSecretKey — prevents self-promotion to admin
app.post('/register-admin', async (req, res) => {
  try {
    const { name, email, password, phone, address, adminSecretKey } = req.body;
    if (!adminSecretKey || adminSecretKey !== ADMIN_REGISTRATION_SECRET) {
      return res.status(403).json({ error: 'Forbidden: Invalid admin registration key' });
    }
    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ error: 'Email already registered' });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed, phone, address, role: 'admin' });
    res.status(201).json({ message: 'Admin registered', user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid password' });
    res.json({ message: 'Login successful', user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/profile/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/profile/:id', async (req, res) => {
  try {
    const { name, phone, address, avatar } = req.body;
    const user = await User.findByIdAndUpdate(req.params.id, { name, phone, address, avatar }, { new: true }).select('-password');
    res.json({ message: 'Profile updated', user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/users', internalAdminOnly, async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`User Service running on port ${PORT}`));
