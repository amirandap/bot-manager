import { client, isClientReady } from "../config/whatsAppClient";
import { botLifecycle, BotLifecycleState } from "./botLifecycleTracker";
import { initializeClient, appendListeners } from "../config/whatsAppClient";

/**
 * Types of health check actions that can be performed
 */
export enum HealthCheckAction {
  NOTHING = "nothing",
  REINITIALIZE = "reinitialize",
  RESTART_BROWSER = "restart_browser",
}

/**
 * Result of a health check with action recommendation
 */
interface HealthCheckResult {
  healthy: boolean;
  action: HealthCheckAction;
  details: string;
  timestamp: string;
}

/**
 * Tracks historical health checks and issues
 */
class ClientHealthMonitor {
  private static readonly MAX_HISTORY_SIZE = 20;
  private healthHistory: HealthCheckResult[] = [];
  private lastRecoveryTimestamp: string | null = null;
  private recoveryAttempts: number = 0;
  private readonly MAX_RECOVERY_ATTEMPTS = 5;
  private readonly RECOVERY_ATTEMPT_RESET_MS = 60 * 60 * 1000; // 1 hour

  /**
   * Performs a health check on the WhatsApp client
   */
  public async performHealthCheck(): Promise<HealthCheckResult> {
    const now = new Date().toISOString();

    // Check if client exists
    if (!client) {
      return this.recordHealthCheck({
        healthy: false,
        action: HealthCheckAction.REINITIALIZE,
        details: "WhatsApp client is null",
        timestamp: now,
      });
    }

    // Check client ready state
    if (!isClientReady) {
      const currentState = botLifecycle.getState();

      // Handle different lifecycle states
      if (currentState === BotLifecycleState.ERROR_BROWSER) {
        return this.recordHealthCheck({
          healthy: false,
          action: HealthCheckAction.RESTART_BROWSER,
          details: "Browser error detected",
          timestamp: now,
        });
      }

      if (currentState === BotLifecycleState.DISCONNECTED) {
        return this.recordHealthCheck({
          healthy: false,
          action: HealthCheckAction.REINITIALIZE,
          details: "Client is disconnected",
          timestamp: now,
        });
      }

      if (currentState === BotLifecycleState.ERROR_CONNECTION) {
        return this.recordHealthCheck({
          healthy: false,
          action: HealthCheckAction.REINITIALIZE,
          details: "Connection error detected",
          timestamp: now,
        });
      }

      // For other states, do nothing yet as they may be transitional
      return this.recordHealthCheck({
        healthy: false,
        action: HealthCheckAction.NOTHING,
        details: `Client not ready, current state: ${currentState}`,
        timestamp: now,
      });
    }

    // Do additional health checks here (e.g., ping test, check if client.info exists)

    // If we got here, the client appears healthy
    return this.recordHealthCheck({
      healthy: true,
      action: HealthCheckAction.NOTHING,
      details: "Client is healthy",
      timestamp: now,
    });
  }

  /**
   * Attempt to fix client issues based on health check results
   */
  public async attemptRecovery(result: HealthCheckResult): Promise<boolean> {
    // Check if we should attempt recovery
    if (result.action === HealthCheckAction.NOTHING || result.healthy) {
      return true;
    }

    // Check if we've tried too many times recently
    if (this.recoveryAttempts >= this.MAX_RECOVERY_ATTEMPTS) {
      console.log(
        `⚠️ Maximum recovery attempts (${this.MAX_RECOVERY_ATTEMPTS}) reached. No further recovery will be attempted until timeout.`
      );
      return false;
    }

    // Reset recovery attempts counter if it's been a while
    if (this.lastRecoveryTimestamp) {
      const lastRecovery = new Date(this.lastRecoveryTimestamp).getTime();
      const now = Date.now();
      if (now - lastRecovery > this.RECOVERY_ATTEMPT_RESET_MS) {
        this.recoveryAttempts = 0;
      }
    }

    // Update recovery tracking
    this.lastRecoveryTimestamp = new Date().toISOString();
    this.recoveryAttempts++;

    // Perform recovery based on recommended action
    switch (result.action) {
      case HealthCheckAction.REINITIALIZE:
        console.log("🔄 Attempting client reinitialization...");
        try {
          if (client) {
            await client.destroy();
          }
          await initializeClient();
          if (client) {
            appendListeners(client);
          }
          return client != null;
        } catch (error) {
          console.error("❌ Failed to reinitialize client:", error);
          return false;
        }

      case HealthCheckAction.RESTART_BROWSER:
        console.log("🔄 Attempting browser restart...");
        try {
          if (client) {
            await client.destroy();
          }
          // Force garbage collection if available (Node with --expose-gc flag)
          if (global.gc) {
            global.gc();
            console.log("🧹 Forced garbage collection before browser restart");
          }

          // Wait briefly to ensure resources are freed
          await new Promise((resolve) => setTimeout(resolve, 2000));

          await initializeClient();
          if (client) {
            appendListeners(client);
          }
          return client != null;
        } catch (error) {
          console.error("❌ Failed to restart browser:", error);
          return false;
        }

      default:
        return false;
    }
  }

  /**
   * Records a health check result and maintains history
   */
  private recordHealthCheck(result: HealthCheckResult): HealthCheckResult {
    this.healthHistory.push(result);

    // Trim history if it gets too long
    if (this.healthHistory.length > ClientHealthMonitor.MAX_HISTORY_SIZE) {
      this.healthHistory = this.healthHistory.slice(
        -ClientHealthMonitor.MAX_HISTORY_SIZE
      );
    }

    return result;
  }

  /**
   * Get recent health check history
   */
  public getHealthHistory(): HealthCheckResult[] {
    return [...this.healthHistory];
  }
}

// Export singleton instance
export const healthMonitor = new ClientHealthMonitor();
