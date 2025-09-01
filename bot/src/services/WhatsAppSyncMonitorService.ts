/**
 * WhatsApp Sync Monitor Service
 * Advanced monitoring for WhatsApp synchronization process
 * Based on whatsapp-web.js v1.32.0+ internal events
 */

import { Client } from "whatsapp-web.js";
import { logger } from "./LoggerService";

export class WhatsAppSyncMonitorService {
  private client: Client | null = null;
  private syncStartTime: number = 0;
  private lastSyncProgress: number = 0;
  private syncPhase: string = "IDLE";
  private syncTimeoutHandle: NodeJS.Timeout | null = null;
  private isMonitoring: boolean = false;

  /**
   * Initialize sync monitoring for a WhatsApp client
   */
  public initialize(client: Client): void {
    this.client = client;
    this.setupSyncMonitoring();
  }

  /**
   * Setup advanced sync monitoring using WhatsApp Web internal events
   */
  private async setupSyncMonitoring(): Promise<void> {
    if (!this.client) return;

    try {
      logger.info("🔍 Initializing advanced WhatsApp sync monitoring", "🔍");

      // Enhanced state monitoring
      this.client.on("change_state", (state) => {
        this.handleStateChange(state);
      });

      // Enhanced loading monitoring
      this.client.on("loading_screen", (percent, message) => {
        this.handleLoadingProgress(percent, message);
      });

      // Setup internal WhatsApp Web event monitoring
      await this.setupInternalEventMonitoring();

      this.isMonitoring = true;
      logger.info("✅ Advanced sync monitoring activated", "✅");

    } catch (error) {
      logger.error(`❌ Failed to setup sync monitoring: ${error}`, {}, "SYNC_MONITOR_ERROR", 1);
    }
  }

  /**
   * Setup monitoring for internal WhatsApp Web events
   */
  private async setupInternalEventMonitoring(): Promise<void> {
    if (!this.client?.pupPage) return;

    try {
      await this.client.pupPage.evaluate(() => {
        // WhatsApp Web internal objects interface
        interface WhatsAppStore {
          AuthStore?: {
            Cmd?: {
              on: (event: string, callback: () => void) => void;
            };
            OfflineMessageHandler?: {
              getOfflineDeliveryProgress?: () => number;
            };
            AppState?: {
              on: (event: string, callback: () => void) => void;
              hasSynced?: boolean;
              state?: string;
            };
          };
          Conn?: {
            on: (event: string, callback: (data: unknown) => void) => void;
            serialize?: () => Record<string, unknown>;
          };
        }

        const windowWithStore = window as Window & { Store?: WhatsAppStore };

        // Monitor offline message synchronization
        if (windowWithStore.Store?.AuthStore?.Cmd?.on) {
          windowWithStore.Store.AuthStore.Cmd.on('offline_progress_update', () => {
            const progress = windowWithStore.Store?.AuthStore?.OfflineMessageHandler?.getOfflineDeliveryProgress?.();
            if (progress !== undefined) {
              console.log(`[Sync-Monitor] Offline sync progress: ${progress}%`);
            }
          });
        }

        // Monitor sync completion state
        if (windowWithStore.Store?.AuthStore?.AppState?.on) {
          windowWithStore.Store.AuthStore.AppState.on('change:hasSynced', () => {
            const hasSynced = windowWithStore.Store?.AuthStore?.AppState?.hasSynced;
            const appState = windowWithStore.Store?.AuthStore?.AppState?.state;
            console.log(`[Sync-Monitor] Sync completion: ${hasSynced ? 'COMPLETED' : 'PENDING'}, State: ${appState}`);
          });
        }

        // Monitor connection state changes
        if (windowWithStore.Store?.Conn?.on) {
          windowWithStore.Store.Conn.on('change:state', (state: unknown) => {
            console.log(`[Sync-Monitor] Connection state: ${state}`);
          });

          // Monitor battery state for connection health
          windowWithStore.Store.Conn.on('change:battery', (battery: unknown) => {
            console.log(`[Sync-Monitor] Battery state: ${JSON.stringify(battery)}`);
          });
        }

        return true;
      });

      logger.info("🔍 Internal WhatsApp event monitoring setup complete", "🔍");

    } catch (error) {
      logger.warn(`⚠️ Could not setup internal event monitoring: ${error}`);
    }
  }

  /**
   * Handle WhatsApp state changes with detailed analysis
   */
  private handleStateChange(state: string): void {
    const timestamp = new Date().toISOString();
    
    logger.info(`🔄 [Sync-Monitor] State transition: ${state}`, "🔄", undefined, "SYNC_STATE", state);

    // Analyze state for sync implications
    switch (state) {
      case "OPENING":
        this.syncPhase = "INITIALIZING";
        this.syncStartTime = Date.now();
        this.startSyncTimeout();
        break;

      case "PAIRING":
        this.syncPhase = "AWAITING_QR";
        this.clearSyncTimeout();
        break;

      case "CONNECTED":
        this.syncPhase = "CONNECTED";
        logger.info("🌐 [Sync-Monitor] Connection established", "🌐");
        break;

      case "CONFLICT":
        this.syncPhase = "CONFLICT_RESOLUTION";
        logger.warn("⚠️ [Sync-Monitor] Connection conflict - Attempting takeover", "⚠️");
        break;

      case "TIMEOUT":
        this.syncPhase = "TIMEOUT_ERROR";
        logger.error("⏰ [Sync-Monitor] Connection timeout detected", {}, "TIMEOUT_ERROR", 1);
        this.handleSyncFailure("CONNECTION_TIMEOUT", { state, timestamp });
        break;

      case "DEPRECATED_VERSION":
        this.syncPhase = "VERSION_ERROR";
        logger.error("❌ [Sync-Monitor] WhatsApp Web version deprecated", {}, "VERSION_ERROR", 1);
        this.handleSyncFailure("DEPRECATED_VERSION", { state, timestamp });
        break;

      default:
        this.syncPhase = `UNKNOWN_${state}`;
    }

    // Log sync phase transition
    logger.updateMetric("SYNC_PHASE", this.syncPhase);
  }

  /**
   * Handle loading progress with advanced analysis
   */
  private handleLoadingProgress(percent: string | number, message: string): void {
    const currentProgress = typeof percent === 'string' ? parseInt(percent) : percent;
    const progressDelta = currentProgress - this.lastSyncProgress;

    // Determine sync sub-phase based on progress
    let subPhase = "UNKNOWN";
    if (currentProgress >= 0 && currentProgress < 20) {
      subPhase = "BROWSER_INIT";
    } else if (currentProgress >= 20 && currentProgress < 40) {
      subPhase = "WHATSAPP_LOAD";
    } else if (currentProgress >= 40 && currentProgress < 60) {
      subPhase = "AUTH_PROCESS";
    } else if (currentProgress >= 60 && currentProgress < 80) {
      subPhase = "CHAT_SYNC";
    } else if (currentProgress >= 80 && currentProgress < 95) {
      subPhase = "MESSAGE_SYNC";
    } else if (currentProgress >= 95) {
      subPhase = "FINALIZATION";
    }

    logger.info(`⏳ [Sync-Monitor] Loading: ${currentProgress}% [${subPhase}] - ${message}`, 
      "⏳", undefined, "SYNC_PROGRESS", currentProgress.toString());

    // Detect critical phase (95%+)
    if (currentProgress >= 95) {
      logger.info(`🔄 [Sync-Monitor] CRITICAL PHASE: ${currentProgress}% - WhatsApp finalizing sync`, 
        "🔄", undefined, "SYNC_CRITICAL", "FINALIZING");
    }

    // Detect progress stalls
    if (progressDelta === 0 && this.lastSyncProgress > 0) {
      logger.warn(`⚠️ [Sync-Monitor] Progress stalled at ${currentProgress}% in ${subPhase} phase`);
    } else if (progressDelta > 0) {
      const syncTime = Date.now() - this.syncStartTime;
      logger.info(`📈 [Sync-Monitor] Progress: +${progressDelta}% in ${Math.round(syncTime/1000)}s`);
    }

    this.lastSyncProgress = currentProgress;
    this.syncPhase = subPhase;

    // Update metrics
    logger.updateMetric("SYNC_PROGRESS", currentProgress);
    logger.updateMetric("SYNC_PHASE", subPhase);
  }

  /**
   * Start sync timeout monitoring
   */
  private startSyncTimeout(): void {
    this.clearSyncTimeout();
    
    this.syncTimeoutHandle = setTimeout(() => {
      const syncDuration = Math.round((Date.now() - this.syncStartTime) / 1000);
      this.handleSyncFailure("SYNC_TIMEOUT", {
        duration: syncDuration,
        lastProgress: this.lastSyncProgress,
        phase: this.syncPhase,
        timestamp: new Date().toISOString()
      });
    }, 6 * 60 * 1000); // 6 minutes timeout for complete sync
  }

  /**
   * Clear sync timeout
   */
  private clearSyncTimeout(): void {
    if (this.syncTimeoutHandle) {
      clearTimeout(this.syncTimeoutHandle);
      this.syncTimeoutHandle = null;
    }
  }

  /**
   * Handle sync failure with detailed diagnostics
   */
  private handleSyncFailure(reason: string, details: Record<string, unknown>): void {
    logger.error(`🚨 [Sync-Monitor] SYNC FAILURE: ${reason}`, {
      reason,
      syncPhase: this.syncPhase,
      lastProgress: this.lastSyncProgress,
      syncDuration: Date.now() - this.syncStartTime,
      memoryUsage: process.memoryUsage(),
      ...details
    }, "SYNC_FAILURE", 1);

    // Update failure metrics
    logger.updateMetric("SYNC_FAILURES", 1);
    logger.updateMetric("LAST_FAILURE_REASON", reason);
  }

  /**
   * Get current sync status
   */
  public getSyncStatus(): {
    isMonitoring: boolean;
    syncPhase: string;
    lastProgress: number;
    syncDuration: number;
  } {
    return {
      isMonitoring: this.isMonitoring,
      syncPhase: this.syncPhase,
      lastProgress: this.lastSyncProgress,
      syncDuration: this.syncStartTime > 0 ? Date.now() - this.syncStartTime : 0
    };
  }

  /**
   * Stop sync monitoring
   */
  public stop(): void {
    this.clearSyncTimeout();
    this.isMonitoring = false;
    this.client = null;
    logger.info("🛑 [Sync-Monitor] Monitoring stopped", "🛑");
  }
}

// Export singleton instance
export const whatsAppSyncMonitor = new WhatsAppSyncMonitorService();
