/**
 * Shutdown Utilities
 * Pure functions for graceful application shutdown
 * Following modular architecture - utils should be pure functions
 */

import { 
  shutdownWhatsAppClient,
  cleanupQRCodeAfterConnection
} from "./whatsAppUtils";
import { shutdownAPIServer } from "./apiUtils";
import { notifyPM2Shutdown, alertPM2Failure } from "./pm2Utils";
import { botLogger } from "./loggerWrapper";

// Global state flag - ideally this should be managed by a ShutdownService
let isShuttingDown = false;

/**
 * Get shutdown status
 */
export function getShutdownStatus(): boolean {
  return isShuttingDown;
}

/**
 * Set shutdown status
 */
export function setShutdownStatus(status: boolean): void {
  isShuttingDown = status;
}

/**
 * Graceful shutdown utility
 * Orchestrates the shutdown process of all system components
 */
export async function gracefulShutdown(
  signal?: string, 
  error?: Error
): Promise<void> {
  if (isShuttingDown) {
    botLogger.warn("Shutdown already in progress");
    return;
  }

  setShutdownStatus(true);

  try {
    botLogger.info(`🛑 Initiating graceful shutdown${signal ? ` (${signal})` : ''}...`);
    
    // Shutdown API server
    await shutdownAPIServer();
    
    // Shutdown WhatsApp client
    await shutdownWhatsAppClient();
    
    // Clean up QR code
    cleanupQRCodeAfterConnection();
    
    // Notify PM2 about shutdown
    notifyPM2Shutdown(signal, error, error ? 'error_triggered' : 'manual');
    
    botLogger.success("✅ Graceful shutdown completed");
  } catch (shutdownError) {
    botLogger.error(`❌ Error during shutdown: ${shutdownError}`);
    alertPM2Failure(shutdownError as Error, 'shutdown');
  }
}

/**
 * Setup shutdown handlers for common process signals
 */
export function setupShutdownHandlers(
  shutdownCallback: (signal: string) => Promise<void>
): void {
  const handleShutdown = async (signal: string) => {
    await shutdownCallback(signal);
    throw new Error(`Graceful shutdown completed via ${signal}`);
  };

  process.on("SIGINT", () => handleShutdown("SIGINT"));
  process.on("SIGTERM", () => handleShutdown("SIGTERM"));
  
  botLogger.info("Shutdown handlers configured for SIGINT and SIGTERM");
}
