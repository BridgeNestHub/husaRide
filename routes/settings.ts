import express from 'express';
import bcrypt from 'bcryptjs';
import User from '../models/User';
import { auth } from '../utils/auth';
import { sendEmail } from '../utils/email';
import { formatPhoneNumber } from '../utils/phoneFormatter';

const router = express.Router();

// Get user settings
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user?.userId).select('-password');
    res.json({ settings: user?.settings || {} });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update notification preferences
router.patch('/notifications', auth, async (req, res) => {
  try {
    const { email, sms, push } = req.body;
    await User.findByIdAndUpdate(req.user?.userId, {
      'settings.notifications': { email, sms, push }
    });
    res.json({ message: 'Notification preferences updated' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add favorite location
router.post('/favorite-locations', auth, async (req, res) => {
  try {
    const { name, address, type } = req.body;
    await User.findByIdAndUpdate(req.user?.userId, {
      $push: { 'settings.favoriteLocations': { name, address, type } }
    });
    res.json({ message: 'Favorite location added' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove favorite location
router.delete('/favorite-locations/:id', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user?.userId, {
      $pull: { 'settings.favoriteLocations': { _id: req.params.id } }
    });
    res.json({ message: 'Favorite location removed' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Add emergency contact
router.post('/emergency-contacts', auth, async (req, res) => {
  try {
    const { name, phone, relationship } = req.body;
    await User.findByIdAndUpdate(req.user?.userId, {
      $push: { 'settings.emergencyContacts': { name, phone: formatPhoneNumber(phone), relationship } }
    });
    res.json({ message: 'Emergency contact added' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove emergency contact
router.delete('/emergency-contacts/:id', auth, async (req, res) => {
  try {
    await User.findByIdAndUpdate(req.user?.userId, {
      $pull: { 'settings.emergencyContacts': { _id: req.params.id } }
    });
    res.json({ message: 'Emergency contact removed' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset password
router.post('/reset-password', auth, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user?.userId);
    
    if (!user || !(await user.comparePassword(currentPassword))) {
      return res.status(400).json({ error: 'Current password is incorrect' });
    }
    
    user.password = newPassword;
    await user.save();
    
    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;