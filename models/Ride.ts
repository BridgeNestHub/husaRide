import mongoose, { Document, Schema } from 'mongoose';
import { formatPhoneNumber } from '../utils/phoneFormatter';

export interface IRide extends Document {
  passenger?: mongoose.Types.ObjectId;
  driver?: mongoose.Types.ObjectId;
  guestInfo?: {
    fullName: string;
    email: string;
    phone: string;
  };
  pickupLocation: string;
  dropoffLocation: string;
  vehicleType: 'limo' | 'comfort' | 'luxury' | 'suv' | 'van' | 'wedding' | 'bus';
  status: 'pending' | 'accepted' | 'in-progress' | 'completed' | 'cancelled';
  fare: number;
  distance?: number;
  estimatedArrival?: Date;
  createdAt: Date;
  acceptedAt?: Date;
  completedAt?: Date;
}

const rideSchema = new Schema<IRide>({
  passenger: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  driver: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  guestInfo: {
    fullName: {
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          return !v || (v.length >= 2 && v.length <= 100);
        },
        message: 'Full name must be between 2 and 100 characters'
      }
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      validate: {
        validator: function(v: string) {
          return !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: 'Please provide a valid email address'
      }
    },
    phone: {
      type: String,
      trim: true,
      validate: {
        validator: function(v: string) {
          return !v || /^[+]?[1-9]\d{1,14}$/.test(v.replace(/[\s()-]/g, ''));
        },
        message: 'Please provide a valid phone number'
      }
    }
  },
  pickupLocation: {
    type: String,
    required: true
  },
  dropoffLocation: {
    type: String,
    required: true
  },
  vehicleType: {
    type: String,
    enum: ['limo', 'comfort', 'luxury', 'suv', 'van', 'wedding', 'bus'],
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'in-progress', 'completed', 'cancelled'],
    default: 'pending'
  },
  fare: {
    type: Number,
    required: true
  },
  distance: {
    type: Number
  },
  estimatedArrival: {
    type: Date
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  acceptedAt: {
    type: Date
  },
  completedAt: {
    type: Date
  }
});

// Format guest phone number before saving
rideSchema.pre('save', function(next) {
  if (this.guestInfo?.phone) {
    this.guestInfo.phone = formatPhoneNumber(this.guestInfo.phone);
  }
  next();
});

export default mongoose.model<IRide>('Ride', rideSchema);