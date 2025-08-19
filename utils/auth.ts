import jwt from 'jsonwebtoken';
import { Request, Response, NextFunction } from 'express';

interface JwtPayload {
  userId: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

export const auth = (req: Request, res: Response, next: NextFunction) => {
  try {
    let token;
    const fullPath = req.originalUrl || req.path;
    
    // Use different cookies based on route
    if (fullPath.startsWith('/admin')) {
      token = req.header('Authorization')?.replace('Bearer ', '') || 
              req.cookies?.adminToken ||
              req.body.token;
    } else if (fullPath.startsWith('/driver')) {
      token = req.header('Authorization')?.replace('Bearer ', '') || 
              req.cookies?.driverToken ||
              req.body.token;
    } else {
      token = req.header('Authorization')?.replace('Bearer ', '') || 
              req.cookies?.token ||
              req.body.token;
    }

    if (!token) {
      // For browser requests, redirect to appropriate login page
      if (req.accepts('html')) {
        if (fullPath.startsWith('/admin')) {
          return res.redirect('/admin/login');
        }
        if (fullPath.startsWith('/driver')) {
          return res.redirect('/driver/login');
        }
        return res.redirect('/');
      }
      return res.status(401).json({ error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
    req.user = decoded;
    next();
  } catch (error) {
    const fullPath = req.originalUrl || req.path;
    if (req.accepts('html')) {
      if (fullPath.startsWith('/admin')) {
        return res.redirect('/admin/login');
      }
      if (fullPath.startsWith('/driver')) {
        return res.redirect('/driver/login');
      }
      return res.redirect('/');
    }
    res.status(400).json({ error: 'Invalid token.' });
  }
};

export const requireRole = (role: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      if (req.accepts('html')) {
        if (req.path.startsWith('/admin')) {
          return res.redirect('/admin/login');
        }
        if (req.path.startsWith('/driver')) {
          return res.redirect('/driver/login');
        }
        return res.redirect('/');
      }
      return res.status(401).json({ error: 'Access denied. Not authenticated.' });
    }

    if (req.user.role !== role) {
      if (req.accepts('html')) {
        if (role === 'admin') {
          return res.redirect('/admin/login');
        }
        if (role === 'driver') {
          return res.redirect('/driver/login');
        }
        return res.status(403).render('pages/error', {
          title: 'Access Denied',
          user: req.user,
          error: { message: 'You do not have permission to access this page.' }
        });
      }
      return res.status(403).json({ error: 'Access denied. Insufficient permissions.' });
    }

    next();
  };
};

export const optionalAuth = (req: Request, res: Response, next: NextFunction) => {
  try {
    let token;
    const fullPath = req.originalUrl || req.path;
    
    // Only use regular token for public routes (not admin or driver)
    if (!fullPath.startsWith('/admin') && !fullPath.startsWith('/driver')) {
      token = req.header('Authorization')?.replace('Bearer ', '') || 
              req.cookies?.token;
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload;
      req.user = decoded;
    }
    
    next();
  } catch (error) {
    // Continue without authentication
    next();
  }
};