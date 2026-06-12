import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';
import { User } from '../models/user.model';

export interface AuthRequest extends Request {
  userId?: string;
  userRole?: string;
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    // Try to get token from cookie first (preferred method)
    let token = req.cookies?.auth_token;
    
    // Fallback to Authorization header for backward compatibility
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    
    if (!token) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const decoded = jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] }) as any;
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

/**
 * Optional auth middleware - extracts userId if token is present but doesn't require authentication
 * Useful for routes that work both with and without authentication
 */
export function optionalAuthMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  try {
    // Try to get token from cookie first (preferred method)
    let token = req.cookies?.auth_token;
    
    // Fallback to Authorization header for backward compatibility
    if (!token) {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7);
      }
    }
    
    // If no token, just continue without setting userId
    if (!token) {
      next();
      return;
    }

    // If token exists, try to verify it and extract userId
    try {
      const decoded = jwt.verify(token, config.jwt.secret, { algorithms: ['HS256'] }) as any;
      req.userId = decoded.userId;
      req.userRole = decoded.role;
    } catch (error) {
      // Invalid token, but continue anyway (optional auth)
      // userId will remain undefined
    }
    
    next();
  } catch (error) {
    // Any other error, continue without auth
    next();
  }
}

export async function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  if (req.userRole !== 'admin') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }

  // Verify against the DB so demoted/deleted admins lose access immediately,
  // instead of keeping it until their JWT expires (7 days).
  try {
    const user = await User.findById(req.userId).select('role');
    if (!user || user.role !== 'admin') {
      res.status(403).json({ error: 'Forbidden' });
      return;
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
    return;
  }

  next();
}
