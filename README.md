# HusaRide - Ride-Hailing Platform

A modern ride-hailing platform built with Node.js, TypeScript, Express, and MongoDB that connects passengers with drivers.

## Features

### For Passengers
- **Easy Booking**: Book rides with pickup/dropoff locations and vehicle type selection
- **Guest & Registered Users**: Book rides without signup (encouraged to signup for points)
- **Points System**: Earn points with every ride (1 point per $10 spent)
- **Email Notifications**: Get notified when rides are accepted and completed
- **Multiple Vehicle Types**: Choose from Limo, Comfort, SUV, Van, or Wedding cars

### For Drivers
- **Driver Dashboard**: View available rides and manage accepted rides
- **Email Notifications**: Get notified of new ride requests
- **Ride Management**: Accept rides and mark them as completed
- **Real-time Updates**: Dashboard updates with ride status changes

### System Features
- **Secure Authentication**: JWT-based authentication with bcrypt password hashing
- **Email System**: Automated email notifications for all ride events
- **Responsive Design**: Mobile-friendly interface
- **TypeScript**: Type-safe development with modern JavaScript features

## Tech Stack

- **Backend**: Node.js, Express.js, TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT tokens, bcrypt for password hashing
- **Email**: Nodemailer for email notifications
- **Frontend**: EJS templates, vanilla JavaScript
- **Styling**: CSS3 with responsive design
- **Security**: Helmet, CORS, rate limiting

## Project Structure

```
OnRide/
├── .env                      # Environment variables
├── .gitignore               # Git ignore rules
├── package.json             # Dependencies and scripts
├── package-lock.json        # Dependency lock file
├── tsconfig.json           # TypeScript configuration
├── railway.toml            # Railway deployment config
├── README.md               # Project documentation
├── DesignDoc.md            # Design documentation
├── IOSDesign.md            # iOS design specifications
├── test-hamburger.html     # Test file for UI components
├── src/
│   └── app.ts              # Main Express application
├── models/                 # MongoDB models
│   ├── User.ts             # User model (passengers & drivers)
│   └── Ride.ts             # Ride booking model
├── routes/                 # Express route handlers
│   ├── index.ts            # Public routes
│   ├── auth.ts             # Authentication routes
│   ├── rides.ts            # Ride booking routes
│   ├── driver.ts           # Driver dashboard routes
│   ├── admin.ts            # Admin panel routes
│   └── settings.ts         # Settings routes
├── utils/                  # Utility functions
│   ├── auth.ts             # JWT middleware
│   ├── validation.ts       # Input validation
│   ├── email.ts            # Email templates and sending
│   └── phoneFormatter.ts   # Phone number formatting
├── views/                  # EJS templates
│   ├── partials/           # Reusable components
│   │   ├── head.ejs        # HTML head section
│   │   ├── nav.ejs         # Main navigation
│   │   ├── footer.ejs      # Main footer
│   │   ├── auth-modals.ejs # Authentication modals
│   │   ├── admin-nav.ejs   # Admin navigation
│   │   ├── admin-footer.ejs# Admin footer
│   │   ├── driver-nav.ejs  # Driver navigation
│   │   └── driver-footer.ejs# Driver footer
│   ├── pages/              # Main pages
│   │   ├── index.ejs       # Homepage
│   │   ├── about.ejs       # About page
│   │   ├── services.ejs    # Services page
│   │   ├── attractions.ejs # Attractions page
│   │   ├── contact.ejs     # Contact page
│   │   ├── contact-success.ejs # Contact success page
│   │   ├── error.ejs       # Error page
│   │   └── 404.ejs         # 404 page
│   ├── admin/              # Admin panel templates
│   │   ├── dashboard.ejs   # Admin dashboard
│   │   └── login.ejs       # Admin login
│   └── driver/             # Driver-specific pages
│       ├── dashboard.ejs   # Driver dashboard
│       └── login.ejs       # Driver login
├── public/                 # Static assets
│   ├── css/                # Stylesheets
│   │   ├── styles.css      # Main styles
│   │   ├── enhanced-styles.css # Enhanced UI styles
│   │   ├── vehicle-booking.css # Vehicle booking styles
│   │   ├── attractions.css # Attractions page styles
│   │   ├── login.css       # Login page styles
│   │   └── image-optimization.css # Image optimization styles
│   ├── js/                 # Client-side JavaScript
│   │   ├── main.js         # Main JavaScript file
│   │   └── image-optimizer.js # Image optimization script
│   └── images/             # Images and assets
│       ├── Vehicle images  # Vehicle type images
│       ├── Attraction images # Washington state attractions
│       └── Team photos     # Team member photos
├── img/                    # Additional images
│   ├── limo.jpg           # Limo images
│   ├── tesla.jpg          # Tesla images
│   ├── suv.png            # SUV images
│   └── hummerlimo.jpg     # Hummer limo images
└── docs/                   # Documentation folder
```

## Installation & Setup

1. **Clone and install dependencies:**
   ```bash
   npm install
   ```

2. **Set up environment variables:**
   Edit `.env` file with your configuration:
   ```
   MONGODB_URI=mongodb://localhost:27017/husaride
   JWT_SECRET=your-super-secret-jwt-key
   EMAIL_HOST=smtp.gmail.com
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASS=your-app-password
   ```

3. **Start MongoDB:**
   Make sure MongoDB is running on your system.

4. **Build and run:**
   ```bash
   npm run build
   npm start
   
   # For development with auto-reload:
   npm run dev
   ```

5. **Access the application:**
   Open http://localhost:3000 in your browser.

## Usage

### For Passengers
1. Visit the homepage
2. Enter pickup and dropoff locations
3. Select vehicle type
4. Click "Book Now"
5. Sign up/login when prompted (or continue as guest)
6. Receive email notifications about ride status

### For Drivers
1. Register with role "driver" (modify signup form or use API directly)
2. Access driver dashboard at `/driver/dashboard`
3. View available rides and accept them
4. Mark rides as completed when finished
5. Receive email notifications for new requests

### Creating a Driver Account
Currently, driver accounts need to be created via API:
```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "John Driver",
    "email": "driver@example.com",
    "password": "password123",
    "phone": "+1234567890",
    "role": "driver"
  }'
```

## API Endpoints

### Authentication
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user
- `POST /auth/logout` - Logout user

### Rides
- `POST /rides/book` - Book a new ride
- `GET /rides/my-rides` - Get user's rides
- `PATCH /rides/:id/cancel` - Cancel a ride

### Driver
- `GET /driver/dashboard` - Driver dashboard
- `PATCH /driver/rides/:id/accept` - Accept a ride
- `PATCH /driver/rides/:id/complete` - Complete a ride
- `GET /driver/rides` - Get driver's rides

## Email Templates

The system includes email templates for:
- Welcome message for new users
- Ride request notifications to drivers
- Ride acceptance notifications to passengers
- Ride completion confirmations
- Ride cancellation notifications

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- Rate limiting to prevent abuse
- Input validation with Joi
- CORS protection
- Helmet security headers

## Development

- `npm run dev` - Start development server with auto-reload
- `npm run build` - Build TypeScript to JavaScript
- `npm run watch` - Watch TypeScript files for changes

## Future Enhancements

- Real-time location tracking
- In-app messaging between drivers and passengers
- Payment integration
- Rating and review system
- Admin dashboard for platform management
- Mobile app development
- Advanced matching algorithms based on location
- Ride scheduling for future trips