import { Request, Response, NextFunction } from 'express';
import { isValidObjectId } from '../utils/validation';

/**
 * Middleware to validate MongoDB ObjectId in route parameters
 * Use this for routes that expect an 'id' parameter
 */
export function validateObjectId(req: Request, res: Response, next: NextFunction): void {
  const { id } = req.params;
  
  if (!id) {
    res.status(400).json({ error: 'ID parameter is required' });
    return;
  }
  
  if (!isValidObjectId(id)) {
    res.status(400).json({ error: 'Invalid ID format' });
    return;
  }
  
  next();
}

