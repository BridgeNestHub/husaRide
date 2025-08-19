# HusaRide - Design Document

## Project Overview

I am building HusaRide a modern ride-hailing platform built with Node.js, TypeScript, Express, and MongoDB. It connects passengers with drivers, supporting both registered users and guest bookings with real-time fare calculation and automated email notifications.

## Key Features

### For Passengers
- **Dual Booking System**: Hero section quick booking + detailed vehicle selection
- **Guest & Registered Users**: Book rides without signup (with points incentive for registration)
- **Real-time Fare Calculation**: Google Maps integration with fallback estimation
- **Email Notifications**: Automated confirmations for ride status updates
- **Points System**: Earn points with every ride (1 point per $10 spent)
- **Multiple Vehicle Types**: Choose from Limo, Comfort, SUV, Van, or Wedding cars

### For Drivers
- **Driver Dashboard**: View available rides and manage accepted rides
- **Responsive Interface**: Mobile-friendly dashboard with hamburger navigation
- **Ride Management**: Accept rides and mark them as completed
- **Email Notifications**: Get notified of new ride requests and updates
- **Ride History**: Separate section for completed rides
- **Real-time Updates**: Dashboard updates with ride status changes

### For Administrators
- **Admin Dashboard**: Comprehensive system management interface
- **User Management**: View, edit, and manage all user accounts with expandable details
- **Driver Management**: Full driver oversight with vehicle information management
- **Ride Oversight**: Monitor all rides with filtering (pending, accepted, completed)
- **Statistics & Analytics**: User and driver performance metrics
- **Password Reset**: Secure password reset functionality for users and drivers
- **Email Notifications**: Automated notifications for account changes
- **Modern UI**: Responsive design with modal dialogs and professional styling

### System Features
- **Secure Authentication**: JWT-based authentication with bcrypt password hashing
- **Role-based Access**: Passenger, Driver, and Admin roles with appropriate permissions
- **Responsive Design**: Mobile-first approach with hamburger menus and touch-friendly interfaces
- **Modern Modals**: Professional dialog boxes for editing and confirmations
- **Email System**: Comprehensive email templates for all user interactions

## Tech Stack

- **Backend**: Node.js, Express.js, TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT tokens, bcrypt
- **Email**: Nodemailer with HTML templates
- **Frontend**: EJS templates, vanilla JavaScript
- **APIs**: Google Maps Places & Distance Matrix
- **Security**: Helmet, CORS, rate limiting

## Project Structure

```
OnRide/
├── src/
│   └── app.ts                    # Main Express application & routing config
├── models/                       # MongoDB data models
│   ├── User.ts                   # User model (passengers & drivers)
│   └── Ride.ts                   # Ride booking model
├── routes/                       # Express route handlers
│   ├── index.ts                  # Public pages (home, about, services, contact)
│   ├── auth.ts                   # Authentication (login, register, logout)
│   ├── rides.ts                  # Ride booking & management
│   ├── driver.ts                 # Driver dashboard & ride operations
│   └── admin.ts                  # Admin dashboard & management
├── utils/                        # Utility functions
│   ├── auth.ts                   # JWT middleware & authentication
│   ├── validation.ts             # Input validation with Joi
│   └── email.ts                  # Email templates & sending logic
├── views/                        # EJS templates
│   ├── partials/                 # Reusable components
│   │   ├── head.ejs              # HTML head with Google Maps API
│   │   ├── nav.ejs               # Main navigation bar
│   │   ├── driver-nav.ejs        # Driver navigation with responsive menu
│   │   ├── admin-nav.ejs         # Admin navigation with responsive menu
│   │   └── footer.ejs            # Footer
│   ├── pages/                    # Main pages
│   │   ├── index.ejs             # Homepage with booking forms
│   │   ├── about.ejs             # About page
│   │   ├── services.ejs          # Services page
│   │   ├── contact.ejs           # Contact page
│   │   └── 404.ejs               # Error pages
│   ├── driver/                   # Driver-specific pages
│   │   ├── dashboard.ejs         # Driver dashboard with ride management
│   │   └── login.ejs             # Driver login page
│   └── admin/                    # Admin-specific pages
│       ├── dashboard.ejs         # Admin dashboard with user/driver management
│       └── login.ejs             # Admin login page
├── public/                       # Static assets
│   ├── css/                      # Stylesheets
│   │   ├── styles.css            # Main styles
│   │   ├── enhanced-styles.css   # Enhanced UI components
│   │   └── vehicle-booking.css   # Vehicle selection modal styles
│   ├── js/                       # Client-side JavaScript
│   │   └── main.js               # Main application logic
│   └── images/                   # Vehicle images & assets
├── package.json                  # Dependencies & scripts
├── tsconfig.json                 # TypeScript configuration
└── .env                          # Environment variables
```

## File/Directory Descriptions

### Core Application
- **`src/app.ts`**: Main Express server setup, middleware configuration, route mounting, database connection
- **`package.json`**: Project dependencies, build scripts, and metadata

### Data Layer
- **`models/User.ts`**: User schema with authentication methods, supports passengers and drivers
- **`models/Ride.ts`**: Ride booking schema supporting both registered users and guest bookings

### API Routes
- **`routes/index.ts`**: Public pages routing (home, about, services, contact)
- **`routes/auth.ts`**: User authentication endpoints (register, login, logout)
- **`routes/rides.ts`**: Ride booking, management, and cancellation endpoints
- **`routes/driver.ts`**: Driver dashboard, ride acceptance, and completion endpoints
- **`routes/admin.ts`**: Admin dashboard, user/driver management, statistics, and system administration

### Business Logic
- **`utils/auth.ts`**: JWT token generation, verification, and authentication middleware
- **`utils/validation.ts`**: Input validation schemas using Joi
- **`utils/email.ts`**: Email templates and sending functionality with Nodemailer

### Frontend Templates
- **`views/partials/`**: Reusable EJS components (head, navigation, footer)
- **`views/pages/`**: Main application pages with booking forms and content
- **`views/driver/`**: Driver-specific dashboard and login interfaces
- **`views/admin/`**: Admin-specific dashboard and login interfaces

### Client-Side Assets
- **`public/css/`**: Responsive stylesheets with modern design and Google Maps integration
- **`public/js/main.js`**: Client-side application logic, booking forms, fare calculation, Google Maps integration
- **`public/images/`**: Vehicle images and static assets

## Architecture Flow

### Booking Process
1. **User Input**: Hero section or vehicle selection form
2. **Frontend Validation**: Required fields and format checking
3. **API Call**: POST to `/rides/book` endpoint
4. **Backend Processing**: Validation, fare calculation, database storage
5. **Email Notifications**: Confirmation to customer, alerts to drivers
6. **Response**: Success confirmation with booking details

### Authentication Flow
1. **Registration/Login**: JWT token generation and storage
2. **Middleware**: Optional authentication for public pages
3. **Protected Routes**: Driver dashboard requires authentication
4. **Guest Support**: Booking without registration using contact information

### Driver Workflow
1. **Email Notification**: New ride request alerts
2. **Dashboard Access**: View available rides with responsive interface
3. **Ride Acceptance**: Claim rides and notify passengers via email
4. **Active Ride Management**: Track accepted rides separately from available ones
5. **Completion**: Mark rides complete and trigger final notifications
6. **Ride History**: Review completed rides in dedicated section

### Admin Workflow
1. **Dashboard Overview**: Monitor system activity and recent rides
2. **User Management**: 
   - View all users with expandable detailed information
   - Edit user information (name, email, phone, role)
   - Reset user passwords with modern modal interface
   - View user statistics (rides, spending, points)
3. **Driver Management**:
   - Comprehensive driver information with vehicle details
   - Edit driver information and vehicle fleet
   - Add, edit, or remove driver vehicles
   - View driver performance statistics
4. **Ride Management**:
   - Monitor active rides (pending and accepted)
   - Review completed rides with full trip details
   - Filter rides by status for efficient management
5. **System Administration**:
   - Email notifications for all account changes
   - Professional modal interfaces for all editing operations

## Key Design Decisions

- **TypeScript**: Type safety and better development experience
- **Dual Booking**: Quick hero form + detailed vehicle selection for different user needs
- **Guest Bookings**: Lower barrier to entry while encouraging registration
- **Email Integration**: Automated communication between all parties
- **Google Maps**: Real-time fare calculation with fallback estimation
- **Responsive Design**: Mobile-first approach with hamburger menus for all user types
- **Role-based Architecture**: Separate interfaces and permissions for passengers, drivers, and admins
- **Modern UI/UX**: Professional modal dialogs, confirmation systems, and visual feedback
- **Progressive Disclosure**: Expandable information sections to reduce visual clutter
- **Real-time Statistics**: Dynamic loading of user and driver performance metrics
- **Comprehensive Email System**: Notifications for all system interactions and changes

## Security Features

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt for secure password storage
- **Rate Limiting**: Prevent API abuse
- **Input Validation**: Joi schemas for data validation
- **CORS & Helmet**: Security headers and cross-origin protection