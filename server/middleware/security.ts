import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { z } from 'zod';
import type { Request, Response, NextFunction } from 'express';

// ==================== RATE LIMITING ====================
// ✅ PRODUCTION-READY: Different limits for dev vs production
const isDevelopment = process.env.NODE_ENV === 'development';

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: isDevelopment ? 100 : 5, // ✅ 100 in dev, 5 in production
  message: { error: 'Too many login attempts. Please try again in 15 minutes.' }, // ✅ Return JSON
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // ✅ Don't count successful logins
});

export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: isDevelopment ? 1000 : 100, // ✅ Higher limit in dev
  message: { error: 'Too many requests. Please slow down.' }, // ✅ Return JSON
  standardHeaders: true,
  legacyHeaders: false,
});

export const strictLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: isDevelopment ? 100 : 10, // ✅ Higher limit in dev
  message: { error: 'Too many requests. Please try again later.' }, // ✅ Return JSON
});

// ==================== HELMET SECURITY ====================
export const helmetConfig = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false,
  crossOriginResourcePolicy: { policy: "cross-origin" },
});

// ==================== INPUT VALIDATION ====================
export const phoneSchema = z.string()
  .regex(/^\+62\d{9,13}$/, 'Invalid Indonesian phone number')
  .transform(val => val.trim());

export const passwordSchema = z.string()
  .min(4, 'Password must be at least 4 characters')
  .max(100, 'Password too long')
  .transform(val => val.trim());

export const emailSchema = z.string()
  .email('Invalid email')
  .max(255)
  .transform(val => val.toLowerCase().trim())
  .optional();

export const nameSchema = z.string()
  .min(1, 'Name required')
  .max(255)
  .regex(/^[a-zA-Z\s'-]+$/, 'Name contains invalid characters')
  .transform(val => val.trim());

export const otpSchema = z.string()
  .length(6, 'OTP must be 6 digits')
  .regex(/^\d{6}$/, 'OTP must contain only numbers');

// ==================== VALIDATION MIDDLEWARE ====================
export const validateLogin = (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      phone: phoneSchema,
      password: passwordSchema,
    });
    
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: error.errors[0].message 
      });
    }
    next(error);
  }
};

export const validateSignup = (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      name: nameSchema,
      email: emailSchema,
      phone: phoneSchema,
      password: passwordSchema,
    });
    
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: error.errors[0].message 
      });
    }
    next(error);
  }
};

export const validateOTP = (req: Request, res: Response, next: NextFunction) => {
  try {
    const schema = z.object({
      phone: phoneSchema,
      code: otpSchema,
      name: nameSchema.optional(),
      email: emailSchema,
      password: passwordSchema.optional(),
      mode: z.enum(['login', 'signup', 'forgot']),
    });
    
    req.body = schema.parse(req.body);
    next();
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        error: 'Invalid input', 
        details: error.errors[0].message 
      });
    }
    next(error);
  }
};

// ==================== FILE UPLOAD VALIDATION ====================
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const validateFileUpload = (req: Request, res: Response, next: NextFunction) => {
  if (!req.file) {
    return next();
  }

  // Check file type
  if (!ALLOWED_IMAGE_TYPES.includes(req.file.mimetype)) {
    return res.status(400).json({ 
      error: 'Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.' 
    });
  }

  // Check file size
  if (req.file.size > MAX_FILE_SIZE) {
    return res.status(400).json({ 
      error: 'File too large. Maximum size is 5MB.' 
    });
  }

  // Sanitize filename
  const sanitizedFilename = req.file.filename
    .replace(/[^a-zA-Z0-9.-]/g, '_')
    .substring(0, 255);
  
  req.file.filename = sanitizedFilename;

  next();
};

// ==================== SQL INJECTION PROTECTION ====================
export const sanitizeInput = (input: any): any => {
  if (typeof input === 'string') {
    return input
      .replace(/[<>]/g, '') // Remove potential XSS
      .trim()
      .substring(0, 10000); // Limit length
  }
  return input;
};

export const sanitizeBody = (req: Request, res: Response, next: NextFunction) => {
  if (req.body) {
    Object.keys(req.body).forEach(key => {
      req.body[key] = sanitizeInput(req.body[key]);
    });
  }
  next();
};
