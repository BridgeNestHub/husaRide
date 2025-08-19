import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import { formatPhoneNumber } from '../utils/phoneFormatter';

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phone: string;
  role: 'passenger' | 'driver' | 'admin';
  isVerified: boolean;
  points: number;
  vehicles?: Array<{
    type: string;
    make: string;
    model: string;
    year: number;
    licensePlate: string;
    color: string;
  }>;
  settings?: {
    notifications: {
      email: boolean;
      sms: boolean;
      push: boolean;
    };
    favoriteLocations: Array<{
      name: string;
      address: string;
      type: string;
    }>;
    emergencyContacts: Array<{
      name: string;
      phone: string;
      relationship: string;
    }>;
  };
  createdAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>({
  name: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: true,
    minlength: 6
  },
  phone: {
    type: String,
    required: true
  },
  role: {
    type: String,
    enum: ['passenger', 'driver', 'admin'],
    default: 'passenger'
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  points: {
    type: Number,
    default: 0
  },
  vehicles: [{
    type: {
      type: String,
      enum: ['limo', 'comfort', 'luxury', 'suv', 'van', 'wedding', 'bus']
    },
    make: String,
    model: String,
    year: Number,
    licensePlate: String,
    color: String
  }],
  settings: {
    notifications: {
      email: { type: Boolean, default: true },
      sms: { type: Boolean, default: true },
      push: { type: Boolean, default: true }
    },
    favoriteLocations: [{
      name: String,
      address: String,
      type: { type: String, enum: ['home', 'work', 'other'], default: 'other' }
    }],
    emergencyContacts: [{
      name: String,
      phone: String,
      relationship: String
    }]
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Hash password and format phone before saving
userSchema.pre('save', async function(next) {
  // Format phone number
  if (this.isModified('phone') && this.phone) {
    this.phone = formatPhoneNumber(this.phone);
  }
  
  // Format emergency contact phones
  if (this.isModified('settings.emergencyContacts') && this.settings?.emergencyContacts) {
    this.settings.emergencyContacts.forEach(contact => {
      if (contact.phone) {
        contact.phone = formatPhoneNumber(contact.phone);
      }
    });
  }
  
  // Hash password
  if (!this.isModified('password')) return next();
  
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model<IUser>('User', userSchema);