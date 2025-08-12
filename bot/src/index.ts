// Simplified WhatsApp Bot Starter - Refactored with Utility Functions
import { 
  alertPM2Failure, 
  notifyPM2Shutdown, 
  markStartupComplete,
  STARTUP_STEPS,
  getTotalStartupSteps,
  // Master step handler function
  handleStep
} from "./utils/pm2Utils";

// Import startup utilities instead of StartupManager service
import {
  initializeStartup,
  getStartupConfig
} from "./utils/startupUtils";

// Import other utility functions instead of service classes
import {
  initializeWhatsAppClient,
  shutdownWhatsAppClient,
  getWhatsAppStatus,
  isWhatsAppClientReady
} from "./utils/whatsAppUtils";

import {
  initializeQRCode,
  handleQRGenerated,
  cleanupQRCode
} from "./utils/qrUtils";

import {
  setupExpressAPI,
  startAPIServer,
  shutdownAPIServer
} from "./utils/apiUtils";

import {
  validateBrowserEnvironment,
  getSystemInfo,
  validateEnvironmentForBrowser
} from "./utils/browserUtils";

// Import unified logger
import { botLogger } from "./utils/loggerWrapper";

// Global state flags
let isShuttingDown = false;

/**
 * Graceful shutdown with PM2 notification
 */
async function gracefulShutdown(signal?: string, error?: Error): Promise<void> {
  if (isShuttingDown) {
    botLogger.warn("Shutdown already in progress");
    return;
  }

  isShuttingDown = true;

  try {
    botLogger.info(`🛑 Initiating graceful shutdown${signal ? ` (${signal})` : ''}...`);
    
    // Shutdown API server
    await shutdownAPIServer();
    
    // Shutdown WhatsApp client
    await shutdownWhatsAppClient();
    
    // Clean up QR code
    cleanupQRCode();
    
    // Notify PM2 about shutdown
    notifyPM2Shutdown(signal, error, error ? 'error_triggered' : 'manual');
    
    botLogger.success("✅ Graceful shutdown completed");
  } catch (shutdownError) {
    botLogger.error(`❌ Error during shutdown: ${shutdownError}`);
    alertPM2Failure(shutdownError as Error, 'shutdown');
  }
}

async function startBot(): Promise<void> {
  try {
    // Step 1: Startup validation (Environment, Chrome, Directories)
    botLogger.startupHeader("🔍 STARTUP VALIDATION");
    handleStep('VALIDATION', 'progress', { message: "Validating environment and dependencies" });
    
    // Validate using startup utilities instead of StartupManager
    const startupSuccess = await initializeStartup();
    if (!startupSuccess) {
      const error = new Error("Startup validation failed - check Chrome installation and environment variables");
      handleStep('VALIDATION', 'fail', { error, shouldRestart: false });
      throw error;
    }

    // Additional browser validation
    const browserValid = await validateBrowserEnvironment();
    if (!browserValid) {
      const error = new Error("Browser environment validation failed");
      handleStep('VALIDATION', 'fail', { error, shouldRestart: false });
      throw error;
    }

    handleStep('VALIDATION', 'complete', { message: "Environment validation completed successfully" });

    const config = getStartupConfig();
    
    // Step 2: Initialize QR code system
    handleStep('LIFECYCLE_INIT', 'progress', { message: "Initializing QR code system" });
    
    initializeQRCode(config.BOT_ID, config.BOT_PORT);
    
    handleStep('LIFECYCLE_INIT', 'complete', { message: "QR code system initialized successfully" });

    // Step 3: Initialize WhatsApp client
    handleStep('WHATSAPP_CLIENT', 'progress', { message: "Initializing WhatsApp client" });
    
    // Show system information
    getSystemInfo();
    
    // Validate environment for browser
    await validateEnvironmentForBrowser();
    
    // Initialize WhatsApp client with QR callback
    await initializeWhatsAppClient(config, async (qr: string) => {
      await handleQRGenerated(qr, config.BOT_PORT);
    });
    
    handleStep('WHATSAPP_CLIENT', 'complete', { message: "WhatsApp client initialized successfully" });
    
    // Step 4: Check for critical initialization errors
    handleStep('ERROR_CHECK', 'progress', { message: "Validating WhatsApp initialization status" });
    
    const whatsappStatus = getWhatsAppStatus();
    
    // Determine if startup should be considered successful based on state
    if (!whatsappStatus.isReady && !whatsappStatus.hasClient) {
      // Critical errors prevent successful startup
      const error = new Error(`Critical WhatsApp initialization failed: State ${whatsappStatus.state}`);
      handleStep('ERROR_CHECK', 'fail', { 
        error, 
        shouldRestart: false, 
        details: { 
          lifecycle_state: whatsappStatus.state,
          error_type: 'critical',
          can_proceed: false 
        }
      });
      throw error;
    } else if (whatsappStatus.hasClient && !whatsappStatus.isReady) {
      // Recoverable errors - log warning but allow startup to continue
      botLogger.warn(`⚠️ WhatsApp started with recoverable error: State ${whatsappStatus.state}`);
      handleStep('ERROR_CHECK', 'complete', { 
        message: `WhatsApp started with recoverable error: ${whatsappStatus.state}`, 
        details: { 
          lifecycle_state: whatsappStatus.state,
          error_type: 'recoverable',
          can_proceed: true 
        }
      });
    } else if (whatsappStatus.isReady) {
      // Fully operational
      handleStep('ERROR_CHECK', 'complete', { message: "WhatsApp initialization completed successfully" });
    } else {
      // WhatsApp is in progress, not yet ready
      handleStep('ERROR_CHECK', 'complete', { message: "WhatsApp initialization in progress, no critical errors detected" });
    }

    // Step 5: Setup and start API server
    handleStep('API_SETUP', 'progress', { message: "Setting up API server" });
    
    // Setup Express API
    await setupExpressAPI(config);
    
    // Start API server with retry logic
    await startAPIServer(config);
    
    // Log API endpoints
    botLogger.info(`📊 Status: http://localhost:${config.BOT_PORT}/status`, "🌐");
    botLogger.info(`📱 QR Code: http://localhost:${config.BOT_PORT}/qr-code`, "🌐");
    botLogger.info(`💚 Health: http://localhost:${config.BOT_PORT}/health`, "🌐");
    
    handleStep('API_SETUP', 'complete', { message: `API server running on port ${config.BOT_PORT}` });

    // Step 6: Setup shutdown handlers
    handleStep('SHUTDOWN_HANDLERS', 'progress', { message: "Setting up shutdown handlers" });
    
    // Setup shutdown handlers
    const handleShutdown = async (signal: string) => {
      await gracefulShutdown(signal);
      throw new Error(`Graceful shutdown completed via ${signal}`);
    };

    process.on("SIGINT", () => handleShutdown("SIGINT"));
    process.on("SIGTERM", () => handleShutdown("SIGTERM"));
    
    handleStep('SHUTDOWN_HANDLERS', 'complete', { message: "Shutdown handlers configured" });
    markStartupComplete();
    
    // Final startup validation and status reporting
    const finalWhatsAppStatus = getWhatsAppStatus();
    
    if (finalWhatsAppStatus.isReady) {
      botLogger.success("🎉 Bot startup completed successfully! All systems operational.");
      cleanupQRCode(); // Clean QR code after successful connection
      markStartupComplete();
    } else {
      botLogger.warn(`⚠️ Bot startup completed but WhatsApp not ready. Current state: ${finalWhatsAppStatus.state}`);
      botLogger.info("💡 Bot will attempt to recover when possible. Some features may be limited.");
      markStartupComplete();
    }
    
  } catch (error) {
    // Critical failure - ensure PM2 is notified and shutdown gracefully
    botLogger.error(`❌ Critical startup failure: ${error}`);
    
    await gracefulShutdown(undefined, error as Error);
    
    // Alert PM2 about the critical startup failure
    alertPM2Failure(error as Error, 'critical_startup', false, 'startup_failure');
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

// Export utilities for compatibility
export { initializeStartup, getStartupConfig };
