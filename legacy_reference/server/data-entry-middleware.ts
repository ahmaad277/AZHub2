import type { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

// Extend Express Request type to include dataEntry context
declare global {
  namespace Express {
    interface Request {
      dataEntry?: {
        isDataEntry: boolean;
      };
    }
  }
}

/**
 * Middleware to verify data-entry token from X-Data-Entry-Token header
 * Sets req.dataEntry.isDataEntry = true if valid token provided
 * Rejects request with 403 if invalid token provided
 * Allows request through if no token header (normal owner access)
 * 
 * SECURITY NOTE: This is designed for a single-user personal finance application.
 * The system assumes that without authentication, the user accessing the app directly
 * is the owner. Data-entry users MUST include the X-Data-Entry-Token header to be 
 * identified and restricted. This design works when the app is privately hosted and
 * the owner controls physical/network access to the application.
 */
export async function withDataEntryToken(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const token = req.headers["x-data-entry-token"] as string | undefined;

  // If no token header, this is normal owner access - allow through
  if (!token) {
    return next();
  }

  try {
    // Verify token against stored settings
    const settings = await storage.getSettings();
    
    if (!settings.dataEntryToken) {
      return res.status(403).json({ 
        error: "Data entry access not configured",
        code: "NO_TOKEN_CONFIGURED"
      });
    }

    if (settings.dataEntryToken !== token) {
      return res.status(403).json({ 
        error: "Invalid data entry token",
        code: "INVALID_TOKEN"
      });
    }

    // Valid token - mark request as data-entry
    req.dataEntry = {
      isDataEntry: true,
    };

    next();
  } catch (error) {
    console.error("Data entry token verification error:", error);
    res.status(500).json({ error: "Token verification failed" });
  }
}

/**
 * Middleware to block data-entry access to sensitive endpoints
 * Should be used on routes that data-entry users should NOT access
 */
export function blockDataEntry(req: Request, res: Response, next: NextFunction) {
  if (req.dataEntry?.isDataEntry) {
    return res.status(403).json({
      error: "Access denied for data entry users",
      code: "DATA_ENTRY_FORBIDDEN"
    });
  }
  next();
}
