import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../config/env';

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

    const decoded = jwt.verify(token, config.jwt.secret) as any;
    req.userId = decoded.userId;
    req.userRole = decoded.role;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
}

export function adminMiddleware(req: AuthRequest, res: Response, next: NextFunction): void {
  if (req.userRole !== 'admin') {
    res.status(403).json({ error: 'Forbidden' });
    return;
  }
  next();
}
