// Simplified WhatsApp Bot Starter - Direct startup implementation
import { logger } from './services/LoggerService';
import { EnvironmentManager } from "./config/EnvironmentManager";
import { puppeteerConfig } from "./config/PuppeteerConfig";
import { DirectoryManagerService } from "./services/DirectoryManagerService";

// Import utility functions instead of service classes
import {
  initializeWhatsAppClient,
  cleanupQRCodeAfterConnection
} from "./utils/whatsAppUtils";

import {
  setupExpressAPI,
  startAPIServer
} from "./utils/apiUtils";

import {
  gracefulShutdown as performGracefulShutdown,
  setupShutdownHandlers
} from "./utils/shutdownUtils";

import {
  getSystemInfo
} from "./utils/browserUtils";

import { SessionMonitorService } from "./services/SessionMonitorService";

/**
 * Print environment variables during startup
 */
function printEnvironmentVariables(): void {
  logger.info("🔍 ENVIRONMENT VARIABLES VERIFICATION", "🔍");

  const envManager = EnvironmentManager.getInstance();
  const config = envManager.getConfig();
  const processInfo = envManager.getProcessInfo();

  // Print main configuration
  logger.info(`BOT_ID: ${config.BOT_ID} (EnvironmentManager)`);
  logger.info(`BOT_NAME: ${config.BOT_NAME} (${envManager.getEnvSource("BOT_NAME")})`);
  logger.info(`BOT_PORT: ${config.BOT_PORT} (${envManager.getEnvSource("BOT_PORT")})`);
  logger.info(`BOT_TYPE: ${config.BOT_TYPE} (${envManager.getEnvSource("BOT_TYPE")})`);
  logger.info(`NODE_ENV: ${config.NODE_ENV} (${envManager.getEnvSource("NODE_ENV")})`);
  logger.info(`CHROME_PATH: ${config.CHROME_PATH} (${envManager.getEnvSource("CHROME_PATH")})`);

  // Print process info
  logger.info(`PWD: ${processInfo.PWD as string} (system)`);
  logger.info(`PID: ${processInfo.PID} (system)`);

  // Print PM2 variables if running under PM2
  if (envManager.isPM2()) {
    logger.info("📊 PM2 Environment Variables:", "📊");
    const pm2Vars = envManager.getPM2Variables();
    Object.entries(pm2Vars).forEach(([key, value]) => {
      logger.info(`   ${key}: ${value}`);
    });
  }

  // Print file paths
  logger.info("📁 File Paths:", "📁");
  logger.info(`   DATA_ROOT: ${config.DATA_ROOT}`);
  logger.info(`   SESSION_PATH: ${config.SESSION_PATH}`);
  logger.info(`   QR_PATH: ${config.QR_PATH}`);
  logger.info(`   LOGS_PATH: ${config.LOGS_PATH}`);
}

/**
 * Validate Chrome executable
 */
function validateChrome(): boolean {
  logger.info("🔍 CHROME EXECUTABLE VALIDATION", "🔍");

  const envManager = EnvironmentManager.getInstance();
  const config = envManager.getConfig();
  const result = puppeteerConfig.validate(config.CHROME_PATH);

  if (!result.isValid) {
    logger.error("Chrome validation failed. Cannot proceed.");
    
    // Log all validation details
    result.logs.forEach(log => {
      logger.info(log);
    });
    
    if (result.error) {
      logger.error(result.error);
    }
    
    if (result.alternativePaths && result.alternativePaths.length > 0) {
      logger.info("💡 Alternative Chrome paths found:");
      result.alternativePaths.forEach(path => {
        logger.info(`   ✅ ${path}`);
      });
    }
    
    return false;
  }

  // Log success details
  result.logs.forEach(log => {
    logger.info(log);
  });

  return true;
}

/**
 * Create required directories
 */
function createStartupDirectories(): void {
  logger.info("📁 DIRECTORY CREATION", "📁");
  
  const directoryManager = new DirectoryManagerService();
  directoryManager.ensureDirectoriesExist();
}

/**
 * Perform startup initialization
 */
async function initializeStartup(): Promise<boolean> {
  try {
    // Step 1: Print environment variables
    printEnvironmentVariables();

    // Step 2: Validate Chrome
    if (!validateChrome()) {
      return false;
    }

    // Step 3: Create directories
    createStartupDirectories();

    logger.info("All pre-flight checks passed. Ready to start bot.");
    return true;
  } catch (error) {
    logger.error(`Startup failed: ${error}`);
    return false;
  }
}

async function startBot(): Promise<void> {
  try {
    // Step 1: Startup validation (Environment, Chrome, Directories)
    const startupSuccess = await initializeStartup();
    if (!startupSuccess) {
      const error = new Error("Startup validation failed - check Chrome installation and environment variables");
      logger.error(error, { component: 'startup', critical: true });
      throw error;
    }

    const envManager = EnvironmentManager.getInstance();
    const config = envManager.getConfig();
    
    // Step 2: Initialize WhatsApp client and wait for it to be ready
    getSystemInfo(); // Show system information
    logger.info("🚀 Initializing WhatsApp client - this will wait for QR code scanning...");
    await initializeWhatsAppClient(config);
    logger.info("✅ WhatsApp client is now ready and authenticated!");

    // Step 3: Setup and start API server (only after WhatsApp is ready)
    logger.info("🌐 Starting API server now that WhatsApp is ready...");
    await setupExpressAPI(config);
    await startAPIServer(config);

    // Step 4: Setup shutdown handlers
    setupShutdownHandlers(async (signal: string) => {
      // Stop session monitoring before shutdown
      const sessionMonitor = SessionMonitorService.getInstance();
      sessionMonitor.stopMonitoring();
      
      await performGracefulShutdown(signal);
    });
    
    // Step 5: Start session monitoring
    const sessionMonitor = SessionMonitorService.getInstance();
    sessionMonitor.startMonitoring();
    
    // Startup completed - now everything is ready
    logger.info("🎉 Bot startup completed successfully! All systems operational.");
    logger.info("✅ WhatsApp client authenticated and API server running!");
    logger.info("🔍 Session monitoring active - automatic recovery enabled!");
    cleanupQRCodeAfterConnection();
    
  } catch (error) {
    // Critical failure - ensure PM2 is notified and shutdown gracefully
    logger.error(error as Error, { component: 'startup', context: 'critical_startup', critical: true });
    
    await performGracefulShutdown(undefined, error as Error);
    throw error;
  }
}

// Start the bot
startBot().catch(() => {
  process.exit(1);
});
