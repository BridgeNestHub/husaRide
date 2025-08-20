import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';

// Import routes
import indexRoutes from '../routes/index';
import authRoutes from '../routes/auth';
import rideRoutes from '../routes/rides';
import driverRoutes from '../routes/driver';
import settingsRoutes from '../routes/settings';
import adminRoutes from '../routes/admin';
import { optionalAuth } from '../utils/auth';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// ✅ Trust proxy for Railway reverse proxy
app.set('trust proxy', 1);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: false // Disable for development
}));

// Rate limiting - more permissive in development
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'development' ? 1000 : 100 // Higher limit for development
});
app.use(limiter);

// CORS
app.use(cors());

// Body parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Static files
app.use(express.static(path.join(__dirname, '../public')));

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Database connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/husaride')
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// Apply optional auth globally for user context
app.use(optionalAuth);

// Routes
app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/rides', rideRoutes);
app.use('/driver', driverRoutes);
app.use('/settings', settingsRoutes);
app.use('/admin', adminRoutes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).render('pages/404', { 
    title: 'Page Not Found',
    user: req.user || null
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).render('pages/error', { 
    title: 'Server Error',
    user: req.user || null,
    error: process.env.NODE_ENV === 'development' ? err : {}
  });
});

app.listen(PORT, () => {
  console.log(`HusaRide server running on port http://localhost:${PORT}`);
});

export default app;