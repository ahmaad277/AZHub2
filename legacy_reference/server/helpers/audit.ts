import type { Request } from "express";
import type { AuthenticatedRequest } from "../middleware/auth";
import { storage } from "../storage";

export async function logUserAction(
  req: Request,
  action: string,
  targetId: string,
  details?: Record<string, unknown>,
): Promise<void> {
  const auth = req as AuthenticatedRequest;
  await storage.logAudit({
    actorId: auth.user?.id,
    actionType: action,
    targetType: "user",
    targetId,
    details: details ? JSON.stringify(details) : null,
  });
}
