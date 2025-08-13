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
import { notifyPM2Shutdown, alertPM2Failure, logPM2Event, setShutdownContext } from "./pm2Utils_unified";

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
 * OPTIMIZED - PM2 context-aware logging to minimize shutdown logs
 */
export async function gracefulShutdown(
  signal?: string, 
  error?: Error
): Promise<void> {
  if (isShuttingDown) {
    logPM2Event('shutdown', 'info', 'Shutdown ya en progreso', { signal });
    return;
  }

  setShutdownStatus(true);
  
  // Set shutdown context in PM2 for intelligent logging
  setShutdownContext(true);

  try {
    logPM2Event('shutdown', 'info', `Iniciando shutdown graceful${signal ? ` (${signal})` : ''}...`, { signal });
    
    // Shutdown API server (silent)
    await shutdownAPIServer();
    
    // Shutdown WhatsApp client (now context-aware)
    await shutdownWhatsAppClient();
    
    // Clean up QR code only if it makes sense (not during early startup failures)
    if (!error || signal) {
      // Normal shutdown or signal-based shutdown - safe to cleanup QR
      cleanupQRCodeAfterConnection();
    }
    
    // Notify PM2 about shutdown
    notifyPM2Shutdown(signal, error, error ? 'error_triggered' : 'manual');
    
    logPM2Event('shutdown', 'success', 'Shutdown graceful completado', { signal });
  } catch (shutdownError) {
    logPM2Event('shutdown', 'error', `Error durante shutdown: ${shutdownError}`, { signal, shutdownError });
    alertPM2Failure(shutdownError as Error, 'shutdown');
  } finally {
    // Reset shutdown context
    setShutdownContext(false);
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
  
  logPM2Event('shutdown', 'info', 'Handlers de shutdown configurados para SIGINT y SIGTERM');
}
