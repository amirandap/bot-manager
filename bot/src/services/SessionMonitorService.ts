/**
 * Session Monitor Service
 * Monitors WhatsApp session health and handles automatic recovery
 */

import { logger } from './LoggerService';
import { getWhatsAppClient, initializeWhatsAppClient, shutdownWhatsAppClient } from '../utils/whatsAppUtils';
import { EnvironmentManager } from '../config/EnvironmentManager';
import { cleanChromeSession } from '../utils/browserUtils';
import { Client } from 'whatsapp-web.js';

export class SessionMonitorService {
  private static instance: SessionMonitorService;
  private monitorInterval: NodeJS.Timeout | null = null;
  private isRecovering = false;
  private recoveryAttempts = 0;
  private maxRecoveryAttempts = 3;
  private monitorIntervalMs = 30000; // 30 seconds
  private lastHealthCheck = Date.now();
  private isShuttingDown = false;

  private constructor() {}

  public static getInstance(): SessionMonitorService {
    if (!SessionMonitorService.instance) {
      SessionMonitorService.instance = new SessionMonitorService();
    }
    return SessionMonitorService.instance;
  }

  /**
   * Start monitoring the WhatsApp session
   */
  public startMonitoring(): void {
    if (this.monitorInterval) {
      logger.info("Session monitor already running");
      return;
    }

    logger.info("🔍 Starting WhatsApp session monitor");
    
    this.monitorInterval = setInterval(async () => {
      if (!this.isShuttingDown) {
        await this.checkSessionHealth();
      }
    }, this.monitorIntervalMs);

    // Initial health check
    setTimeout(() => {
      if (!this.isShuttingDown) {
        this.checkSessionHealth();
      }
    }, 5000);
  }

  /**
   * Stop monitoring
   */
  public stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
      logger.info("🛑 Session monitor stopped");
    }
    this.isShuttingDown = true;
  }

  /**
   * Check the health of the WhatsApp session
   */
  private async checkSessionHealth(): Promise<void> {
    try {
      const client = getWhatsAppClient();
      
      if (!client) {
        logger.info("⚠️ WhatsApp client not found during health check");
        await this.handleSessionFailure("Client not initialized");
        return;
      }

      // Try to get client info to verify session is alive
      try {
        const info = client.info;
        if (!info) {
          throw new Error("Client info not available");
        }

        // Check if client is ready state
        const state = await client.getState();
        if (state !== 'CONNECTED') {
          throw new Error(`Client state is ${state}, expected CONNECTED`);
        }

        // Session is healthy
        this.lastHealthCheck = Date.now();
        this.recoveryAttempts = 0; // Reset recovery attempts on successful check
        
        logger.info("✅ WhatsApp session health check passed", "💚", undefined, "HEALTH_CHECK", "PASSED");
        
      } catch (sessionError) {
        logger.error(`❌ Session health check failed: ${sessionError}`);
        await this.handleSessionFailure(sessionError instanceof Error ? sessionError.message : String(sessionError));
      }

    } catch (error) {
      logger.error(`Error during session health check: ${error}`);
    }
  }

  /**
   * Handle session failure and attempt recovery
   */
  private async handleSessionFailure(reason: string): Promise<void> {
    if (this.isRecovering || this.isShuttingDown) {
      return;
    }

    if (this.recoveryAttempts >= this.maxRecoveryAttempts) {
      logger.error(`❌ Maximum recovery attempts (${this.maxRecoveryAttempts}) exceeded. Manual intervention required.`);
      return;
    }

    this.isRecovering = true;
    this.recoveryAttempts++;

    logger.error(`🚨 WhatsApp session failure detected: ${reason}`);
    logger.info(`🔄 Starting automatic recovery (attempt ${this.recoveryAttempts}/${this.maxRecoveryAttempts})`);

    try {
      await this.performRecovery();
      
      logger.info("✅ Session recovery completed successfully");
      this.isRecovering = false;
      
    } catch (recoveryError) {
      logger.error(`❌ Session recovery failed: ${recoveryError}`);
      this.isRecovering = false;
      
      // Wait before next attempt
      setTimeout(() => {
        if (!this.isShuttingDown) {
          this.handleSessionFailure(`Recovery failed: ${recoveryError}`);
        }
      }, 60000); // Wait 1 minute before retry
    }
  }

  /**
   * Perform the actual recovery process
   */
  private async performRecovery(): Promise<void> {
    const envManager = EnvironmentManager.getInstance();
    const config = envManager.getConfig();

    logger.info("🔄 Step 1: Shutting down current WhatsApp client");
    
    try {
      await shutdownWhatsAppClient();
    } catch (error) {
      logger.info(`Client shutdown error (expected): ${error}`);
    }

    logger.info("🔄 Step 2: Cleaning Chrome session data");
    
    try {
      const sessionPath = config.SESSION_PATH;
      await cleanChromeSession(sessionPath);
    } catch (error) {
      logger.error(`Chrome session cleanup failed: ${error}`);
      // Continue anyway
    }

    logger.info("🔄 Step 3: Waiting before restart");
    await this.sleep(5000); // Wait 5 seconds

    logger.info("🔄 Step 4: Reinitializing WhatsApp client");
    
    const newClient = await initializeWhatsAppClient(config);
    
    if (!newClient) {
      throw new Error("Failed to reinitialize WhatsApp client");
    }

    logger.info("✅ WhatsApp client reinitialized successfully");
  }

  /**
   * Check if session error indicates a recoverable Chrome crash
   */
  public isRecoverableSessionError(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    const recoverablePatterns = [
      'session closed',
      'protocol error',
      'page has been closed',
      'execution context',
      'page crashed',
      'target closed',
      'browser has disconnected'
    ];

    return recoverablePatterns.some(pattern => message.includes(pattern));
  }

  /**
   * Handle a specific session error
   */
  public async handleSessionError(error: Error): Promise<void> {
    if (this.isRecoverableSessionError(error)) {
      logger.info(`🔄 Detected recoverable session error: ${error.message}`);
      await this.handleSessionFailure(error.message);
    } else {
      logger.error(`❌ Non-recoverable session error: ${error.message}`);
    }
  }

  /**
   * Get recovery status
   */
  public getRecoveryStatus(): {
    isRecovering: boolean;
    recoveryAttempts: number;
    maxRecoveryAttempts: number;
    lastHealthCheck: number;
  } {
    return {
      isRecovering: this.isRecovering,
      recoveryAttempts: this.recoveryAttempts,
      maxRecoveryAttempts: this.maxRecoveryAttempts,
      lastHealthCheck: this.lastHealthCheck,
    };
  }

  /**
   * Utility function for sleeping
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Manual recovery trigger (for API endpoints)
   */
  public async triggerManualRecovery(): Promise<void> {
    if (this.isRecovering) {
      throw new Error("Recovery already in progress");
    }

    logger.info("🔄 Manual recovery triggered");
    await this.handleSessionFailure("Manual recovery requested");
  }
}
