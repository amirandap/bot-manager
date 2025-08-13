// Simplified WhatsApp Bot Starter - Refactored with Utility Functions
import { 
  alertPM2Failure, 
  markStartupComplete,
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
  getWhatsAppStatus,
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
  getSystemInfo,
  validateEnvironmentForBrowser
} from "./utils/browserUtils";

// Import unified logger
import { botLogger } from "./utils/loggerWrapper";

async function startBot(): Promise<void> {
  try {
    // Step 1: Startup validation (Environment, Chrome, Directories) - CONSOLIDATED
    botLogger.startupHeader("🔍 STARTUP VALIDATION");
    handleStep('VALIDATION', 'progress', { message: "Validating environment and dependencies" });
    
    // Single comprehensive startup validation (includes Chrome, directories, env vars)
    const startupSuccess = await initializeStartup();
    if (!startupSuccess) {
      const error = new Error("Startup validation failed - check Chrome installation and environment variables");
      handleStep('VALIDATION', 'fail', { error, shouldRestart: false });
      throw error;
    }

    handleStep('VALIDATION', 'complete', { message: "Environment validation completed successfully" });

    const config = getStartupConfig();
    
    // Step 2: Initialize WhatsApp client (includes QR code management)
    handleStep('WHATSAPP_CLIENT', 'progress', { message: "Initializing WhatsApp client and QR system" });
    
    // Show system information
    getSystemInfo();
    
    // Environment validation for browser (non-Chrome specific checks)
    await validateEnvironmentForBrowser();
    
    // Initialize WhatsApp client with QR callback (QR is now handled internally)
    await initializeWhatsAppClient(config);
    
    handleStep('WHATSAPP_CLIENT', 'complete', { message: "WhatsApp client initialized successfully" });
    
    // Step 3: Check for critical initialization errors
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

    // Step 4: Setup and start API server
    handleStep('API_SETUP', 'progress', { message: "Setting up API server" });
    
    // Setup Express API
    await setupExpressAPI(config);
    
    // Start API server with retry logic
    await startAPIServer(config);
    
    // Log API endpoints
    botLogger.info(`📊 Status: http://localhost:${config.BOT_PORT}/status`, "🌐");
    botLogger.info(` Health: http://localhost:${config.BOT_PORT}/health`, "🌐");
    
    handleStep('API_SETUP', 'complete', { message: `API server running on port ${config.BOT_PORT}` });

    // Step 5: Setup shutdown handlers
    handleStep('SHUTDOWN_HANDLERS', 'progress', { message: "Setting up shutdown handlers" });
    
    // Setup shutdown handlers using utility function
    setupShutdownHandlers(async (signal: string) => {
      await performGracefulShutdown(signal);
    });
    
    handleStep('SHUTDOWN_HANDLERS', 'complete', { message: "Shutdown handlers configured" });
    markStartupComplete();
    
    // Final startup validation and status reporting
    const finalWhatsAppStatus = getWhatsAppStatus();
    
    if (finalWhatsAppStatus.isReady) {
      botLogger.success("🎉 Bot startup completed successfully! All systems operational.");
      cleanupQRCodeAfterConnection(); // Clean QR code after successful connection
      markStartupComplete();
    } else {
      botLogger.warn(`⚠️ Bot startup completed but WhatsApp not ready. Current state: ${finalWhatsAppStatus.state}`);
      botLogger.info("💡 Bot will attempt to recover when possible. Some features may be limited.");
      markStartupComplete();
    }
    
  } catch (error) {
    // Critical failure - ensure PM2 is notified and shutdown gracefully
    botLogger.error(`❌ Critical startup failure: ${error}`);
    
    await performGracefulShutdown(undefined, error as Error);
    
    // Alert PM2 about the critical startup failure
    alertPM2Failure(error as Error, 'critical_startup', false, 'startup_failure');
    throw error;
  }
}

// Start the bot
startBot().catch((error) => {
  botLogger.error("❌ Critical startup failure:", error);
  // eslint-disable-next-line no-process-exit
  process.exit(1);
});

// Export utilities for compatibility
export { initializeStartup, getStartupConfig };
