// Simplified WhatsApp Bot Starter - Refactored with unified logging system
import { logger } from './services/LoggerService';
import { ENV_CONFIG as config } from "./config/EnvironmentManager";

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
  getSystemInfo
} from "./utils/browserUtils";

async function startBot(): Promise<void> {
  try {
    // Step 1: Startup validation (Environment, Chrome, Directories) - CONSOLIDATED
    logger.startupHeader("🔍 STARTUP VALIDATION");
    
    // Single comprehensive startup validation (includes Chrome, directories, env vars)
    const startupSuccess = await initializeStartup();
    if (!startupSuccess) {
      const error = new Error("Startup validation failed - check Chrome installation and environment variables");
      logger.error(error, { component: 'startup', critical: true });
      throw error;
    }

    logger.log('info', "✅ Validación de entorno completada exitosamente", { component: 'startup' });

    const config = getStartupConfig();
    
    // Step 2: Initialize WhatsApp client (includes QR code management)
    logger.log('info', "Inicializando cliente WhatsApp y sistema QR", { component: 'whatsapp' });
    
    // Show system information
    getSystemInfo();
    
    // Initialize WhatsApp client with QR callback (QR is now handled internally)
    await initializeWhatsAppClient(config);
    
    logger.log('info', "✅ Cliente WhatsApp inicializado exitosamente", { component: 'whatsapp' });
    
    // Step 3: Check for critical initialization errors
    logger.log('info', "Validando estado de inicialización de WhatsApp", { component: 'validation' });
    
    const whatsappStatus = getWhatsAppStatus();
    
    // Determine if startup should be considered successful based on state
    if (!whatsappStatus.isReady && !whatsappStatus.hasClient) {
      // Critical errors prevent successful startup
      const error = new Error(`Critical WhatsApp initialization failed: State ${whatsappStatus.state}`);
      logger.error(error, { 
        component: 'whatsapp', 
        context: 'initialization',
        state: whatsappStatus.state,
        critical: true 
      });
      throw error;
    } else if (whatsappStatus.hasClient && !whatsappStatus.isReady) {
      // Recoverable errors - log warning but allow startup to continue
      logger.log('warn', `WhatsApp iniciado con error recuperable: ${whatsappStatus.state}`, {
        component: 'whatsapp',
        lifecycle_state: whatsappStatus.state,
        error_type: 'recoverable',
        can_proceed: true 
      });
    } else if (whatsappStatus.isReady) {
      // Fully operational
      logger.log('info', "✅ Inicialización de WhatsApp completada exitosamente", { component: 'whatsapp' });
    } else {
      // WhatsApp is in progress, not yet ready
      logger.log('info', "Inicialización de WhatsApp en progreso, sin errores críticos detectados", { component: 'whatsapp' });
    }

    // Step 4: Setup and start API server
    logger.log('info', "Configurando servidor API", { component: 'api' });
    
    // Setup Express API
    await setupExpressAPI(config);
    
    // Start API server with retry logic
    await startAPIServer(config);
    
    logger.log('info', `✅ Servidor API ejecutándose en puerto ${config.BOT_PORT}`, { 
      component: 'api', 
      port: config.BOT_PORT,
      endpoints: {
        status: `http://localhost:${config.BOT_PORT}/status`,
        health: `http://localhost:${config.BOT_PORT}/health`
      }
    });

    // Step 5: Setup shutdown handlers
    logger.log('info', "Configurando manejadores de shutdown", { component: 'system' });
    
    // Setup shutdown handlers using utility function
    setupShutdownHandlers(async (signal: string) => {
      await performGracefulShutdown(signal);
    });
    
    logger.log('info', "✅ Manejadores de shutdown configurados", { component: 'system' });
    
    // Final startup validation and status reporting
    const finalWhatsAppStatus = getWhatsAppStatus();
    
    if (finalWhatsAppStatus.isReady) {
      logger.success("🎉 Bot startup completed successfully! All systems operational.");
      cleanupQRCodeAfterConnection(); // Clean QR code after successful connection
    } else {
      logger.warn(`⚠️ Bot startup completed but WhatsApp not ready. Current state: ${finalWhatsAppStatus.state}`);
      logger.info("💡 Bot will attempt to recover when possible. Some features may be limited.");
    }
    
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

// Export utilities for compatibility
export { initializeStartup, getStartupConfig };
