import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import cookieParser from 'cookie-parser';
import fs from 'fs';

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

// Static files - with verification
const publicPath = path.join(__dirname, '../public');
console.log('🔍 Checking static files setup:');
console.log('Current __dirname:', __dirname);
console.log('Looking for public directory at:', publicPath);
console.log('Public directory exists:', fs.existsSync(publicPath));

if (fs.existsSync(publicPath)) {
  const contents = fs.readdirSync(publicPath);
  console.log('Public directory contents:', contents);
  
  // Check for CSS directory specifically
  const cssPath = path.join(publicPath, 'css');
  if (fs.existsSync(cssPath)) {
    const cssFiles = fs.readdirSync(cssPath);
    console.log('✅ CSS files available:', cssFiles);
  } else {
    console.log('❌ CSS directory not found at:', cssPath);
  }
} else {
  console.log('❌ Public directory not found! Static files will not work.');
  
  // Let's see what directories are available
  const parentDir = path.dirname(__dirname);
  console.log('Parent directory (__dirname/..):', parentDir);
  if (fs.existsSync(parentDir)) {
    const parentContents = fs.readdirSync(parentDir);
    console.log('Parent directory contents:', parentContents);
  }
}

app.use(express.static(publicPath));

// View engine setup
const viewsPath = path.join(__dirname, '../views');
console.log('Views directory path:', viewsPath);
console.log('Views directory exists:', fs.existsSync(viewsPath));

app.set('view engine', 'ejs');
app.set('views', viewsPath);

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
  console.log(`🚀 HusaRide server running on port http://localhost:${PORT}`);
  console.log(`📁 Static files served from: ${publicPath}`);
  console.log(`📋 Views served from: ${viewsPath}`);
});

export default app;