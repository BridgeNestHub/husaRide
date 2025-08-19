import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User';
import { validateSignup, validateLogin } from '../utils/validation';
import { sendEmail } from '../utils/email';
import { formatPhoneNumber } from '../utils/phoneFormatter';

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    const { error } = validateSignup(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { name, email, password, phone, role = 'passenger' } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create user
    const user = new User({ name, email, password, phone: formatPhoneNumber(phone), role });
    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    // Send welcome email
    try {
      await sendEmail({
        to: email,
        subject: 'Welcome to HusaRide!',
        template: 'welcome',
        data: { name }
      });
      console.log('Welcome email sent successfully to:', email);
    } catch (emailError: any) {
      console.error('Failed to send welcome email:', emailError?.message || emailError);
      // Continue with registration even if email fails
    }

    // Set cookie for session persistence
    res.cookie('token', token, {
      httpOnly: false, // Allow client-side access
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(201).json({
      message: 'User created successfully',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        points: user.points
      }
    });
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { error } = validateLogin(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }

    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Invalid credentials' });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );

    // Set cookie for session persistence
    res.cookie('token', token, {
      httpOnly: false, // Allow client-side access
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        points: user.points
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Logged out successfully' });
});

// Forgot password
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({ error: 'No account found with this email' });
    }
    
    // In a real app, you'd generate a reset token and send email
    // For now, just simulate success
    res.json({ message: 'Password reset link sent to your email' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create admin account (development only)
router.post('/create-admin', async (req, res) => {
  try {
    const adminExists = await User.findOne({ role: 'admin' });
    if (adminExists) {
      return res.status(400).json({ error: 'Admin already exists', admin: { email: adminExists.email } });
    }
    
    const admin = new User({
      name: process.env.ADMIN_NAME!,
      email: process.env.ADMIN_EMAIL!,
      password: process.env.ADMIN_PASSWORD!,
      phone: process.env.ADMIN_PHONE!,
      role: 'admin'
    });
    
    await admin.save();
    res.json({ message: 'Admin account created successfully' });
  } catch (error: any) {
    console.error('Admin creation error:', error);
    res.status(500).json({ error: 'Server error', details: error?.message || error });
  }
});

// Create driver account (development only)
router.post('/create-driver', async (req, res) => {
  try {
    const driver = new User({
      name: process.env.DRIVER_NAME!,
      email: process.env.DRIVER_EMAIL!,
      password: process.env.DRIVER_PASSWORD!,
      phone: process.env.DRIVER_PHONE!,
      role: 'driver'
    });
    
    await driver.save();
    res.json({ message: 'Driver account created successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;