import jwt from 'jsonwebtoken';
import type { Request, Response, NextFunction } from 'express';

// ✅ IMPROVED: Fail early if JWT_SECRET is missing
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

if (!JWT_SECRET) {
  throw new Error("❌ FATAL: JWT_SECRET is not set in environment variables!");
}

console.log("🔐 JWT_SECRET loaded:", JWT_SECRET ? "✅ YES" : "❌ NO");
console.log("🔐 JWT_SECRET length:", JWT_SECRET.length);

export interface JWTPayload {
  userId: string;
  role: string;
}

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}

// ==================== JWT FUNCTIONS ====================
export const generateToken = (userId: string, role: string): string => {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is not defined");
  }
  
  return jwt.sign(
    { userId, role },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

export const verifyToken = (token: string): JWTPayload | null => {
  try {
    if (!JWT_SECRET) {
      throw new Error("JWT_SECRET is not defined");
    }
    return jwt.verify(token, JWT_SECRET) as JWTPayload;
  } catch (error) {
    return null;
  }
};

// ==================== AUTH MIDDLEWARE ====================
export const authenticate = (req: Request, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.substring(7);
    const payload = verifyToken(token);

    if (!payload) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }

    req.user = payload;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

// ==================== ROLE-BASED ACCESS ====================
export const requireRole = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

export const requireAdmin = requireRole('admin');
export const requireStoreOwner = requireRole('admin', 'store_owner');
export const requireStaff = requireRole('admin', 'store_owner', 'picker', 'driver');