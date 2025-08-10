// Unified WhatsApp bot with improved lifecycle management - Refactored version
import express from "express";
import { StartupManager } from "./services/StartupManager";
import { UnifiedBotLifecycle } from "./services/UnifiedBotLifecycle";

// Import unified route management
import messageRoutes from "./routes/unified/messageRoutes";
import getGroupsRouter from "./routes/getGroups";

// Import middleware
import { addRequestId, logRequest, handleBotError } from "./middleware/botMiddleware";

// Initialize startup manager and perform pre-flight checks
const startupManager = new StartupManager();
const logger = startupManager.getLogger();

/**
 * Wait for WhatsApp client to be ready before starting the server
 * This prevents 503 errors on routes that depend on the WhatsApp client
 */
async function waitForClientReady(
  botLifecycleManager: UnifiedBotLifecycle, 
  logger: any,
  timeoutMs: number = 300000 // 5 minutes default timeout
): Promise<void> {
  const startTime = Date.now();
  const checkInterval = 2000; // Check every 2 seconds

  return new Promise((resolve, reject) => {
    const checkReady = () => {
      const status = botLifecycleManager.getStatus();
      
      // Check if client is ready
      if (status.isReady) {
        logger.success("✅ WhatsApp client is ready!", "🎉");
        resolve();
        return;
      }
      
      // Check for browser or initialization errors
      if (status.lifecycleState.toString().startsWith('ERROR_')) {
        const error = new Error(
          `WhatsApp client failed to initialize. State: ${status.stateDescription}`
        );
        logger.error(`❌ Initialization failed: ${error.message}`);
        reject(error);
        return;
      }
      
      // Check for timeout
      if (Date.now() - startTime > timeoutMs) {
        const error = new Error(
          `Timeout waiting for WhatsApp client to be ready. Current state: ${status.stateDescription}`
        );
        logger.error(`⏰ Timeout: ${error.message}`);
        reject(error);
        return;
      }
      
      // Log current state with more specific messages
      const stateEmojis = {
        'BROWSER_LAUNCHING': '🚀',
        'WAITING_FOR_QR': '⏳',
        'QR_READY': '📱',
        'QR_SCANNED': '✅',
        'AUTHENTICATING': '🔐',
        'CONNECTED': '🌐'
      };
      
      const emoji = stateEmojis[status.lifecycleState] || "🔄";
      logger.info(
        `${emoji} Current state: ${status.stateDescription}`,
        "�"
      );
      
      // Check again after interval
      setTimeout(checkReady, checkInterval);
    };
    
    // Start checking
    checkReady();
  });
}

async function startBot(): Promise<void> {
  try {
    // Perform all startup validations
    const startupSuccess = await startupManager.initialize();

    if (!startupSuccess) {
      throw new Error("Startup validation failed");
    }

    const config = startupManager.getConfig();
    const app = express();
    
    // Basic middleware
    app.use(express.json());
    app.use(addRequestId);
    app.use(logRequest);

    // Initialize bot lifecycle
    const botLifecycleManager = new UnifiedBotLifecycle(config, logger);

    // Set up API routes using unified route management
    app.use("/", messageRoutes);
    app.use("/get-groups", getGroupsRouter);

    // QR code endpoint
    app.get("/qr-code", (req, res) => {
      const status = botLifecycleManager.getStatus();

      if (botLifecycleManager.hasQRCode()) {
        res.json({
          success: true,
          qrCode: botLifecycleManager.getQRCode(),
          message: "QR code is ready for scanning",
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

    // Bot status endpoint
    app.get("/status", (req, res) => {
      const status = botLifecycleManager.getStatus();
      res.json(status);
    });

    // Initialize WhatsApp client BEFORE starting server
    logger.startupHeader("🤖 INITIALIZING WHATSAPP CLIENT");
    await botLifecycleManager.initializeClient();

    // Wait for client to be ready before starting server
    logger.info("⏳ Waiting for WhatsApp client to be ready...");
    await waitForClientReady(botLifecycleManager, logger);

    // Start server only after WhatsApp client is ready
    logger.startupHeader("🌐 EXPRESS SERVER STARTUP");

    const server = app.listen(config.BOT_PORT, () => {
      logger.success(
        `${config.BOT_NAME} server started on port ${config.BOT_PORT}`
      );
      logger.success(
        "🎉 WhatsApp client is ready - All endpoints are now available!"
      );
      logger.info(
        `QR Code endpoint: http://localhost:${config.BOT_PORT}/qr-code`,
        "📱"
      );
    });

    server.on("error", (err) => {
      logger.error(`Server error: ${err.message}`);
      throw err;
    });

    // Graceful shutdown handlers
    const shutdown = async (signal: string) => {
      logger.info(`🛑 Received ${signal}, shutting down ${config.BOT_NAME}...`);
      await botLifecycleManager.shutdown();
      throw new Error(`Graceful shutdown requested via ${signal}`);
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (error) {
    logger.error(`Failed to start bot: ${error}`);
    throw error;
  }
}

// Start the bot
startBot().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("❌ Critical startup failure:", error);
  // eslint-disable-next-line no-process-exit
  process.exit(1);
});

// Export for compatibility
export { startupManager };
