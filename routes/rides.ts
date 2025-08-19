import express from 'express';
import Ride from '../models/Ride';
import User from '../models/User';
import { auth } from '../utils/auth';
import { sendEmail } from '../utils/email';
import { formatPhoneNumber } from '../utils/phoneFormatter';

const router = express.Router();

// Book a ride
router.post('/book', async (req, res) => {
  try {
    const { fullName, email, phone, pickupLocation, dropoffLocation, vehicleType } = req.body;
    const userId = req.user?.userId;

    // For guest bookings, require personal info
    if (!userId && (!fullName || !email || !phone)) {
      return res.status(400).json({ error: 'Personal information is required for booking' });
    }

    if (!pickupLocation || !dropoffLocation || !vehicleType) {
      return res.status(400).json({ error: 'Pickup, dropoff, and vehicle type are required' });
    }

    // Calculate fare based on mileage
    const fareRates = {
      limo: 2.5,
      comfort: 1.8,
      suv: 3.2,
      van: 4.5,
      wedding: 8.0,
      bus: 6.0,
      convention: 5.5,
      sports: 4.8,
      theme: 3.8,
      concert: 4.2
    };

    const distance = Math.floor(Math.random() * 15) + 1; // Mock distance in miles
    const estimatedTime = distance / 25; // Estimated time in hours (25 mph average)
    const distanceFare = distance * fareRates[vehicleType as keyof typeof fareRates];
    const timeFare = estimatedTime * (fareRates[vehicleType as keyof typeof fareRates] * 0.5);
    const fare = distanceFare + timeFare;

    // Create ride with guest info if not logged in
    const rideData = {
      pickupLocation,
      dropoffLocation,
      vehicleType,
      fare: parseFloat(fare.toFixed(2)),
      distance
    };

    // Add passenger info based on login status
    if (userId) {
      (rideData as any).passenger = userId;
    } else {
      // For guest bookings, store contact info
      (rideData as any).guestInfo = {
        fullName,
        email,
        phone: formatPhoneNumber(phone)
      };
    }

    const ride = new Ride(rideData);

    await ride.save();

    // Get customer info for email
    let customerName, customerEmail;
    if (userId) {
      const user = await User.findById(userId);
      customerName = user?.name;
      customerEmail = user?.email;
    } else {
      customerName = fullName;
      customerEmail = email;
    }

    // Send confirmation email to customer (skip if email service fails)
    if (customerEmail) {
      try {
        await sendEmail({
          to: customerEmail,
          subject: 'Ride Booking Confirmation - HusaRide',
          template: 'booking-confirmation',
          data: {
            customerName,
            pickupLocation,
            dropoffLocation,
            vehicleType,
            fare: fare.toFixed(2),
            rideId: ride._id,
            bookingDate: new Date().toLocaleDateString()
          }
        });
      } catch (emailError: any) {
        console.warn('Failed to send confirmation email:', emailError?.message || emailError);
      }
    }

    // Notify available drivers (skip if email service fails)
    try {
      const drivers = await User.find({ role: 'driver' });
      for (const driver of drivers) {
        try {
          await sendEmail({
            to: driver.email,
            subject: 'New Ride Request',
            template: 'ride-request',
            data: {
              driverName: driver.name,
              customerName,
              pickupLocation,
              dropoffLocation,
              vehicleType,
              fare: fare.toFixed(2),
              rideId: ride._id
            }
          });
        } catch (driverEmailError: any) {
          console.warn(`Failed to notify driver ${driver.email}:`, driverEmailError?.message || driverEmailError);
        }
      }
    } catch (driversError: any) {
      console.warn('Failed to notify drivers:', driversError?.message || driversError);
    }

    res.status(201).json({
      message: 'Ride booked successfully',
      ride: {
        id: ride._id,
        pickupLocation: ride.pickupLocation,
        dropoffLocation: ride.dropoffLocation,
        vehicleType: ride.vehicleType,
        fare: ride.fare,
        status: ride.status
      }
    });
  } catch (error) {
    console.error('Booking error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user's rides
router.get('/my-rides', auth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const rides = await Ride.find({ passenger: userId })
      .populate('driver', 'name phone')
      .sort({ createdAt: -1 });

    res.json({ rides });
  } catch (error) {
    console.error('Get rides error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user profile with recent rides
router.get('/profile', auth, async (req, res) => {
  try {
    const userId = req.user?.userId;
    const user = await User.findById(userId).select('-password');
    const recentRides = await Ride.find({ passenger: userId })
      .populate('driver', 'name phone')
      .sort({ createdAt: -1 })
      .limit(5);

    res.json({ user, recentRides });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Cancel ride
router.patch('/:rideId/cancel', auth, async (req, res) => {
  try {
    const { rideId } = req.params;
    const userId = req.user?.userId;

    const ride = await Ride.findOne({ _id: rideId, passenger: userId });
    if (!ride) {
      return res.status(404).json({ error: 'Ride not found' });
    }

    if (ride.status !== 'pending' && ride.status !== 'accepted') {
      return res.status(400).json({ error: 'Cannot cancel ride in current status' });
    }

    ride.status = 'cancelled';
    await ride.save();

    // Notify driver if assigned
    if (ride.driver) {
      const driver = await User.findById(ride.driver);
      if (driver) {
        await sendEmail({
          to: driver.email,
          subject: 'Ride Cancelled',
          template: 'ride-cancelled',
          data: {
            driverName: driver.name,
            pickupLocation: ride.pickupLocation,
            dropoffLocation: ride.dropoffLocation
          }
        });
      }
    }

    res.json({ message: 'Ride cancelled successfully' });
  } catch (error) {
    console.error('Cancel ride error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;