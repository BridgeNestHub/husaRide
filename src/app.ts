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

// Static files - with verification and multiple fallbacks
const possiblePublicPaths = [
  path.join(__dirname, '../public'),     // Expected location after build
  path.join(__dirname, '../../public'),  // If something went wrong with build structure
  path.join(process.cwd(), 'public'),    // Fallback to process working directory
  path.join(process.cwd(), 'dist/public') // Another possible location
];

let publicPath = '';
let foundPublic = false;

console.log('🔍 Checking static files setup:');
console.log('Current __dirname:', __dirname);
console.log('Current process.cwd():', process.cwd());

for (const testPath of possiblePublicPaths) {
  console.log(`Testing path: ${testPath}`);
  if (fs.existsSync(testPath)) {
    publicPath = testPath;
    foundPublic = true;
    console.log('✅ Found public directory at:', testPath);
    
    const contents = fs.readdirSync(testPath);
    console.log('Public directory contents:', contents);
    
    // Check for CSS directory specifically
    const cssPath = path.join(testPath, 'css');
    if (fs.existsSync(cssPath)) {
      const cssFiles = fs.readdirSync(cssPath);
      console.log('✅ CSS files available:', cssFiles);
    } else {
      console.log('❌ CSS directory not found in:', testPath);
    }
    break;
  } else {
    console.log('❌ Not found at:', testPath);
  }
}

if (!foundPublic) {
  console.log('❌ No public directory found in any expected location!');
  
  // Debug: show what's actually in these directories
  const debugPaths = [__dirname, path.dirname(__dirname), process.cwd()];
  debugPaths.forEach(dir => {
    if (fs.existsSync(dir)) {
      console.log(`Contents of ${dir}:`, fs.readdirSync(dir));
    }
  });
} else {
  console.log('📁 Using public directory:', publicPath);
}

app.use(express.static(publicPath, {
  setHeaders: (res, path) => {
    if (path.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css');
    } else if (path.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (path.endsWith('.jpg') || path.endsWith('.jpeg')) {
      res.setHeader('Content-Type', 'image/jpeg');
    } else if (path.endsWith('.png')) {
      res.setHeader('Content-Type', 'image/png');
    }
  }
}));

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