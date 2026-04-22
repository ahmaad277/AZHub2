import { Router, Response } from 'express';
import { z } from 'zod';
import { storage } from '../storage';
import { hashPassword } from '../auth';
import { requireAuth, requirePermission, AuthenticatedRequest } from '../middleware/auth';
import { logUserAction } from '../helpers/audit';
import { PERMISSION_KEYS, canManageUser } from '../helpers/permissions';
import { insertUserSchema } from '@shared/schema';

const router = Router();

// All routes require authentication
router.use(requireAuth);

// Get all users (Admin only)
router.get('/', requirePermission(PERMISSION_KEYS.MANAGE_USERS), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const users = await storage.getUsers();
    
    // Remove password hashes
    const safeUsers = users.map(({ passwordHash, ...user }) => user);
    
    res.json(safeUsers);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get user by ID
router.get('/:id', requirePermission(PERMISSION_KEYS.MANAGE_USERS), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = await storage.getUser(id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Remove password hash
    const { passwordHash, ...safeUser } = user;
    
    res.json(safeUser);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

const createUserSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  phone: z.string().optional(),
  roleId: z.string(),
  isActive: z.number().min(0).max(1).optional(),
  password: z.string().min(6),
});

// Create user (Owner/Admin only)
router.post('/', requirePermission(PERMISSION_KEYS.MANAGE_USERS), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const data = createUserSchema.parse(req.body);
    
    // Check if email already exists
    const existingUser = await storage.getUserByEmail(data.email);
    if (existingUser) {
      return res.status(400).json({ error: 'Email already in use' });
    }

    // Hash password
    const passwordHash = await hashPassword(data.password);
    
    // Create user
    const user = await storage.createUser({
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      passwordHash,
      roleId: data.roleId,
      isActive: data.isActive ?? 1,
      createdBy: req.user!.id,
    });

    // Create default settings for user
    await storage.updateSettings({
      userId: user.id,
      theme: 'dark',
      language: 'en',
      viewMode: 'classic',
      fontSize: 'medium',
      autoReinvest: 0,
      currency: 'SAR',
    });

    // Log action
    await logUserAction(req, 'create', user.id, {
      email: user.email,
      role: data.roleId,
    });

    // Remove password hash
    const { passwordHash: _, ...safeUser } = user;
    
    res.status(201).json(safeUser);
  } catch (error) {
    console.error('Create user error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to create user' });
  }
});

const updateUserSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  roleId: z.string().optional(),
  isActive: z.number().min(0).max(1).optional(),
  password: z.string().min(6).optional(),
});

// Update user
router.patch('/:id', requirePermission(PERMISSION_KEYS.MANAGE_USERS), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!canManageUser(req, id)) {
      return res.status(403).json({ error: 'Cannot manage this user' });
    }

    const data = updateUserSchema.parse(req.body);
    
    // If changing email, check if new email is available
    if (data.email) {
      const existing = await storage.getUserByEmail(data.email);
      if (existing && existing.id !== id) {
        return res.status(400).json({ error: 'Email already in use' });
      }
    }

    const updateData: any = { ...data };
    
    // Hash password if provided
    if (data.password) {
      updateData.passwordHash = await hashPassword(data.password);
      delete updateData.password;
    }

    const user = await storage.updateUser(id, updateData);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log action
    await logUserAction(req, 'update', id, {
      changes: Object.keys(data),
    });

    // Remove password hash
    const { passwordHash, ...safeUser } = user;
    
    res.json(safeUser);
  } catch (error) {
    console.error('Update user error:', error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: 'Invalid request data', details: error.errors });
    }
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// Suspend user
router.post('/:id/suspend', requirePermission(PERMISSION_KEYS.MANAGE_USERS), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!canManageUser(req, id)) {
      return res.status(403).json({ error: 'Cannot manage this user' });
    }

    const user = await storage.suspendUser(id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log action
    await logUserAction(req, 'suspend', id);

    res.json({ success: true });
  } catch (error) {
    console.error('Suspend user error:', error);
    res.status(500).json({ error: 'Failed to suspend user' });
  }
});

// Activate user
router.post('/:id/activate', requirePermission(PERMISSION_KEYS.MANAGE_USERS), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    if (!canManageUser(req, id)) {
      return res.status(403).json({ error: 'Cannot manage this user' });
    }

    const user = await storage.activateUser(id);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log action
    await logUserAction(req, 'activate', id);

    res.json({ success: true });
  } catch (error) {
    console.error('Activate user error:', error);
    res.status(500).json({ error: 'Failed to activate user' });
  }
});

// Delete user
router.delete('/:id', requirePermission(PERMISSION_KEYS.MANAGE_USERS), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    
    // Cannot delete yourself
    if (id === req.user!.id) {
      return res.status(400).json({ error: 'Cannot delete yourself' });
    }

    if (!canManageUser(req, id)) {
      return res.status(403).json({ error: 'Cannot manage this user' });
    }

    const success = await storage.deleteUser(id);
    
    if (!success) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Log action
    await logUserAction(req, 'delete', id);

    res.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Assign platform to user
router.post('/:id/platforms', requirePermission(PERMISSION_KEYS.MANAGE_USERS), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { platformId, accessLevel } = req.body;

    if (!platformId || !accessLevel) {
      return res.status(400).json({ error: 'Platform ID and access level required' });
    }

    const userPlatform = await storage.assignPlatformToUser({
      userId: id,
      platformId,
      accessLevel,
    });

    // Log action
    await logUserAction(req, 'assign_permission', id, {
      platform: platformId,
      accessLevel,
    });

    res.status(201).json(userPlatform);
  } catch (error) {
    console.error('Assign platform error:', error);
    res.status(500).json({ error: 'Failed to assign platform' });
  }
});

// Remove platform from user
router.delete('/:id/platforms/:platformId', requirePermission(PERMISSION_KEYS.MANAGE_USERS), async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id, platformId } = req.params;

    const success = await storage.removePlatformFromUser(id, platformId);
    
    if (!success) {
      return res.status(404).json({ error: 'Platform assignment not found' });
    }

    // Log action
    await logUserAction(req, 'revoke_permission', id, {
      platform: platformId,
    });

    res.json({ success: true });
  } catch (error) {
    console.error('Remove platform error:', error);
    res.status(500).json({ error: 'Failed to remove platform' });
  }
});

export default router;
