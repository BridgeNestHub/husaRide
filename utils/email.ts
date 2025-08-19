import nodemailer from 'nodemailer';
import path from 'path';
import fs from 'fs';
import { formatPhoneNumber } from './phoneFormatter';

interface EmailOptions {
  to: string;
  subject: string;
  template: string;
  data: any;
}

// Create transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: parseInt(process.env.EMAIL_PORT || '587'),
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Email templates
const templates = {
  welcome: (data: any) => `
    <h2>Welcome to HusaRide, ${data.name}!</h2>
    <p>Thank you for joining our ride-hailing platform. You can now book rides and earn points with every trip.</p>
    <p>Start your journey with us today!</p>
    <p>Best regards,<br>The HusaRide Team</p>
  `,
  
  'booking-confirmation': (data: any) => `
    <h2>Booking Confirmation - HusaRide</h2>
    <p>Hello ${data.customerName},</p>
    <p>Thank you for booking with HusaRide! Your ride has been successfully booked.</p>
    <p><strong>Booking Details:</strong></p>
    <ul>
      <li><strong>Booking ID:</strong> ${data.rideId}</li>
      <li><strong>Date:</strong> ${data.bookingDate}</li>
      <li><strong>Pickup Location:</strong> ${data.pickupLocation}</li>
      <li><strong>Drop-off Location:</strong> ${data.dropoffLocation}</li>
      <li><strong>Vehicle Type:</strong> ${data.vehicleType}</li>
      <li><strong>Estimated Fare:</strong> $${data.fare}</li>
    </ul>
    <p>Our drivers have been notified and will contact you shortly to confirm pickup details.</p>
    <p>Thank you for choosing HusaRide!</p>
    <p>Best regards,<br>The HusaRide Team</p>
  `,
  
  'ride-request': (data: any) => `
    <h2>New Ride Request</h2>
    <p>Hello ${data.driverName},</p>
    <p>A new ride request is available:</p>
    <ul>
      <li><strong>Customer:</strong> ${data.customerName}</li>
      <li><strong>Pickup:</strong> ${data.pickupLocation}</li>
      <li><strong>Drop-off:</strong> ${data.dropoffLocation}</li>
      <li><strong>Vehicle Type:</strong> ${data.vehicleType}</li>
      <li><strong>Estimated Fare:</strong> $${data.fare}</li>
      <li><strong>Booking ID:</strong> ${data.rideId}</li>
    </ul>
    <p>Log in to your driver dashboard to accept this ride.</p>
    <p>Best regards,<br>The HusaRide Team</p>
  `,
  
  'ride-accepted-customer': (data: any) => `
    <h2>Your Ride Has Been Accepted!</h2>
    <p>Hello ${data.customerName},</p>
    <p>Great news! Driver ${data.driverName} has accepted your ride and will meet you at ${data.pickupLocation} at ${data.estimatedArrival}.</p>
    <p><strong>Your Driver Details:</strong></p>
    <ul>
      <li><strong>Driver Name:</strong> ${data.driverName}</li>
      <li><strong>Driver Phone:</strong> ${formatPhoneNumber(data.driverPhone)}</li>
      <li><strong>Pickup Location:</strong> ${data.pickupLocation}</li>
      <li><strong>Drop-off Location:</strong> ${data.dropoffLocation}</li>
      <li><strong>Estimated Arrival:</strong> ${data.estimatedArrival}</li>
    </ul>
    <p>If you need anything, you can respond to this email or reach out to your assigned driver at ${formatPhoneNumber(data.driverPhone)}.</p>
    <p>Have a safe trip!</p>
    <p>Best regards,<br>The HusaRide Team</p>
  `,
  
  'ride-accepted-driver': (data: any) => `
    <h2>Ride Accepted - Customer Details</h2>
    <p>Hello ${data.driverName},</p>
    <p>You have successfully accepted a ride. Here are the customer details:</p>
    <p><strong>Customer Information:</strong></p>
    <ul>
      <li><strong>Customer Name:</strong> ${data.customerName}</li>
      <li><strong>Customer Phone:</strong> ${formatPhoneNumber(data.customerPhone)}</li>
      <li><strong>Pickup Location:</strong> ${data.pickupLocation}</li>
      <li><strong>Drop-off Location:</strong> ${data.dropoffLocation}</li>
      <li><strong>Estimated Arrival:</strong> ${data.estimatedArrival}</li>
      <li><strong>Fare:</strong> $${data.fare}</li>
    </ul>
    <p>Please contact the customer and proceed to the pickup location.</p>
    <p>Best regards,<br>The HusaRide Team</p>
  `,
  
  'ride-completed-customer': (data: any) => `
    <h2>Ride Completed - Thank You!</h2>
    <p>Hello ${data.customerName},</p>
    <p>Your ride with ${data.driverName} has been completed successfully. Thank you for choosing HusaRide!</p>
    <p><strong>Trip Summary:</strong></p>
    <ul>
      <li><strong>From:</strong> ${data.pickupLocation}</li>
      <li><strong>To:</strong> ${data.dropoffLocation}</li>
      <li><strong>Driver:</strong> ${data.driverName}</li>
      <li><strong>Fare:</strong> $${data.fare}</li>
      ${data.pointsEarned > 0 ? `<li><strong>Points Earned:</strong> ${data.pointsEarned}</li>` : ''}
    </ul>
    <p>We hope you had a pleasant journey. Thank you for choosing HusaRide!</p>
    <p>Best regards,<br>The HusaRide Team</p>
  `,
  
  'trip-summary-admin': (data: any) => `
    <h2>Trip Completed - Summary Report</h2>
    <p>A ride has been completed on the HusaRide platform.</p>
    <p><strong>Trip Details:</strong></p>
    <ul>
      <li><strong>Ride ID:</strong> ${data.rideId}</li>
      <li><strong>Completed At:</strong> ${data.completedAt}</li>
      <li><strong>Pickup:</strong> ${data.pickupLocation}</li>
      <li><strong>Drop-off:</strong> ${data.dropoffLocation}</li>
      <li><strong>Vehicle Type:</strong> ${data.vehicleType}</li>
      <li><strong>Fare:</strong> $${data.fare}</li>
    </ul>
    <p><strong>Driver Information:</strong></p>
    <ul>
      <li><strong>Name:</strong> ${data.driverName}</li>
      <li><strong>Email:</strong> ${data.driverEmail}</li>
      <li><strong>Phone:</strong> ${formatPhoneNumber(data.driverPhone)}</li>
    </ul>
    <p><strong>Customer Information:</strong></p>
    <ul>
      <li><strong>Name:</strong> ${data.customerName}</li>
      <li><strong>Email:</strong> ${data.customerEmail || 'Guest booking'}</li>
      <li><strong>Phone:</strong> ${data.customerPhone ? formatPhoneNumber(data.customerPhone) : 'Not provided'}</li>
      ${data.pointsAwarded > 0 ? `<li><strong>Points Awarded:</strong> ${data.pointsAwarded}</li>` : ''}
    </ul>
    <p>This is an automated summary from the HusaRide platform.</p>
    <p>Best regards,<br>HusaRide System</p>
  `,
  
  'ride-cancelled': (data: any) => `
    <h2>Ride Cancelled</h2>
    <p>Hello ${data.driverName},</p>
    <p>The ride from ${data.pickupLocation} to ${data.dropoffLocation} has been cancelled by the passenger.</p>
    <p>Thank you for your service.</p>
    <p>Best regards,<br>The HusaRide Team</p>
  `,
  
  'account-updated': (data: any) => `
    <h2>Account Information Updated</h2>
    <p>Hello ${data.driverName},</p>
    <p>Your account information has been updated by ${data.updatedBy}.</p>
    <p><strong>Updated Field:</strong> ${data.field}</p>
    <p><strong>New Value:</strong> ${data.newValue}</p>
    <p>If you have any questions about this change, please contact our support team.</p>
    <p>Best regards,<br>The HusaRide Team</p>
  `,
  
  'ride-accepted': (data: any) => `
    <h2>Your Ride Has Been Accepted!</h2>
    <p>Hello ${data.passengerName},</p>
    <p>Great news! Your ride has been accepted and a driver has been assigned.</p>
    <p><strong>Driver Details:</strong></p>
    <ul>
      <li><strong>Driver Name:</strong> ${data.driverName}</li>
      <li><strong>Driver Phone:</strong> ${formatPhoneNumber(data.driverPhone)}</li>
    </ul>
    <p><strong>Trip Details:</strong></p>
    <ul>
      <li><strong>Pickup Location:</strong> ${data.pickupLocation}</li>
      <li><strong>Drop-off Location:</strong> ${data.dropoffLocation}</li>
      <li><strong>Vehicle Type:</strong> ${data.vehicleType}</li>
      <li><strong>Fare:</strong> $${data.fare}</li>
    </ul>
    <p>Your driver will contact you shortly to confirm pickup details.</p>
    <p>Have a safe trip!</p>
    <p>Best regards,<br>The HusaRide Team</p>
  `,
  
  'ride-assigned': (data: any) => `
    <h2>New Ride Assignment</h2>
    <p>Hello ${data.driverName},</p>
    <p>You have been assigned a new ride by the administrator.</p>
    <p><strong>Passenger Details:</strong></p>
    <ul>
      <li><strong>Passenger Name:</strong> ${data.passengerName}</li>
      <li><strong>Passenger Phone:</strong> ${formatPhoneNumber(data.passengerPhone)}</li>
    </ul>
    <p><strong>Trip Details:</strong></p>
    <ul>
      <li><strong>Pickup Location:</strong> ${data.pickupLocation}</li>
      <li><strong>Drop-off Location:</strong> ${data.dropoffLocation}</li>
      <li><strong>Vehicle Type:</strong> ${data.vehicleType}</li>
      <li><strong>Fare:</strong> $${data.fare}</li>
    </ul>
    <p>Please contact the passenger and proceed to the pickup location.</p>
    <p>Best regards,<br>The HusaRide Team</p>
  `
};

export const sendEmail = async (options: EmailOptions): Promise<void> => {
  try {
    const template = templates[options.template as keyof typeof templates];
    if (!template) {
      throw new Error(`Template ${options.template} not found`);
    }

    const html = template(options.data);

    const mailOptions = {
      from: `"${process.env.APP_NAME}" <${process.env.EMAIL_USER}>`,
      to: options.to,
      subject: options.subject,
      html
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent to ${options.to}: ${options.subject}`);
  } catch (error) {
    console.error('Email sending error:', error);
    throw error;
  }
};