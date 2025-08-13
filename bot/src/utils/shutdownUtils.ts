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
import { logWhatsAppOperation } from "./pm2Utils";

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
    logWhatsAppOperation('shutdown', 'warning', 'Shutdown already in progress', { signal });
    return;
  }

  setShutdownStatus(true);

  try {
    logWhatsAppOperation('shutdown', 'start', `Initiating graceful shutdown${signal ? ` (${signal})` : ''}...`, { signal });
    
    // Shutdown API server
    await shutdownAPIServer();
    
    // Shutdown WhatsApp client
    await shutdownWhatsAppClient();
    
    // Clean up QR code only if it makes sense (not during early startup failures)
    if (!error || signal) {
      // Normal shutdown or signal-based shutdown - safe to cleanup QR
      cleanupQRCodeAfterConnection();
    } else {
      // Error-based shutdown - only cleanup if WhatsApp was actually initialized
      logWhatsAppOperation('shutdown', 'warning', 'Skipping QR cleanup due to early startup failure', { signal, error });
    }
    
    // Notify PM2 about shutdown
    notifyPM2Shutdown(signal, error, error ? 'error_triggered' : 'manual');
    
    logWhatsAppOperation('shutdown', 'success', 'Graceful shutdown completed', { signal });
  } catch (shutdownError) {
    logWhatsAppOperation('shutdown', 'error', `Error during shutdown: ${shutdownError}`, { signal, shutdownError });
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
  
  logWhatsAppOperation('shutdown', 'success', 'Shutdown handlers configured for SIGINT and SIGTERM', {});
}
