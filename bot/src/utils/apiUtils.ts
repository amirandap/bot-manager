/**
 * API Server Utilities
 * Centralized functions for Express server management
 */
import * as express from "express";
import * as multer from "multer";
import { getQRStatus, isWhatsAppClientReady, getWhatsAppClient } from "./whatsAppUtils";
import { logger } from "../services/LoggerService";
import { MessageController } from "../controllers/MessageController";
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
  const getGroupsRouter = (await import("../routes/getGroups")).default;
  const { addRequestId, logRequest } = await import("../middleware/botMiddleware");

  // Create Express app
  expressApp = express.default();

  // Configure multer for file uploads
  const upload = multer.default({
    storage: multer.default.memoryStorage(),
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB limit
    },
  });

  // Basic middleware
  expressApp.use(express.json());
  expressApp.use(addRequestId);
  expressApp.use(logRequest);

  // ============================================================================
  // UNIFIED MESSAGE ENDPOINTS - Direct integration (no intermediate router)
  // ============================================================================

  /**
   * POST /send-to-phone - Send message to phone numbers only
   */
  expressApp.post("/send-to-phone", upload.single("file"), MessageController.sendToPhone);

  /**
   * POST /send-to-group - Send message to groups only
   */
  expressApp.post("/send-to-group", upload.single("file"), MessageController.sendToGroup);

  /**
   * POST /send-broadcast - Send message to both phones and groups
   */
  expressApp.post("/send-broadcast", upload.single("file"), MessageController.sendBroadcast);

  /**
   * POST /send-message - Simple message sending (legacy compatibility)
   */
  expressApp.post("/send-message", upload.single("media"), MessageController.sendSimpleMessage);

  // ============================================================================
  // MEDIA ENDPOINTS
  // ============================================================================

  /**
   * POST /send-image - Send image with optional caption
   */
  expressApp.post("/send-image", upload.single("file"), (req, res) => {
    MessageController.sendMedia(req, res, "image");
  });

  /**
   * POST /send-document - Send document with optional message
   */
  expressApp.post("/send-document", upload.single("file"), (req, res) => {
    MessageController.sendMedia(req, res, "document");
  });

  /**
   * POST /send-audio - Send audio file with optional message
   */
  expressApp.post("/send-audio", upload.single("file"), (req, res) => {
    MessageController.sendMedia(req, res, "audio");
  });

  /**
   * POST /send-video - Send video with optional caption
   */
  expressApp.post("/send-video", upload.single("file"), (req, res) => {
    MessageController.sendMedia(req, res, "video");
  });

  // ============================================================================
  // OTHER ROUTES
  // ============================================================================

  // Groups endpoint
  expressApp.use("/get-groups", getGroupsRouter);

  // Status endpoints
  expressApp.get("/status", (req, res) => {
    const isReady = isWhatsAppClientReady();
    const hasClient = getWhatsAppClient() !== null;
    const qrStatus = getQRStatus();
    
    res.json({
      botId: config.BOT_ID,
      botName: config.BOT_NAME,
      isReady: isReady,
      hasClient: hasClient,
      timestamp: new Date().toISOString(),
      ...qrStatus
    });
  });

  // Health endpoint
  expressApp.get("/health", (req, res) => {
    const isReady = isWhatsAppClientReady();
    res.json({
      status: isReady ? "healthy" : "starting",
      ready: isReady,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  logger.info("Express API configured successfully", "🌐");
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
    const error = new Error("Express API not configured. Call setupExpressAPI first.");
    logger.error(error.message, { component: 'api' }, "API_SERVER_STATUS", 1);
    throw error;
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`Attempting to start API server on port ${config.BOT_PORT} (attempt ${attempt}/${maxRetries})`, "🚀", undefined, "API_SERVER_STATUS", "STARTING");

      // Start server
      httpServer = expressApp.listen(config.BOT_PORT, () => {
        logger.info(`✅ ${config.BOT_NAME} API server started successfully on port ${config.BOT_PORT}`, "✅", undefined, "API_SERVER_STATUS", "UP");
        logger.info(`📊 Status: http://localhost:${config.BOT_PORT}/status`, "🌐");
        logger.info(` Health: http://localhost:${config.BOT_PORT}/health`, "🌐");
      });

      return httpServer;

    } catch (error) {
      lastError = error as Error;
      logger.warn(`API server startup attempt ${attempt} failed: ${error}`, undefined, "API_SERVER_STATUS", "FAILED");

      // Check if this is a port conflict
      if (isPortError(error as Error)) {
        logger.info(`Port ${config.BOT_PORT} conflict detected, attempting to resolve...`, "🔧");
        
        // Try to clean the port
        const cleanupSuccess = await cleanPort(config.BOT_PORT);
        
        if (cleanupSuccess && attempt < maxRetries) {
          logger.info("Port cleaned successfully, retrying...");
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
  const finalError = lastError || new Error("API server startup failed after retries");
  logger.error(finalError.message, { component: 'api', retries: maxRetries }, "API_SERVER_STATUS", 1);
  throw finalError;
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

    logger.info(`🔧 Checking for processes using port ${port}...`);

    // Find process using the port
    const { stdout } = await execAsync(`lsof -ti:${port}`);
    const pids = stdout.trim().split('\n').filter(pid => pid);

    if (pids.length === 0) {
      logger.info(`Port ${port} is already free`);
      return true;
    }

    logger.info(`Found ${pids.length} process(es) using port ${port}: ${pids.join(', ')}`);

    // Kill each process
    for (const pid of pids) {
      try {
        await execAsync(`kill -9 ${pid}`);
        logger.info(`Killed process ${pid}`, "💀");
      } catch (killError) {
        logger.warn(`Failed to kill process ${pid}: ${killError}`);
      }
    }

    // Wait a moment for processes to terminate
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify port is now free
    try {
      const { stdout: checkStdout } = await execAsync(`lsof -ti:${port}`);
      const remainingPids = checkStdout.trim().split('\n').filter(pid => pid);
      
      if (remainingPids.length === 0) {
        logger.info(`Port ${port} successfully cleaned`);
        return true;
      } else {
        logger.warn(`Port ${port} still has ${remainingPids.length} process(es) running`);
        return false;
      }
    } catch {
      // If lsof fails, assume port is free
      logger.info(`Port ${port} appears to be cleaned`);
      return true;
    }

  } catch (error) {
    logger.error(`Error cleaning port ${port}: ${error}`);
    return false;
  }
}

/**
 * Shutdown API server
 */
export async function shutdownAPIServer(): Promise<void> {
  try {
    if (httpServer) {
      logger.info("Shutting down API server...", "🛑", undefined, "API_SERVER_STATUS", "STOPPING");
      
      return new Promise((resolve, reject) => {
        httpServer.close((error: any) => {
          if (error) {
            logger.error(`Error shutting down API server: ${error}`, { component: 'api' }, "API_SERVER_STATUS", 1);
            reject(error);
          } else {
            logger.info("API server shutdown complete", "✅", undefined, "API_SERVER_STATUS", "DOWN");
            httpServer = null;
            resolve();
          }
        });
      });
    }
  } catch (error) {
    logger.error(`Error during API server shutdown: ${error}`);
    throw error;
  }
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
