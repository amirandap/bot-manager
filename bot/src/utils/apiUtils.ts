/**
 * API Server Utilities
 * Centralized functions for Express server management
 */

import { Request, Response, NextFunction } from "express";
import { BOT_PORT } from "../config/EnvironmentManager";
import { setupRoutes } from "../routes/unified/messageRoutes";
import { sendQRCode, hasQRCode, getQRCode, getQRStatus } from "./qrUtils";
import { getWhatsAppStatus, isWhatsAppClientReady, getWhatsAppClient } from "./whatsAppUtils";
import { getClient } from "../config/clientExporter";
import { botLogger } from "./loggerWrapper";
import * as express from "express";

interface BotConfig {
  BOT_ID: string;
  BOT_NAME: string;
  BOT_PORT: number;
}

// Global server state
let expressApp: express.Application | null = null;
let httpServer: any = null;

/**
 * Setup Express API with all necessary routes and middleware
 */
export async function setupExpressAPI(config: BotConfig): Promise<express.Application> {
  if (expressApp) {
    return expressApp;
  }

  // Import routes only when needed
  const messageRoutes = (await import("../routes/unified/messageRoutes")).default;
  const getGroupsRouter = (await import("../routes/getGroups")).default;
  const { addRequestId, logRequest } = await import("../middleware/botMiddleware");

  // Create Express app
  expressApp = express.default();

  // Basic middleware
  expressApp.use(express.json());
  expressApp.use(addRequestId);
  expressApp.use(logRequest);

  // API routes
  expressApp.use("/", messageRoutes);
  expressApp.use("/get-groups", getGroupsRouter);

  // Status endpoints
  expressApp.get("/qr-code", (req, res) => {
    const status = getBotStatus(config);
    if (hasQRCode()) {
      res.json({
        success: true,
        qrCode: getQRCode(),
        message: "QR code ready for scanning",
        ...status,
      });
    } else {
      res.json({
        success: false,
        message: status.stateDescription,
        ...status,
      });
    }
  });

  expressApp.get("/status", (req, res) => {
    const status = getBotStatus(config);
    res.json(status);
  });

  // Health endpoint
  expressApp.get("/health", (req, res) => {
    const whatsappStatus = getWhatsAppStatus();
    res.json({
      status: whatsappStatus.isReady ? "healthy" : "starting",
      ready: whatsappStatus.isReady,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  botLogger.info("Express API configured successfully", "🌐");
  return expressApp;
}

/**
 * Start the API server
 */
export async function startAPIServer(
  config: BotConfig,
  maxRetries: number = 2
): Promise<any> {
  if (!expressApp) {
    throw new Error("Express API not configured. Call setupExpressAPI first.");
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      botLogger.info(`Attempting to start API server on port ${config.BOT_PORT} (attempt ${attempt}/${maxRetries})`, "🚀");

      // Start server
      httpServer = expressApp.listen(config.BOT_PORT, () => {
        botLogger.success(`✅ ${config.BOT_NAME} API server started successfully on port ${config.BOT_PORT}`);
        botLogger.info(`📊 Status: http://localhost:${config.BOT_PORT}/status`, "🌐");
        botLogger.info(`📱 QR Code: http://localhost:${config.BOT_PORT}/qr-code`, "🌐");
        botLogger.info(`💚 Health: http://localhost:${config.BOT_PORT}/health`, "🌐");
      });

      return httpServer;

    } catch (error) {
      lastError = error as Error;
      botLogger.warn(`API server startup attempt ${attempt} failed: ${error}`);

      // Check if this is a port conflict
      if (isPortError(error as Error)) {
        botLogger.info(`Port ${config.BOT_PORT} conflict detected, attempting to resolve...`, "🔧");
        
        // Try to clean the port
        const cleanupSuccess = await cleanPort(config.BOT_PORT);
        
        if (cleanupSuccess && attempt < maxRetries) {
          botLogger.info("Port cleaned successfully, retrying...");
          // Wait a moment before retrying
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
      }

      if (attempt === maxRetries) {
        break;
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }

  // If we get here, all retries failed
  throw lastError || new Error("API server startup failed after retries");
}

/**
 * Check if an error is related to port being in use
 */
function isPortError(error: Error): boolean {
  const errorMessage = error.message.toLowerCase();
  const errorCode = (error as any).code;
  
  return (
    errorCode === 'EADDRINUSE' ||
    errorMessage.includes('eaddrinuse') ||
    errorMessage.includes('address already in use') ||
    errorMessage.includes('port') && errorMessage.includes('in use')
  );
}

/**
 * Clean a port by killing processes using it
 */
async function cleanPort(port: number, ): Promise<boolean> {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    botLogger.info(`🔧 Checking for processes using port ${port}...`);

    // Find process using the port
    const { stdout } = await execAsync(`lsof -ti:${port}`);
    const pids = stdout.trim().split('\n').filter(pid => pid);

    if (pids.length === 0) {
      botLogger.info(`Port ${port} is already free`);
      return true;
    }

    botLogger.info(`Found ${pids.length} process(es) using port ${port}: ${pids.join(', ')}`);

    // Kill each process
    for (const pid of pids) {
      try {
        await execAsync(`kill -9 ${pid}`);
        botLogger.info(`Killed process ${pid}`, "💀");
      } catch (killError) {
        botLogger.warn(`Failed to kill process ${pid}: ${killError}`);
      }
    }

    // Wait a moment for processes to terminate
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify port is now free
    try {
      const { stdout: checkStdout } = await execAsync(`lsof -ti:${port}`);
      const remainingPids = checkStdout.trim().split('\n').filter(pid => pid);
      
      if (remainingPids.length === 0) {
        botLogger.success(`Port ${port} successfully cleaned`);
        return true;
      } else {
        botLogger.warn(`Port ${port} still has ${remainingPids.length} process(es) running`);
        return false;
      }
    } catch {
      // If lsof fails, assume port is free
      botLogger.success(`Port ${port} appears to be cleaned`);
      return true;
    }

  } catch (error) {
    botLogger.error(`Error cleaning port ${port}: ${error}`);
    return false;
  }
}

/**
 * Shutdown API server
 */
export async function shutdownAPIServer(): Promise<void> {
  try {
    if (httpServer) {
      botLogger.info("Shutting down API server...", "🛑");
      
      return new Promise((resolve, reject) => {
        httpServer.close((error: any) => {
          if (error) {
            botLogger.error(`Error shutting down API server: ${error}`);
            reject(error);
          } else {
            botLogger.success("API server shutdown complete");
            httpServer = null;
            resolve();
          }
        });
      });
    }
  } catch (error) {
    botLogger.error(`Error during API server shutdown: ${error}`);
    throw error;
  }
}

/**
 * Get comprehensive bot status
 */
function getBotStatus(config: BotConfig) {
  const whatsappStatus = getWhatsAppStatus();
  const whatsappReady = isWhatsAppClientReady();
  const qrStatus = getQRStatus();

  return {
    botId: config.BOT_ID,
    botName: config.BOT_NAME,
    isInitialized: whatsappReady,
    isShuttingDown: false, // This will be managed at index level
    hasClient: getWhatsAppClient() !== null,
    isReady: whatsappStatus.isReady,
    lifecycleState: whatsappStatus.state,
    stateDescription: whatsappStatus.state,
    lifecycleDetails: {
      currentState: whatsappStatus.state,
      stateDescription: whatsappStatus.state,
      isHealthy: whatsappStatus.isReady,
      hasQRCode: qrStatus.hasCode,
      timestamp: new Date().toISOString()
    },
    ...qrStatus,
  };
}

/**
 * Get Express app instance
 */
export function getExpressApp(): express.Application | null {
  return expressApp;
}

/**
 * Get HTTP server instance
 */
export function getHTTPServer(): any {
  return httpServer;
}
