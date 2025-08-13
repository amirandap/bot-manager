// Simplified WhatsApp Bot Starter - Refactored with unified logging system
import { 
  alertPM2Failure,
  logPM2Event
} from "./utils/pm2Utils_unified";

// Nuevo sistema unificado de logging y métricas
import {
  logEvent,
  reportFailure,
  markComponentReady,
  getAllComponentsStatus
} from "./utils/unifiedLogger";

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

// Import unified logger
import { botLogger } from "./utils/loggerWrapper";

async function startBot(): Promise<void> {
  try {
    // Step 1: Startup validation (Environment, Chrome, Directories) - CONSOLIDATED
    botLogger.startupHeader("🔍 STARTUP VALIDATION");
    logEvent('startup', 'info', "Iniciando validación de entorno y dependencias");
    
    // Single comprehensive startup validation (includes Chrome, directories, env vars)
    const startupSuccess = await initializeStartup();
    if (!startupSuccess) {
      const error = new Error("Startup validation failed - check Chrome installation and environment variables");
      logEvent('startup', 'error', "Falló la validación de startup - verificar instalación de Chrome y variables de entorno");
      reportFailure(error, 'startup', true);
      throw error;
    }

    markComponentReady('startup', "Validación de entorno completada exitosamente");

    const config = getStartupConfig();
    
    // Step 2: Initialize WhatsApp client (includes QR code management)
    logPM2Event('whatsapp', 'info', "Inicializando cliente WhatsApp y sistema QR");
    
    // Show system information
    getSystemInfo();
    
    // Initialize WhatsApp client with QR callback (QR is now handled internally)
    await initializeWhatsAppClient(config);
    
    logPM2Event('whatsapp', 'success', "Cliente WhatsApp inicializado exitosamente");
    
    // Step 3: Check for critical initialization errors
    logPM2Event('validation', 'info', "Validando estado de inicialización de WhatsApp");
    
    const whatsappStatus = getWhatsAppStatus();
    
    // Determine if startup should be considered successful based on state
    if (!whatsappStatus.isReady && !whatsappStatus.hasClient) {
      // Critical errors prevent successful startup
      const error = new Error(`Critical WhatsApp initialization failed: State ${whatsappStatus.state}`);
      logPM2Event('whatsapp', 'error', `Falló inicialización crítica de WhatsApp: Estado ${whatsappStatus.state}`, {
        lifecycle_state: whatsappStatus.state,
        error_type: 'critical',
        can_proceed: false 
      });
      alertPM2Failure(error, 'whatsapp_critical', false);
      throw error;
    } else if (whatsappStatus.hasClient && !whatsappStatus.isReady) {
      // Recoverable errors - log warning but allow startup to continue
      botLogger.warn(`⚠️ WhatsApp started with recoverable error: State ${whatsappStatus.state}`);
      logPM2Event('whatsapp', 'warning', `WhatsApp iniciado con error recuperable: ${whatsappStatus.state}`, {
        lifecycle_state: whatsappStatus.state,
        error_type: 'recoverable',
        can_proceed: true 
      });
    } else if (whatsappStatus.isReady) {
      // Fully operational
      logPM2Event('whatsapp', 'success', "Inicialización de WhatsApp completada exitosamente");
    } else {
      // WhatsApp is in progress, not yet ready
      logPM2Event('whatsapp', 'info', "Inicialización de WhatsApp en progreso, sin errores críticos detectados");
    }

    // Step 4: Setup and start API server
    logPM2Event('api', 'info', "Configurando servidor API");
    
    // Setup Express API
    await setupExpressAPI(config);
    
    // Start API server with retry logic
    await startAPIServer(config);
    
    // Log API endpoints
    botLogger.info(`📊 Status: http://localhost:${config.BOT_PORT}/status`, "🌐");
    botLogger.info(`💚 Health: http://localhost:${config.BOT_PORT}/health`, "🌐");
    
    logPM2Event('api', 'success', `Servidor API ejecutándose en puerto ${config.BOT_PORT}`);

    // Step 5: Setup shutdown handlers
    logPM2Event('system', 'info', "Configurando manejadores de shutdown");
    
    // Setup shutdown handlers using utility function
    setupShutdownHandlers(async (signal: string) => {
      await performGracefulShutdown(signal);
    });
    
    logPM2Event('system', 'success', "Manejadores de shutdown configurados");
    logPM2Event('startup', 'success', "Startup del bot completado exitosamente");
    
    // Final startup validation and status reporting
    const finalWhatsAppStatus = getWhatsAppStatus();
    
    if (finalWhatsAppStatus.isReady) {
      botLogger.success("🎉 Bot startup completed successfully! All systems operational.");
      cleanupQRCodeAfterConnection(); // Clean QR code after successful connection
      logPM2Event('system', 'success', "Todos los sistemas operacionales - Bot listo");
    } else {
      botLogger.warn(`⚠️ Bot startup completed but WhatsApp not ready. Current state: ${finalWhatsAppStatus.state}`);
      botLogger.info("💡 Bot will attempt to recover when possible. Some features may be limited.");
      logPM2Event('system', 'warning', `Bot completado pero WhatsApp no listo. Estado: ${finalWhatsAppStatus.state}`);
    }
    
  } catch (error) {
    // Critical failure - ensure PM2 is notified and shutdown gracefully
    botLogger.error(`Critical startup failure: ${error}`);
    logPM2Event('startup', 'error', `Fallo crítico en startup: ${(error as Error).message}`);
    
    await performGracefulShutdown(undefined, error as Error);
    
    // Alert PM2 about the critical startup failure
    alertPM2Failure(error as Error, 'critical_startup', false);
    throw error;
  }
}

// Start the bot
startBot().catch(() => {
  // eslint-disable-next-line no-process-exit
  process.exit(1);
});

// Export utilities for compatibility
export { initializeStartup, getStartupConfig };
