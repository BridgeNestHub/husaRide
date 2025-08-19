import express from 'express';
import jwt from 'jsonwebtoken';
import Ride from '../models/Ride';
import User from '../models/User';
import { auth, requireRole } from '../utils/auth';
import { sendEmail } from '../utils/email';

const router = express.Router();

// Driver login page
router.get('/login', (req, res) => {
  res.render('driver/login', {
    title: 'Driver Login - HusaRide',
    user: null
  });
});

// Driver login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email, role: 'driver' });
    
    if (!user || !(await user.comparePassword(password))) {
      return res.status(400).json({ error: 'Invalid driver credentials' });
    }
    
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );
    
    res.cookie('driverToken', token, {
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

// Driver dashboard
router.get('/dashboard', auth, requireRole('driver'), async (req, res) => {
  try {
    const driverId = req.user?.userId;
    
    // Get pending rides
    const pendingRides = await Ride.find({ status: 'pending' })
      .populate('passenger', 'name email phone')
      .sort({ createdAt: -1 });

    // Get driver's accepted rides
    const myRides = await Ride.find({ driver: driverId })
      .populate('passenger', 'name email phone')
      .sort({ createdAt: -1 });
    
    // Get driver info
    const driver = await User.findById(driverId);
    
    // Add sample vehicle data for existing drivers (temporary)
    if (driver && (!driver.vehicles || driver.vehicles.length === 0)) {
      driver.vehicles = [
        {
          type: 'comfort',
          make: 'Toyota',
          model: 'Camry',
          year: 2020,
          color: 'Silver',
          licensePlate: 'ABC-123'
        }
      ];
      await driver.save();
    }

    res.render('driver/dashboard', {
      title: 'Driver Dashboard - HusaRide',
      pendingRides,
      myRides,
      user: driver
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).render('pages/error', { 
      title: 'Server Error',
      user: req.user || null,
      error: process.env.NODE_ENV === 'development' ? error : {}
    });
  }
});

// Accept ride
router.patch('/rides/:rideId/accept', auth, requireRole('driver'), async (req, res) => {
  try {
    const { rideId } = req.params;
    const driverId = req.user?.userId;

    const ride = await Ride.findById(rideId).populate('passenger', 'name email');
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (ride.status !== 'pending') {
      return res.status(400).json({ error: 'Ride is no longer available' });
    }

    // Accept the ride
    ride.driver = driverId;
    ride.status = 'accepted';
    ride.acceptedAt = new Date();
    ride.estimatedArrival = new Date(Date.now() + (Math.floor(Math.random() * 8) + 3) * 60000); // 3-10 minutes
    await ride.save();

    // Get driver info
    const driver = await User.findById(driverId);

    // Notify passenger
    const customerEmail = ride.passenger ? (ride.passenger as any).email : ride.guestInfo?.email;
    const customerName = ride.passenger ? (ride.passenger as any).name : ride.guestInfo?.fullName;
    
    try {
      if (customerEmail && driver) {
        await sendEmail({
          to: customerEmail,
          subject: 'Your Ride Has Been Accepted!',
          template: 'ride-accepted-customer',
          data: {
            customerName,
            driverName: driver.name,
            driverPhone: driver.phone,
            pickupLocation: ride.pickupLocation,
            dropoffLocation: ride.dropoffLocation,
            estimatedArrival: ride.estimatedArrival?.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
          }
        });
      }
      
      // Notify driver
      if (driver) {
        await sendEmail({
          to: driver.email,
          subject: 'Ride Accepted - Customer Details',
          template: 'ride-accepted-driver',
          data: {
            driverName: driver.name,
            customerName,
            customerPhone: ride.passenger ? (ride.passenger as any).phone : ride.guestInfo?.phone,
            pickupLocation: ride.pickupLocation,
            dropoffLocation: ride.dropoffLocation,
            estimatedArrival: ride.estimatedArrival?.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }),
            fare: ride.fare
          }
        });
      }
    } catch (emailError) {
      console.log('Email notification failed, but ride accepted successfully:', emailError.message);
    }

    res.json({ 
      message: 'Ride accepted successfully',
      ride: {
        id: ride._id,
        status: ride.status,
        estimatedArrival: ride.estimatedArrival
      }
    });
  } catch (error) {
    console.error('Accept ride error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Complete ride
router.patch('/rides/:rideId/complete', auth, requireRole('driver'), async (req, res) => {
  try {
    const { rideId } = req.params;
    const driverId = req.user?.userId;

    const ride = await Ride.findOne({ _id: rideId, driver: driverId })
      .populate('passenger', 'name email');
    
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (ride.status !== 'accepted' && ride.status !== 'in-progress') {
      return res.status(400).json({ error: 'Cannot complete ride in current status' });
    }

    // Complete the ride
    ride.status = 'completed';
    ride.completedAt = new Date();
    await ride.save();

    // Award points to passenger (if registered) and send customer email
    const driver = await User.findById(driverId);
    const customerEmail = ride.passenger ? (await User.findById(ride.passenger))?.email : ride.guestInfo?.email;
    const customerName = ride.passenger ? (await User.findById(ride.passenger))?.name : ride.guestInfo?.fullName;
    let pointsEarned = 0;
    
    if (ride.passenger) {
      const passenger = await User.findById(ride.passenger);
      if (passenger) {
        pointsEarned = Math.floor(ride.fare / 10);
        passenger.points += pointsEarned;
        await passenger.save();
      }
    }
    
    // Send email notifications
    try {
      // Send thank you email to customer
      if (customerEmail && driver) {
        await sendEmail({
          to: customerEmail,
          subject: 'Ride Completed - Thank You!',
          template: 'ride-completed-customer',
          data: {
            customerName,
            pickupLocation: ride.pickupLocation,
            dropoffLocation: ride.dropoffLocation,
            fare: ride.fare.toFixed(2),
            pointsEarned,
            driverName: driver.name
          }
        });
      }

      // Notify admin
      const customerPhone = ride.passenger ? (await User.findById(ride.passenger))?.phone : ride.guestInfo?.phone;
      
      if (process.env.ADMIN_EMAIL && driver) {
        await sendEmail({
          to: process.env.ADMIN_EMAIL,
          subject: 'Trip Completed - Summary',
          template: 'trip-summary-admin',
          data: {
            rideId: ride._id,
            driverName: driver.name,
            driverEmail: driver.email,
            driverPhone: driver.phone,
            customerName,
            customerEmail,
            customerPhone,
            pickupLocation: ride.pickupLocation,
            dropoffLocation: ride.dropoffLocation,
            vehicleType: ride.vehicleType,
            fare: ride.fare.toFixed(2),
            completedAt: new Date().toLocaleString(),
            pointsAwarded: Math.floor(ride.fare / 10)
          }
        });
      }
    } catch (emailError) {
      console.log('Email notifications failed, but ride completed successfully:', emailError.message);
    }
    
    res.json({ message: 'Ride completed successfully' });
  } catch (error) {
    console.error('Complete ride error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Driver logout
router.post('/logout', (req, res) => {
  res.clearCookie('driverToken');
  res.json({ message: 'Logged out successfully' });
});

// Get driver's rides
router.get('/rides', auth, requireRole('driver'), async (req, res) => {
  try {
    const driverId = req.user?.userId;
    const rides = await Ride.find({ driver: driverId })
      .populate('passenger', 'name phone')
      .sort({ createdAt: -1 });

    res.json({ rides });
  } catch (error) {
    console.error('Get driver rides error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;