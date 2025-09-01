/**
 * Shutdown Utilities
 * Pure functions for graceful application shutdown
 * Following modular architecture - utils should be pure functions
 */

import {
  shutdownWhatsAppClient
} from "./whatsAppUtils";
import { cleanupQRCodeAfterConnection } from "../services/QRCodeService";
import { shutdownAPIServer } from "./apiUtils";
import { logger } from '../services/LoggerService';

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
    logger.log('info', 'Shutdown ya en progreso', { component: 'shutdown', signal });
    return;
  }

  setShutdownStatus(true);
  
  // Set shutdown context in PM2 for intelligent logging
  logger.setShutdownContext(true);

  try {
    logger.log('info', `Iniciando shutdown graceful${signal ? ` (${signal})` : ''}...`, { component: 'shutdown', signal });
    
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
    logger.notifyShutdown(signal, error, error ? 'error_triggered' : 'manual');
    
    logger.log('info', '✅ Shutdown graceful completado', { component: 'shutdown', signal });
  } catch (shutdownError) {
    logger.log('error', `Error durante shutdown: ${shutdownError}`, { component: 'shutdown', signal, shutdownError });
    logger.error(shutdownError as Error, { component: 'shutdown', critical: true });
  } finally {
    // Reset shutdown context
    logger.setShutdownContext(false);
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
  
  logger.log('info', 'Handlers de shutdown configurados para SIGINT y SIGTERM', { component: 'shutdown' });
}
