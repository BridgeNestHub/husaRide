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
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

// Trust proxy for Railway/production
app.set('trust proxy', 1);

// 🔒 Production Security
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "https://maps.googleapis.com", "https://cdnjs.cloudflare.com"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false // Needed for Google Maps
}));

// 🚦 Production Rate Limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: IS_PRODUCTION ? 100 : 1000,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// 🌐 CORS Configuration
app.use(cors({
  origin: IS_PRODUCTION 
    ? ['https://your-domain.com', 'https://husaride-production.up.railway.app'] 
    : true,
  credentials: true
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser());

// 📁 Static Files Setup
const publicPath = path.join(__dirname, '../public');
const viewsPath = path.join(__dirname, '../views');

// Static files with caching and proper MIME types
app.use('/css', express.static(path.join(publicPath, 'css'), {
  maxAge: IS_PRODUCTION ? '1y' : 0, // Cache CSS for 1 year in production
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.css')) {
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
    }
  }
}));

app.use('/js', express.static(path.join(publicPath, 'js'), {
  maxAge: IS_PRODUCTION ? '1y' : 0, // Cache JS for 1 year in production
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js')) {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    }
  }
}));

app.use('/images', express.static(path.join(publicPath, 'images'), {
  maxAge: IS_PRODUCTION ? '30d' : 0, // Cache images for 30 days in production
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath).toLowerCase();
    const mimeTypes = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.gif': 'image/gif',
      '.webp': 'image/webp',
      '.svg': 'image/svg+xml'
    };
    if (mimeTypes[ext]) {
      res.setHeader('Content-Type', mimeTypes[ext]);
    }
  }
}));

// General static files
app.use(express.static(publicPath, {
  maxAge: IS_PRODUCTION ? '1d' : 0 // Cache other static files for 1 day
}));

// View engine
app.set('view engine', 'ejs');
app.set('views', viewsPath);

// 🗄️ Database Connection with Production Settings
const mongoOptions = {
  maxPoolSize: 10,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  bufferCommands: false,
  bufferMaxEntries: 0
};

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/husaride', mongoOptions)
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => {
    console.error('❌ MongoDB connection error:', err);
    process.exit(1);
  });

// Handle MongoDB connection errors after initial connection
mongoose.connection.on('error', (err) => {
  console.error('MongoDB connection error:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('MongoDB disconnected');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Shutting down gracefully...');
  await mongoose.connection.close();
  process.exit(0);
});

// Global auth middleware
app.use(optionalAuth);

// 🛣️ Routes
app.use('/', indexRoutes);
app.use('/auth', authRoutes);
app.use('/rides', rideRoutes);
app.use('/driver', driverRoutes);
app.use('/settings', settingsRoutes);
app.use('/admin', adminRoutes);

// 🏥 Health Check Endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    version: process.env.npm_package_version || '1.0.0'
  });
});

// 🤖 Robots.txt
app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  if (IS_PRODUCTION) {
    res.send(`User-agent: *
Allow: /
Sitemap: https://your-domain.com/sitemap.xml`);
  } else {
    res.send(`User-agent: *
Disallow: /`);
  }
});

// 404 Handler
app.use('*', (req, res) => {
  console.log(`404 - Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).render('pages/404', { 
    title: 'Page Not Found',
    user: req.user || null
  });
});

// 🚨 Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Global error handler:', err);
  
  // Don't leak error details in production
  const errorDetails = IS_PRODUCTION ? {} : { 
    message: err.message, 
    stack: err.stack 
  };

  res.status(err.status || 500).render('pages/error', { 
    title: 'Server Error',
    user: req.user || null,
    error: errorDetails
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 HusaRide ${IS_PRODUCTION ? 'PRODUCTION' : 'DEVELOPMENT'} server running on port ${PORT}`);
  console.log(`📁 Static files: ${publicPath}`);
  console.log(`📋 Views: ${viewsPath}`);
  if (!IS_PRODUCTION) {
    console.log(`🌐 Health check: http://localhost:${PORT}/health`);
  }
});

export default app;