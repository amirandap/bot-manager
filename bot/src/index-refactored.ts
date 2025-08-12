// Simplified WhatsApp Bot Starter - Refactored with Utility Functions
import { 
  alertPM2Failure, 
  notifyPM2Shutdown, 
  updateStartupProgress,
  markStepSuccess,
  markStepFailure,
  markStepInProgress,
  markStartupComplete,
  STARTUP_STEPS,
  getTotalStartupSteps
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

const TOTAL_STEPS = getTotalStartupSteps();

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
  let currentStep = 0;
  
  try {
    // Step 1: Startup validation (Environment, Chrome, Directories)
    currentStep++;
    botLogger.startupHeader("🔍 STARTUP VALIDATION");
    markStepInProgress(STARTUP_STEPS.VALIDATION, "Validating environment and dependencies");
    updateStartupProgress(currentStep - 1, TOTAL_STEPS, STARTUP_STEPS.VALIDATION, 'in_progress');
    
    // Validate using startup utilities instead of StartupManager
    const startupSuccess = await initializeStartup();
    if (!startupSuccess) {
      const error = new Error("Startup validation failed - check Chrome installation and environment variables");
      markStepFailure(STARTUP_STEPS.VALIDATION, error);
      alertPM2Failure(error, 'startup_validation', false, STARTUP_STEPS.VALIDATION);
      throw error;
    }

    // Additional browser validation
    const browserValid = await validateBrowserEnvironment();
    if (!browserValid) {
      const error = new Error("Browser environment validation failed");
      markStepFailure(STARTUP_STEPS.VALIDATION, error);
      alertPM2Failure(error, 'browser_validation', false, STARTUP_STEPS.VALIDATION);
      throw error;
    }

    markStepSuccess(STARTUP_STEPS.VALIDATION, "Environment validation completed successfully");
    updateStartupProgress(currentStep, TOTAL_STEPS, STARTUP_STEPS.VALIDATION, 'success');

    const config = getStartupConfig();
    
    // Step 2: Initialize QR code system
    currentStep++;
    markStepInProgress(STARTUP_STEPS.LIFECYCLE_INIT, "Initializing QR code system");
    updateStartupProgress(currentStep - 1, TOTAL_STEPS, STARTUP_STEPS.LIFECYCLE_INIT, 'in_progress');
    
    initializeQRCode(config.BOT_ID, config.BOT_PORT);
    
    markStepSuccess(STARTUP_STEPS.LIFECYCLE_INIT, "QR code system initialized successfully");
    updateStartupProgress(currentStep, TOTAL_STEPS, STARTUP_STEPS.LIFECYCLE_INIT, 'success');

    // Step 3: Initialize WhatsApp client
    currentStep++;
    markStepInProgress(STARTUP_STEPS.WHATSAPP_CLIENT, "Initializing WhatsApp client");
    updateStartupProgress(currentStep - 1, TOTAL_STEPS, STARTUP_STEPS.WHATSAPP_CLIENT, 'in_progress');
    
    // Show system information
    getSystemInfo();
    
    // Validate environment for browser
    await validateEnvironmentForBrowser();
    
    // Initialize WhatsApp client with QR callback
    await initializeWhatsAppClient(config, async (qr: string) => {
      await handleQRGenerated(qr, config.BOT_PORT);
    });
    
    markStepSuccess(STARTUP_STEPS.WHATSAPP_CLIENT, "WhatsApp client initialized successfully");
    updateStartupProgress(currentStep, TOTAL_STEPS, STARTUP_STEPS.WHATSAPP_CLIENT, 'success');
    
    // Step 4: Check for critical initialization errors
    currentStep++;
    markStepInProgress(STARTUP_STEPS.ERROR_CHECK, "Validating WhatsApp initialization status");
    updateStartupProgress(currentStep - 1, TOTAL_STEPS, STARTUP_STEPS.ERROR_CHECK, 'in_progress');
    
    const whatsappStatus = getWhatsAppStatus();
    
    // Determine if startup should be considered successful based on state
    if (!whatsappStatus.isReady && !whatsappStatus.hasClient) {
      // Critical errors prevent successful startup
      const error = new Error(`Critical WhatsApp initialization failed: State ${whatsappStatus.state}`);
      markStepFailure(STARTUP_STEPS.ERROR_CHECK, error, { 
        lifecycle_state: whatsappStatus.state,
        error_type: 'critical',
        can_proceed: false 
      });
      alertPM2Failure(error, 'whatsapp_initialization', false, STARTUP_STEPS.ERROR_CHECK);
      throw error;
    } else if (whatsappStatus.hasClient && !whatsappStatus.isReady) {
      // Recoverable errors - log warning but allow startup to continue
      botLogger.warn(`⚠️ WhatsApp started with recoverable error: State ${whatsappStatus.state}`);
      markStepSuccess(STARTUP_STEPS.ERROR_CHECK, `WhatsApp started with recoverable error: ${whatsappStatus.state}`, { 
        lifecycle_state: whatsappStatus.state,
        error_type: 'recoverable',
        can_proceed: true 
      });
    } else if (whatsappStatus.isReady) {
      // Fully operational
      markStepSuccess(STARTUP_STEPS.ERROR_CHECK, "WhatsApp initialization completed successfully");
    } else {
      // WhatsApp is in progress, not yet ready
      markStepSuccess(STARTUP_STEPS.ERROR_CHECK, "WhatsApp initialization in progress, no critical errors detected");
    }
    updateStartupProgress(currentStep, TOTAL_STEPS, STARTUP_STEPS.ERROR_CHECK, 'success');

    // Step 5: Setup and start API server
    currentStep++;
    markStepInProgress(STARTUP_STEPS.API_SETUP, "Setting up API server");
    updateStartupProgress(currentStep - 1, TOTAL_STEPS, STARTUP_STEPS.API_SETUP, 'in_progress');
    
    // Setup Express API
    await setupExpressAPI(config);
    
    // Start API server with retry logic
    await startAPIServer(config, botLogger);
    
    // Log API endpoints
    botLogger.info(`📊 Status: http://localhost:${config.BOT_PORT}/status`, "🌐");
    botLogger.info(`📱 QR Code: http://localhost:${config.BOT_PORT}/qr-code`, "🌐");
    botLogger.info(`💚 Health: http://localhost:${config.BOT_PORT}/health`, "🌐");
    
    markStepSuccess(STARTUP_STEPS.API_SETUP, `API server running on port ${config.BOT_PORT}`);
    updateStartupProgress(currentStep, TOTAL_STEPS, STARTUP_STEPS.API_SETUP, 'success');

    // Step 6: Setup shutdown handlers
    currentStep++;
    markStepInProgress(STARTUP_STEPS.SHUTDOWN_HANDLERS, "Setting up shutdown handlers");
    updateStartupProgress(currentStep - 1, TOTAL_STEPS, STARTUP_STEPS.SHUTDOWN_HANDLERS, 'in_progress');
    
    // Setup shutdown handlers
    const handleShutdown = async (signal: string) => {
      await gracefulShutdown(signal);
      throw new Error(`Graceful shutdown completed via ${signal}`);
    };

    process.on("SIGINT", () => handleShutdown("SIGINT"));
    process.on("SIGTERM", () => handleShutdown("SIGTERM"));
    
    markStepSuccess(STARTUP_STEPS.SHUTDOWN_HANDLERS, "Shutdown handlers configured");
    updateStartupProgress(currentStep, TOTAL_STEPS, STARTUP_STEPS.SHUTDOWN_HANDLERS, 'success');
    markStartupComplete();
    
    // Final startup validation and status reporting
    const finalWhatsAppStatus = getWhatsAppStatus();
    const overallSuccess = finalWhatsAppStatus.canProceedWithStartup;
    
    if (finalWhatsAppStatus.isCriticalError) {
      logger.error(`❌ Bot startup completed with critical errors: ${finalWhatsAppStatus.statusMessage}`);
      logger.error("💡 Bot cannot operate normally. Manual intervention required.");
    } else if (finalWhatsAppStatus.isRecoverableError) {
      logger.warn(`⚠️ Bot startup completed with recoverable errors: ${finalWhatsAppStatus.statusMessage}`);
      logger.info("💡 Bot will attempt to recover when possible. Some features may be limited.");
      markStartupComplete();
    } else if (finalWhatsAppStatus.isReady) {
      logger.success("🎉 Bot startup completed successfully! All systems operational.");
      cleanupQRCode(logger); // Clean QR code after successful connection
      markStartupComplete();
    } else {
      logger.info("🔄 Bot startup infrastructure completed. WhatsApp connection in progress.");
      logger.info("💡 Bot will be fully operational once WhatsApp connection is established.");
      markStartupComplete();
    }
    
    // Log final status details
    logger.info(`📊 Final Status: ${finalWhatsAppStatus.statusMessage}`);
    logger.info(`🤖 Bot State: ${finalWhatsAppStatus.state}`);
    logger.info(`🚀 Startup Success: ${overallSuccess ? 'YES' : 'NO'}`);
    
  } catch (error) {
    // Critical failure - ensure PM2 is notified and shutdown gracefully
    logger.error(`❌ Critical startup failure: ${error}`);
    
    await gracefulShutdown(undefined, error as Error);
    
    // Determine which step failed for better error context
    const failedStep = currentStep <= TOTAL_STEPS ? Object.values(STARTUP_STEPS)[currentStep - 1] : 'unknown_step';
    alertPM2Failure(error as Error, 'critical_startup', false, failedStep);
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
