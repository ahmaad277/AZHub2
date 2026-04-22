import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { hashPassword, verifyPassword } from '../auth';
import { requireAuth, AuthenticatedRequest } from '../middleware/auth';

const router = Router();

// Rate limiting for login attempts
const loginAttempts = new Map<string, { count: number; resetTime: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const attempts = loginAttempts.get(ip);
  
  if (!attempts || now > attempts.resetTime) {
    loginAttempts.set(ip, { count: 1, resetTime: now + 60000 });
    return true;
  }
  
  if (attempts.count >= 5) {
    return false;
  }
  
  attempts.count++;
  return true;
}

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

// Login
router.post('/login', async (req: Request, res: Response) => {
  try {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    
    if (!checkRateLimit(ip)) {
      return res.status(429).json({ 
        error: 'Too many login attempts. Please try again later.',
      });
    }

    const { email, password } = loginSchema.parse(req.body);

    const user = await storage.getUserByEmail(email);
    
    if (!user || !user.passwordHash) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    if (!user.isActive) {
      return res.status(403).json({ error: 'Account is suspended' });
    }

    const isValid = await verifyPassword(password, user.passwordHash);
    
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Update last login (using raw update since lastLogin is not in InsertUser schema)
    const { db } = await import('../db');
    const { users } = await import('@shared/schema');
    const { eq } = await import('drizzle-orm');
    await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, user.id));

    // Set session (both fields for compatibility with legacy routes)
    req.session.userId = user.id;
    req.session.isAuthenticated = true;
    
    // Handle "remember me" - extend session duration
    const rememberMe = req.body.rememberMe;
    if (rememberMe && req.session.cookie) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000; // 30 days
    } else if (req.session.cookie) {
      req.session.cookie.maxAge = 24 * 60 * 60 * 1000; // 24 hours
    }

    const userWithRole = await storage.getUser(user.id);

    res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        roleId: user.roleId,
        isActive: user.isActive,
      },
      role: userWithRole?.role,
    });
  } catch (error) {
    console.error('Login error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data' });
    }
    res.status(500).json({ error: 'Login failed' });
  }
});

// Logout (no auth required - allows cleanup of expired sessions)
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const userId = req.session?.userId;

    req.session.destroy((err) => {
      if (err) {
        console.error('Session destroy error:', err);
        return res.status(500).json({ error: 'Logout failed' });
      }
      res.clearCookie('connect.sid');
      res.json({ success: true });
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ error: 'Logout failed' });
  }
});

// Get current user (simplified for single-user app)
router.get('/me', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const userDetails = await storage.getUser(req.user.id);
    
    if (!userDetails) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove sensitive data
    const { passwordHash, ...safeUser } = userDetails;

    res.json({
      user: safeUser,
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// Check authentication status
router.get('/status', async (req: Request, res: Response) => {
  try {
    const isAuthenticated = !!req.session.userId;
    
    if (isAuthenticated) {
      const user = await storage.getUser(req.session.userId!);
      
      if (user && user.isActive) {
        return res.json({
          isAuthenticated: true,
          user: {
            id: user.id,
            email: user.email,
            name: user.name,
            roleId: user.roleId,
          },
        });
      }
    }

    res.json({ isAuthenticated: false });
  } catch (error) {
    console.error('Auth status error:', error);
    res.json({ isAuthenticated: false });
  }
});

// Get list of active users for login selection (PUBLIC ENDPOINT)
router.get('/users-list', async (req: Request, res: Response) => {
  try {
    const users = await storage.getUsers();
    
    // Return only basic info for active users (no sensitive data)
    const usersList = users
      .filter(u => u.isActive)
      .map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        isActive: u.isActive, // Include for client-side filtering
      }));
    
    res.json(usersList);
  } catch (error) {
    console.error('Get users list error:', error);
    res.status(500).json({ error: 'Failed to get users list' });
  }
});

// Update own profile (email/password)
const updateProfileSchema = z.object({
  email: z.string().email().optional(),
  currentPassword: z.string().min(6).optional(),
  newPassword: z.string().min(6).optional(),
});

router.patch('/update-profile', requireAuth, async (req: AuthenticatedRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'Not authenticated' });
    }

    const data = updateProfileSchema.parse(req.body);
    const userId = req.user.id;
    
    // Get current user
    const currentUser = await storage.getUser(userId);
    if (!currentUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // If changing email, check if new email is available
    if (data.email && data.email !== currentUser.email) {
      const existing = await storage.getUserByEmail(data.email);
      if (existing) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    const updateData: any = {};
    
    // Update email if provided
    if (data.email && data.email !== currentUser.email) {
      updateData.email = data.email;
    }

    // Update password if provided
    if (data.newPassword && data.currentPassword) {
      // Verify current password
      if (!currentUser.passwordHash) {
        return res.status(400).json({ error: 'Current password verification failed' });
      }
      
      const isValid = await verifyPassword(data.currentPassword, currentUser.passwordHash);
      if (!isValid) {
        return res.status(400).json({ error: 'Current password is incorrect' });
      }
      
      // Hash new password
      updateData.passwordHash = await hashPassword(data.newPassword);
    }

    // Only update if there are changes
    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({ error: 'No changes provided' });
    }

    const updatedUser = await storage.updateUser(userId, updateData);
    
    if (!updatedUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove password hash
    const { passwordHash, ...safeUser } = updatedUser;
    
    res.json({
      success: true,
      user: safeUser,
    });
  } catch (error) {
    console.error('Update profile error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

export default router;
