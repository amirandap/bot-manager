// Simplified WhatsApp Bot Starter - Focus on initialization and error handling
import { StartupManager } from "./services/StartupManager";
import { BotOrchestrator } from "./services/BotOrchestrator";
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

// Initialize startup manager
const startupManager = new StartupManager();
const logger = startupManager.getLogger();
const TOTAL_STEPS = getTotalStartupSteps();

/**
 * Graceful shutdown with PM2 notification
 */
async function gracefulShutdown(botOrchestrator: BotOrchestrator, signal?: string, error?: Error): Promise<void> {
  try {
    logger.info(`🛑 Initiating graceful shutdown${signal ? ` (${signal})` : ''}...`);
    
    // Shutdown bot orchestrator
    await botOrchestrator.shutdown();
    
    // Notify PM2 about shutdown
    notifyPM2Shutdown(signal, error, error ? 'error_triggered' : 'manual');
    
    logger.success("✅ Graceful shutdown completed");
  } catch (shutdownError) {
    logger.error(`❌ Error during shutdown: ${shutdownError}`);
    alertPM2Failure(shutdownError as Error, 'shutdown');
  }
}

async function startBot(): Promise<void> {
  let botOrchestrator: BotOrchestrator | null = null;
  let currentStep = 0;
  
  try {
    // Step 1: Startup validation
    currentStep++;
    logger.startupHeader("🔍 STARTUP VALIDATION");
    markStepInProgress(STARTUP_STEPS.VALIDATION, "Validating environment and dependencies");
    updateStartupProgress(currentStep - 1, TOTAL_STEPS, STARTUP_STEPS.VALIDATION, 'in_progress');
    
    const startupSuccess = await startupManager.initialize();

    if (!startupSuccess) {
      const error = new Error("Startup validation failed - check Chrome installation and environment variables");
      markStepFailure(STARTUP_STEPS.VALIDATION, error);
      alertPM2Failure(error, 'startup_validation', false, STARTUP_STEPS.VALIDATION);
      throw error;
    }

    markStepSuccess(STARTUP_STEPS.VALIDATION, "Environment validation completed successfully");
    updateStartupProgress(currentStep, TOTAL_STEPS, STARTUP_STEPS.VALIDATION, 'success');

    const config = startupManager.getConfig();
    
    // Step 2: Initialize bot orchestrator
    currentStep++;
    logger.startupHeader("🤖 BOT ORCHESTRATOR INITIALIZATION");
    markStepInProgress(STARTUP_STEPS.LIFECYCLE_INIT, "Creating BotOrchestrator instance");
    updateStartupProgress(currentStep - 1, TOTAL_STEPS, STARTUP_STEPS.LIFECYCLE_INIT, 'in_progress');
    
    botOrchestrator = new BotOrchestrator(config, logger);
    
    markStepSuccess(STARTUP_STEPS.LIFECYCLE_INIT, "Bot orchestrator created successfully");
    updateStartupProgress(currentStep, TOTAL_STEPS, STARTUP_STEPS.LIFECYCLE_INIT, 'success');

    // Step 3: Initialize complete bot system (WhatsApp client, API server, etc.)
    currentStep++;
    markStepInProgress(STARTUP_STEPS.WHATSAPP_CLIENT, "Initializing complete bot system");
    updateStartupProgress(currentStep - 1, TOTAL_STEPS, STARTUP_STEPS.WHATSAPP_CLIENT, 'in_progress');
    
    await botOrchestrator.initialize();
    
    markStepSuccess(STARTUP_STEPS.WHATSAPP_CLIENT, "Bot system initialized successfully");
    updateStartupProgress(currentStep, TOTAL_STEPS, STARTUP_STEPS.WHATSAPP_CLIENT, 'success');
    
    // Step 4: Check for critical initialization errors
    currentStep++;
    markStepInProgress(STARTUP_STEPS.ERROR_CHECK, "Checking for initialization errors");
    updateStartupProgress(currentStep - 1, TOTAL_STEPS, STARTUP_STEPS.ERROR_CHECK, 'in_progress');
    
    const status = botOrchestrator.getStatus();
    if (status.lifecycleState.toString().startsWith('ERROR_')) {
      const error = new Error(`Bot initialization failed: ${status.stateDescription}`);
      markStepFailure(STARTUP_STEPS.ERROR_CHECK, error, { lifecycle_state: status.lifecycleState });
      alertPM2Failure(error, 'whatsapp_initialization', false, STARTUP_STEPS.ERROR_CHECK);
      throw error;
    }

    markStepSuccess(STARTUP_STEPS.ERROR_CHECK, "No critical initialization errors detected");
    updateStartupProgress(currentStep, TOTAL_STEPS, STARTUP_STEPS.ERROR_CHECK, 'success');

    // Step 5: API server is already running (started by BotOrchestrator)
    currentStep++;
    logger.startupHeader("🌐 API SERVER STATUS");
    markStepInProgress(STARTUP_STEPS.API_SETUP, "Verifying API server status");
    updateStartupProgress(currentStep - 1, TOTAL_STEPS, STARTUP_STEPS.API_SETUP, 'in_progress');
    
    // API server was started by the BotOrchestrator during initialize()
    logger.info(`📊 Status: http://localhost:${config.BOT_PORT}/status`, "🌐");
    logger.info(`📱 QR Code: http://localhost:${config.BOT_PORT}/qr-code`, "🌐");
    logger.info(`💚 Health: http://localhost:${config.BOT_PORT}/health`, "🌐");

    markStepSuccess(STARTUP_STEPS.API_SETUP, `API server verified on port ${config.BOT_PORT}`);
    updateStartupProgress(currentStep, TOTAL_STEPS, STARTUP_STEPS.API_SETUP, 'success');

    // Step 6: Setup graceful shutdown handlers
    currentStep++;
    markStepInProgress(STARTUP_STEPS.SHUTDOWN_HANDLERS, "Setting up graceful shutdown handlers");
    updateStartupProgress(currentStep - 1, TOTAL_STEPS, STARTUP_STEPS.SHUTDOWN_HANDLERS, 'in_progress');
    
    const handleShutdown = async (signal: string) => {
      await gracefulShutdown(botOrchestrator!, signal);
      throw new Error(`Graceful shutdown completed via ${signal}`);
    };

    process.on("SIGINT", () => handleShutdown("SIGINT"));
    process.on("SIGTERM", () => handleShutdown("SIGTERM"));
    
    markStepSuccess(STARTUP_STEPS.SHUTDOWN_HANDLERS, "Graceful shutdown handlers configured");
    updateStartupProgress(currentStep, TOTAL_STEPS, STARTUP_STEPS.SHUTDOWN_HANDLERS, 'success');
    
    // Step 7: Startup complete
    currentStep++;
    logger.success("🎉 Bot startup completed successfully!");
    markStartupComplete();
    
  } catch (error) {
    // Critical failure - ensure PM2 is notified and shutdown gracefully
    logger.error(`❌ Critical startup failure: ${error}`);
    
    if (botOrchestrator) {
      await gracefulShutdown(botOrchestrator, undefined, error as Error);
    }
    
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

// Export for compatibility
export { startupManager };
