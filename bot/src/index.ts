// Unified WhatsApp bot with improved lifecycle management - Refactored version
import express from "express";
import { StartupManager } from "./services/StartupManager";
import { UnifiedBotLifecycle } from "./services/UnifiedBotLifecycle";

// Initialize startup manager and perform pre-flight checks
const startupManager = new StartupManager();
const logger = startupManager.getLogger();

async function startBot(): Promise<void> {
  try {
    // Perform all startup validations
    const startupSuccess = await startupManager.initialize();

    if (!startupSuccess) {
      throw new Error("Startup validation failed");
    }

    const config = startupManager.getConfig();
    const app = express();
    app.use(express.json());

    // Initialize bot lifecycle
    const botLifecycleManager = new UnifiedBotLifecycle(config, logger);

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

    // Start server
    logger.startupHeader("🌐 EXPRESS SERVER STARTUP");

    const server = app.listen(config.BOT_PORT, () => {
      logger.success(
        `${config.BOT_NAME} server started on port ${config.BOT_PORT}`
      );
      logger.info(
        `QR Code endpoint: http://localhost:${config.BOT_PORT}/qr-code`,
        "📱"
      );

      // Initialize WhatsApp client after server is ready
      botLifecycleManager.initializeClient();
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
