import Joi from 'joi';

export const validateSignup = (data: any) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required(),
    phone: Joi.string().pattern(/^(\([0-9]{3}\) [0-9]{3}-[0-9]{4}|[\+]?[1-9][\d]{0,15})$/).required(),
    role: Joi.string().valid('passenger', 'driver').optional()
  });

  return schema.validate(data);
};

export const validateLogin = (data: any) => {
  const schema = Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().min(6).required()
  });

  return schema.validate(data);
};

export const validateRideBooking = (data: any) => {
  const schema = Joi.object({
    pickupLocation: Joi.string().min(5).max(200).required(),
    dropoffLocation: Joi.string().min(5).max(200).required(),
    vehicleType: Joi.string().valid('limo', 'comfort', 'luxury', 'suv', 'van', 'wedding', 'bus').required(),
    bookingDate: Joi.string().optional(),
    passengers: Joi.string().optional(),
    notes: Joi.string().optional()
  });

  return schema.validate(data);
};

export const validateContact = (data: any) => {
  const schema = Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    message: Joi.string().min(10).max(1000).required()
  });

  return schema.validate(data);
};