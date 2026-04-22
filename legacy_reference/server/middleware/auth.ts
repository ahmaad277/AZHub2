import { Request, Response, NextFunction } from 'express';
import { storage } from '../storage';

declare module 'express-session' {
  interface SessionData {
    userId?: string;
    impersonatedUserId?: string;
    isAuthenticated?: boolean;
  }
}

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string; // Real session user ID (the actor)
    email: string;
    name: string;
    roleId: string;
    isActive: number;
    permissions: string[];
    effectiveUserId: string; // Effective user ID (impersonated user if impersonating)
    isImpersonating: boolean;
    impersonatedUserName?: string;
  };
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (!req.session?.userId) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const userId = req.session.userId;
    const user = await storage.getUser(userId);

    if (!user || !user.isActive) {
      res.status(401).json({ error: 'Invalid or inactive user' });
      return;
    }

    // Check for impersonation
    const impersonatedUserId = req.session.impersonatedUserId;
    let effectiveUser = user;
    let isImpersonating = false;
    let impersonatedUserName: string | undefined;

    if (impersonatedUserId) {
      const impersonatedUser = await storage.getUser(impersonatedUserId);
      if (impersonatedUser && impersonatedUser.isActive) {
        effectiveUser = impersonatedUser;
        isImpersonating = true;
        impersonatedUserName = impersonatedUser.name;
      }
    }

    // Get permissions for effective user (impersonated user's permissions)
    const permissions = await storage.getUserPermissions(effectiveUser.id);
    const permissionKeys = permissions.map(p => p.key);

    // CRITICAL: Store both real user (for audit) and effective user (for permissions)
    (req as AuthenticatedRequest).user = {
      id: user.id, // Real session user (ALWAYS the true actor for audit logs)
      email: user.email,
      name: user.name,
      roleId: user.roleId,
      isActive: user.isActive,
      permissions: permissionKeys, // Use impersonated user's permissions
      effectiveUserId: effectiveUser.id, // Use this for data access/permission checks
      isImpersonating,
      impersonatedUserName,
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

export function requirePermission(permissionKey: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    if (!authReq.user.permissions.includes(permissionKey)) {
      res.status(403).json({ 
        error: 'Insufficient permissions',
        required: permissionKey,
      });
      return;
    }

    next();
  };
}

export function requireAnyPermission(permissionKeys: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const hasAnyPermission = permissionKeys.some(key => 
      authReq.user!.permissions.includes(key)
    );

    if (!hasAnyPermission) {
      res.status(403).json({ 
        error: 'Insufficient permissions',
        requiredAny: permissionKeys,
      });
      return;
    }

    next();
  };
}

export function requireAllPermissions(permissionKeys: string[]) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const authReq = req as AuthenticatedRequest;

    if (!authReq.user) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const hasAllPermissions = permissionKeys.every(key => 
      authReq.user!.permissions.includes(key)
    );

    if (!hasAllPermissions) {
      res.status(403).json({ 
        error: 'Insufficient permissions',
        requiredAll: permissionKeys,
      });
      return;
    }

    next();
  };
}

export function requireOwner(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const authReq = req as AuthenticatedRequest;

  if (!authReq.user) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  if (authReq.user.isImpersonating) {
    res.status(403).json({ error: 'Cannot perform this action while impersonating' });
    return;
  }

  if (!authReq.user.permissions.includes('system:manage_users')) {
    res.status(403).json({ error: 'Owner access required' });
    return;
  }

  next();
}
