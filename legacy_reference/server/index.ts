import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { storage } from "./storage";
import { checkAllInvestmentStatuses } from "../shared/status-manager";

const app = express();

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

app.use(express.json({
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  try {
    const synced = await storage.syncDurationMonthsFromDates();
    if (synced > 0) {
      log(`Updated duration_months for ${synced} investment(s) from start/end dates`);
    }
  } catch (err) {
    console.error("syncDurationMonthsFromDates failed:", err);
  }

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    console.error('API Error:', err);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // Keep a static port for predictable external tunnels.
  const port = 5000;
  // Bind all interfaces so external tunnel/LAN clients can connect.
  const host = "0.0.0.0";

  // State tracking for server initialization
  let serverStarted = false;
  let statusCheckInterval: NodeJS.Timeout | null = null;
  
  // Handle server listen errors (especially EADDRINUSE) - attach BEFORE listen()
  server.once('error', (error: NodeJS.ErrnoException) => {
    console.error('❌ Server error during startup:', error);
    
    if (error.code === 'EADDRINUSE') {
      console.error(`❌ Port ${port} is already in use.`);
      console.error('This usually means another instance is running.');
      console.error('Waiting 3 seconds before exiting to allow cleanup...');
      
      // Give time for logs to flush and cleanup
      setTimeout(() => {
        process.exit(1);
      }, 3000);
    } else {
      // Other server errors - exit immediately
      console.error('Exiting due to server error');
      process.exit(1);
    }
  });
  
  server.listen(port, host, () => {
    if (host === "0.0.0.0") {
      log(`serving on http://127.0.0.1:${port} (this machine) — LAN: http://<your-pc-ip>:${port}`);
    } else {
      log(`serving on http://${host}:${port}`);
    }
    serverStarted = true;
    startBackgroundTasks();
  });

  // Background task: Periodic investment status checker
  function startBackgroundTasks() {
    async function runInvestmentStatusCheck() {
    try {
      log('Running investment status check...');
      
      // Get all investments and cashflows
      const investments = await storage.getInvestments();
      const allCashflows = await storage.getCashflows();
      
      // Group cashflows by investment (optimized with Map to avoid O(n²))
      const cashflowsByInvestment = new Map<string, typeof allCashflows>();
      for (const cashflow of allCashflows) {
        const investmentCashflows = cashflowsByInvestment.get(cashflow.investmentId) || [];
        investmentCashflows.push(cashflow);
        cashflowsByInvestment.set(cashflow.investmentId, investmentCashflows);
      }
      
      const investmentsWithCashflows = investments.map((investment) => ({
        investment,
        cashflows: cashflowsByInvestment.get(investment.id) || [],
      }));

      // Check for status updates
      const statusUpdates = checkAllInvestmentStatuses(investmentsWithCashflows);
      
      if (statusUpdates.length > 0) {
        log(`Found ${statusUpdates.length} status updates to apply`);
        
        // Apply each status update
        for (const update of statusUpdates) {
          await storage.updateInvestmentStatus(
            update.investmentId,
            update.newStatus,
            update.lateDate,
            update.defaultedDate
          );
          log(`Updated investment ${update.investmentId} to status: ${update.newStatus}`);
        }
      } else {
        log('No status updates needed');
      }
    } catch (error) {
      console.error('❌ Critical error in investment status check:', error);
      // Don't crash the server - log and continue
    }
  }

    // Run status check immediately on startup
    runInvestmentStatusCheck().catch(err => {
      console.error('❌ Failed to run initial status check:', err);
    });

    // Run status check periodically (configurable via environment variable)
    const CHECK_INTERVAL_MINUTES = parseInt(process.env.STATUS_CHECK_INTERVAL_MINUTES || '60', 10);
    const CHECK_INTERVAL_MS = CHECK_INTERVAL_MINUTES * 60 * 1000;
    statusCheckInterval = setInterval(runInvestmentStatusCheck, CHECK_INTERVAL_MS);
    log(`Investment status checker scheduled to run every ${CHECK_INTERVAL_MINUTES} minutes`);
  } // Close startBackgroundTasks()
  
  // Graceful shutdown handler
  let isShuttingDown = false;
  let forceShutdownTimer: NodeJS.Timeout | null = null;
  
  function gracefulShutdown(signal: string) {
    // Prevent multiple shutdown attempts
    if (isShuttingDown) {
      return;
    }
    isShuttingDown = true;
    
    console.log(`\n${signal} received. Starting graceful shutdown...`);
    
    // Clear the interval timer if it exists
    if (statusCheckInterval) {
      clearInterval(statusCheckInterval);
      log('Background tasks stopped');
    }
    
    // Close the server with error handling
    try {
      server.close(() => {
        log('Server closed successfully');
        if (forceShutdownTimer) {
          clearTimeout(forceShutdownTimer);
        }
        process.exit(0);
      });
    } catch (error: any) {
      // Handle ERR_SERVER_NOT_RUNNING gracefully
      if (error.code === 'ERR_SERVER_NOT_RUNNING') {
        log('Server already stopped');
        if (forceShutdownTimer) {
          clearTimeout(forceShutdownTimer);
        }
        process.exit(0);
      } else {
        console.error('❌ Error closing server:', error);
        process.exit(1);
      }
    }
    
    // Force close after 10 seconds if graceful shutdown fails
    forceShutdownTimer = setTimeout(() => {
      console.error('❌ Forced shutdown after timeout');
      process.exit(1);
    }, 10000);
  }
  
  // Listen for termination signals
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  
  // Global error handlers
  process.on('uncaughtException', (error: any) => {
    console.error('❌ Uncaught Exception:', error);
    
    // Special handling for EADDRINUSE - let server.once('error') handle it
    if (error.code === 'EADDRINUSE' || error.syscall === 'listen') {
      // Don't double-handle listen errors - they're caught by server.once('error')
      return;
    }
    
    // For other uncaught exceptions, trigger shutdown only if server started
    if (serverStarted && statusCheckInterval !== null) {
      gracefulShutdown('uncaughtException');
    } else {
      // Server not started yet, exit immediately
      console.error('❌ Server not started, exiting');
      process.exit(1);
    }
  });
  
  process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
    // Log but don't exit - let the app continue
  });
})();
