import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User';
import Ride from '../models/Ride';
import { auth, requireRole } from '../utils/auth';
import { formatPhoneNumber } from '../utils/phoneFormatter';

// CSRF protection middleware
const csrfProtection = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const token = req.headers['x-csrf-token'] as string;
  const sessionToken = req.cookies['csrf-token'];
  
  if (!token || token !== sessionToken) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }
  next();
};

const router = express.Router();

// Admin login page
router.get('/login', (req, res) => {
  res.render('admin/login', {
    title: 'Admin Login - HusaRide',
    user: null
  });
});

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, role: 'admin' });
    
    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ error: 'Invalid admin credentials' });
    }
    
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '7d' }
    );
    
    res.cookie('adminToken', token, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });
    

    
    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin dashboard
router.get('/dashboard', auth, requireRole('admin'), async (req, res) => {
  try {
    const adminId = req.user?.userId;
    const admin = await User.findById(adminId);
    
    const totalUsers = await User.countDocuments();
    const totalDrivers = await User.countDocuments({ role: 'driver' });
    const totalPassengers = await User.countDocuments({ role: 'passenger' });
    const totalRides = await Ride.countDocuments();
    const completedRides = await Ride.countDocuments({ status: 'completed' });
    const pendingRides = await Ride.countDocuments({ status: 'pending' });
    
    const recentRides = await Ride.find()
      .populate('passenger', 'name email')
      .populate('driver', 'name email')
      .sort({ createdAt: -1 })
      .limit(10);

    res.render('admin/dashboard', {
      title: 'Admin Dashboard - HusaRide',
      stats: {
        totalUsers,
        totalDrivers,
        totalPassengers,
        totalRides,
        completedRides,
        pendingRides
      },
      recentRides,
      user: admin
    });
  } catch (error) {
    console.error('Admin dashboard error:', error);
    res.status(500).render('pages/error', { 
      title: 'Server Error',
      error: process.env.NODE_ENV === 'development' ? error : {},
      user: null
    });
  }
});

// Get all users
router.get('/users', auth, requireRole('admin'), async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ users });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all rides
router.get('/rides', auth, requireRole('admin'), async (req, res) => {
  try {
    const rides = await Ride.find()
      .populate('passenger', 'name email phone')
      .populate('driver', 'name email phone')
      .sort({ createdAt: -1 });
    res.json({ rides });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user role
router.patch('/users/:userId/role', auth, requireRole('admin'), csrfProtection, async (req, res) => {
  try {
    const { role } = req.body;
    await User.findByIdAndUpdate(req.params.userId, { role });
    res.json({ message: 'User role updated successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset user password
router.patch('/users/:userId/reset-password', auth, requireRole('admin'), async (req, res) => {
  try {
    const { newPassword } = req.body;
    
    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long' });
    }
    
    const user = await User.findById(req.params.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    user.password = newPassword;
    await user.save();
    
    res.json({ message: 'Password reset successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user statistics
router.get('/users/:userId/stats', auth, requireRole('admin'), async (req, res) => {
  try {
    const userId = req.params.userId;
    console.log('Fetching stats for user:', userId);
    
    const totalRides = await Ride.countDocuments({ passenger: userId }) || 0;
    const completedRides = await Ride.countDocuments({ passenger: userId, status: 'completed' }) || 0;
    
    console.log('User rides count:', { totalRides, completedRides });
    
    const spending = await Ride.aggregate([
      { $match: { passenger: new mongoose.Types.ObjectId(userId), status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$fare' } } }
    ]);
    
    const totalSpent = (spending && spending.length > 0 && spending[0].total) ? spending[0].total : 0;
    const pointsEarned = Math.floor(totalSpent / 10) || 0;
    const averageRideCost = completedRides > 0 ? (totalSpent / completedRides) : 0;
    
    console.log('User spending:', { totalSpent, pointsEarned, averageRideCost });
    
    const result = {
      totalRides: Number(totalRides) || 0,
      completedRides: Number(completedRides) || 0,
      totalSpent: Number(totalSpent).toFixed(2),
      pointsEarned: Number(pointsEarned) || 0,
      averageRideCost: Number(averageRideCost).toFixed(2)
    };
    
    console.log('Sending user stats:', result);
    res.json(result);
  } catch (error) {
    console.error('User stats error:', error);
    res.status(500).json({ 
      totalRides: 0,
      completedRides: 0,
      totalSpent: '0.00',
      pointsEarned: 0,
      averageRideCost: '0.00'
    });
  }
});

// Get driver statistics
router.get('/drivers/:driverId/stats', auth, requireRole('admin'), async (req, res) => {
  try {
    const driverId = req.params.driverId;
    
    const totalRides = await Ride.countDocuments({ driver: driverId }) || 0;
    const completedRides = await Ride.countDocuments({ driver: driverId, status: 'completed' }) || 0;
    
    const earnings = await Ride.aggregate([
      { $match: { driver: new mongoose.Types.ObjectId(driverId), status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$fare' } } }
    ]);
    
    const totalEarnings = (earnings && earnings.length > 0 && earnings[0].total) ? earnings[0].total : 0;
    const successRate = totalRides > 0 ? Math.round((completedRides / totalRides) * 100) : 0;
    
    const result = {
      totalRides: Number(totalRides) || 0,
      completedRides: Number(completedRides) || 0,
      totalEarnings: Number(totalEarnings).toFixed(2),
      successRate: Number(successRate) || 0,
      averageRating: null
    };
    
    res.json(result);
  } catch (error) {
    console.error('Driver stats error:', error);
    res.status(500).json({ 
      totalRides: 0,
      completedRides: 0,
      totalEarnings: '0.00',
      successRate: 0,
      averageRating: null
    });
  }
});

// Update user field
router.patch('/users/:userId/update-field', auth, requireRole('admin'), async (req, res) => {
  try {
    const { field, value } = req.body;
    const userId = req.params.userId;
    
    // Validate field
    const allowedFields = ['name', 'email', 'phone', 'role'];
    if (!allowedFields.includes(field)) {
      return res.status(400).json({ error: 'Invalid field' });
    }
    
    // Validate role if updating role
    if (field === 'role' && !['passenger', 'driver', 'admin'].includes(value)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    
    // Validate email format if updating email
    if (field === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return res.status(400).json({ error: 'Invalid email format' });
    }
    
    // Check if email already exists (if updating email)
    if (field === 'email') {
      const existingUser = await User.findOne({ email: value, _id: { $ne: userId } });
      if (existingUser) {
        return res.status(400).json({ error: 'Email already exists' });
      }
    }
    
    // Format phone number if updating phone field
    const finalValue = field === 'phone' ? formatPhoneNumber(value) : value;
    
    // Update the field
    const updateData = { [field]: finalValue };
    const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true });
    
    // Send email notification to driver if it's a driver account
    if (updatedUser && updatedUser.role === 'driver') {
      try {
        const { sendEmail } = require('../utils/email');
        await sendEmail({
          to: updatedUser.email,
          subject: 'Account Information Updated',
          template: 'account-updated',
          data: {
            driverName: updatedUser.name,
            field: field.charAt(0).toUpperCase() + field.slice(1),
            newValue: value,
            updatedBy: 'Administrator'
          }
        });
      } catch (emailError: any) {
        console.log('Email notification failed:', emailError?.message || emailError);
      }
    }
    
    res.json({ message: `${field} updated successfully` });
  } catch (error) {
    console.error('Update field error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user vehicles
router.patch('/users/:userId/vehicles', auth, requireRole('admin'), async (req, res) => {
  try {
    const { action, vehicleData } = req.body;
    const userId = req.params.userId;
    
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (!user.vehicles) {
      user.vehicles = [];
    }
    
    if (action === 'add') {
      user.vehicles.push(vehicleData);
    } else if (action === 'edit') {
      if (user.vehicles[vehicleData.index]) {
        user.vehicles[vehicleData.index] = {
          type: vehicleData.type,
          make: vehicleData.make,
          model: vehicleData.model,
          year: vehicleData.year,
          color: vehicleData.color,
          licensePlate: vehicleData.licensePlate
        };
      }
    } else if (action === 'delete') {
      user.vehicles.splice(vehicleData.index, 1);
    }
    
    await user.save();
    
    // Send email notification to driver
    if (user.role === 'driver') {
      try {
        const { sendEmail } = require('../utils/email');
        await sendEmail({
          to: user.email,
          subject: 'Vehicle Information Updated',
          template: 'account-updated',
          data: {
            driverName: user.name,
            field: 'Vehicle Information',
            newValue: `${action.charAt(0).toUpperCase() + action.slice(1)} vehicle operation completed`,
            updatedBy: 'Administrator'
          }
        });
      } catch (emailError: any) {
        console.log('Email notification failed:', emailError?.message || emailError);
      }
    }
    
    res.json({ message: 'Vehicle updated successfully' });
  } catch (error) {
    console.error('Update vehicle error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Accept ride and assign driver
router.patch('/rides/:rideId/accept', auth, requireRole('admin'), async (req, res) => {
  try {
    const { driverId } = req.body;
    const rideId = req.params.rideId;
    
    const ride = await Ride.findById(rideId).populate('passenger', 'name email');
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }
    
    const driver = await User.findById(driverId);
    if (!driver || driver.role !== 'driver') {
      return res.status(400).json({ error: 'Invalid driver selected' });
    }
    
    ride.driver = driverId;
    ride.status = 'accepted';
    ride.acceptedAt = new Date();
    await ride.save();
    
    // Send email to passenger
    try {
      const { sendEmail } = require('../utils/email');
      await sendEmail({
        to: ride.passenger?.email || ride.guestInfo?.email,
        subject: 'Ride Accepted - Driver Assigned',
        template: 'ride-accepted',
        data: {
          passengerName: ride.passenger?.name || ride.guestInfo?.fullName,
          driverName: driver.name,
          driverPhone: driver.phone,
          pickupLocation: ride.pickupLocation,
          dropoffLocation: ride.dropoffLocation,
          vehicleType: ride.vehicleType,
          fare: ride.fare
        }
      });
    } catch (emailError: any) {
      console.log('Passenger email failed:', emailError?.message || emailError);
    }
    
    // Send email to driver
    try {
      const { sendEmail } = require('../utils/email');
      await sendEmail({
        to: driver.email,
        subject: 'New Ride Assignment',
        template: 'ride-assigned',
        data: {
          driverName: driver.name,
          passengerName: ride.passenger?.name || ride.guestInfo?.fullName,
          passengerPhone: ride.passenger?.phone || ride.guestInfo?.phone,
          pickupLocation: ride.pickupLocation,
          dropoffLocation: ride.dropoffLocation,
          vehicleType: ride.vehicleType,
          fare: ride.fare
        }
      });
    } catch (emailError: any) {
      console.log('Driver email failed:', emailError?.message || emailError);
    }
    
    res.json({ message: 'Ride accepted and driver assigned successfully' });
  } catch (error) {
    console.error('Accept ride error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Reassign ride to different driver
router.patch('/rides/:rideId/reassign', auth, requireRole('admin'), async (req, res) => {
  try {
    const { driverId } = req.body;
    const rideId = req.params.rideId;
    
    const ride = await Ride.findById(rideId).populate('passenger', 'name email').populate('driver', 'name email');
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }
    
    if (ride.status !== 'accepted') {
      return res.status(400).json({ error: 'Only accepted rides can be reassigned' });
    }
    
    const newDriver = await User.findById(driverId);
    if (!newDriver || newDriver.role !== 'driver') {
      return res.status(400).json({ error: 'Invalid driver selected' });
    }
    
    const oldDriver = ride.driver;
    ride.driver = driverId;
    await ride.save();
    
    // Send email to passenger about driver change
    try {
      const { sendEmail } = require('../utils/email');
      await sendEmail({
        to: ride.passenger?.email || ride.guestInfo?.email,
        subject: 'Driver Changed for Your Ride',
        template: 'ride-accepted',
        data: {
          passengerName: ride.passenger?.name || ride.guestInfo?.fullName,
          driverName: newDriver.name,
          driverPhone: newDriver.phone,
          pickupLocation: ride.pickupLocation,
          dropoffLocation: ride.dropoffLocation,
          vehicleType: ride.vehicleType,
          fare: ride.fare
        }
      });
    } catch (emailError) {
      console.log('Passenger email failed:', emailError.message);
    }
    
    // Send email to new driver
    try {
      const { sendEmail } = require('../utils/email');
      await sendEmail({
        to: newDriver.email,
        subject: 'New Ride Assignment',
        template: 'ride-assigned',
        data: {
          driverName: newDriver.name,
          passengerName: ride.passenger?.name || ride.guestInfo?.fullName,
          passengerPhone: ride.passenger?.phone || ride.guestInfo?.phone,
          pickupLocation: ride.pickupLocation,
          dropoffLocation: ride.dropoffLocation,
          vehicleType: ride.vehicleType,
          fare: ride.fare
        }
      });
    } catch (emailError) {
      console.log('New driver email failed:', emailError.message);
    }
    
    // Send email to old driver about reassignment
    if (oldDriver) {
      try {
        const { sendEmail } = require('../utils/email');
        await sendEmail({
          to: oldDriver.email,
          subject: 'Ride Reassigned',
          template: 'account-updated',
          data: {
            driverName: oldDriver.name,
            field: 'Ride Assignment',
            newValue: `Ride from ${ride.pickupLocation} to ${ride.dropoffLocation} has been reassigned to another driver`,
            updatedBy: 'Administrator'
          }
        });
      } catch (emailError) {
        console.log('Old driver email failed:', emailError.message);
      }
    }
    
    // Send email to admin about reassignment
    try {
      const { sendEmail } = require('../utils/email');
      await sendEmail({
        to: process.env.ADMIN_EMAIL,
        subject: 'Ride Reassignment Completed',
        template: 'account-updated',
        data: {
          driverName: 'Administrator',
          field: 'Ride Reassignment',
          newValue: `Ride from ${ride.pickupLocation} to ${ride.dropoffLocation} has been reassigned from ${oldDriver?.name || 'Previous Driver'} to ${newDriver.name}`,
          updatedBy: 'System'
        }
      });
    } catch (emailError) {
      console.log('Admin notification email failed:', emailError.message);
    }
    
    res.json({ message: 'Ride reassigned successfully' });
  } catch (error) {
    console.error('Reassign ride error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get available drivers for reassignment
router.get('/drivers/available', auth, requireRole('admin'), async (req, res) => {
  try {
    const drivers = await User.find({ role: 'driver' }).select('name email phone vehicles');
    res.json({ drivers });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Admin logout
router.post('/logout', (req, res) => {
  res.clearCookie('adminToken');
  res.json({ message: 'Logged out successfully' });
});

// Delete user
router.delete('/users/:userId', auth, requireRole('admin'), async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.userId);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;