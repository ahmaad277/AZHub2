import type { AuthenticatedRequest } from "../middleware/auth";

/** Alias used by user routes; maps to seeded permission key `EDIT_USERS`. */
export const PERMISSION_KEYS = {
  MANAGE_USERS: "EDIT_USERS",
} as const;

export function canManageUser(req: AuthenticatedRequest, _targetUserId: string): boolean {
  return req.user?.permissions.includes(PERMISSION_KEYS.MANAGE_USERS) ?? false;
}
