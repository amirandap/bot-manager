/**
 * WhatsApp Client Management Utilities
 * CENTRALIZED - Unified utility functions for WhatsApp client lifecycle
 * Now includes internal QR code management
 */

import { Client, LocalAuth } from "whatsapp-web.js";
import * as QRCode from "qrcode";
import * as path from "path";
import { cleanAndFormatPhoneNumber } from "./cleanAndFormatPhoneNumber";
import { logger } from "../services/LoggerService";
import { puppeteerConfig } from "../config/PuppeteerConfig";
import { QR_PATH } from "../config/EnvironmentManager";
import { EnvironmentConfig } from "../types/types";
import { setClient } from "../config/clientExporter";

// State management
let whatsappClient: Client | null = null;

// QR Code state (moved from qrUtils)
let currentQRCode: string | null = null;
let qrCodePath: string | null = null;

/**
 * Initialize QR code system (internal function)
 */
export async function initializeQRCodePath(botId: string): Promise<string> {
  try {
    qrCodePath = path.join(QR_PATH, `qr-code-${botId}.png`);
    logger.info(`QR code path initialized: ${qrCodePath}`, "📂", undefined, "QR_STATUS", "INITIALIZING");
    return qrCodePath;
  } catch (error) {
    logger.error(`Failed to initialize QR code path: ${error}`, {}, "ERRORS", 1);
    throw error;
  }
}

/**
 * Handle QR code generation (internal function)
 */
async function handleQRGenerated(qr: string): Promise<void> {
  if (!qrCodePath) {
    throw new Error("QR code path not initialized");
  }

  try {
    logger.info("Processing QR code generation...", "🔄", undefined, "QR_STATUS", "GENERATING");
    currentQRCode = qr;

    await saveQRCode(qr);

    // Update PM2 with QR code ready status
    logger.info("QR code generated and ready for scanning", "✅", undefined, "QR_STATUS", "SCANME");
    
    // Update QR Codes metric
    logger.updateMetric("QR_CODES", 1);

    logger.info(`QR Code saved to: ${qrCodePath}`, "💾");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error handling QR code: ${errorMessage}`);
    
    // Update errors metric
    logger.updateMetric("ERRORS", 1);
    
    throw new Error(`QR code handling failed: ${errorMessage}`);
  }
}

/**
 * Save QR code to file (internal function)
 */
async function saveQRCode(qr: string): Promise<void> {
  if (!qrCodePath) {
    throw new Error("QR code path not initialized");
  }

  try {
    await QRCode.toFile(qrCodePath, qr);
    logger.info(`QR code saved to: ${qrCodePath}`, "💾", undefined, "QR_STATUS", "SAVED");
  } catch (error) {
    logger.error(`Failed to save QR code: ${error}`, {}, "ERRORS", 1);
    throw error;
  }
}

/**
 * Clean up QR code file (internal function)
 */
function cleanupQRCode(): void {
  if (qrCodePath) {
    try {
      const fs = require("fs");
      if (fs.existsSync(qrCodePath)) {
        fs.unlinkSync(qrCodePath);
        logger.info("QR code file cleaned up", "🧹");
      }
    } catch (error) {
      logger.error(`Failed to cleanup QR code: ${error}`);
    }
  }
  currentQRCode = null;
}

/**
 * Initialize WhatsApp client with proper configuration
 * Now handles QR code management internally and waits for client to be ready
 */
export async function initializeWhatsAppClient(
  config: EnvironmentConfig,
  onQRGenerated?: (qr: string) => Promise<void>
): Promise<Client> {
  if (whatsappClient) {
    logger.info("WhatsApp client already initialized", "ℹ️");
    return whatsappClient;
  }

  try {
    logger.info("WHATSAPP CLIENT INITIALIZATION", "🚀");
    logger.info("WhatsApp state: browser_launching - Starting WhatsApp Web browser", "🤖", undefined, "WHATSAPP_STATUS", "BROWSER_LAUNCHING");
    logger.logLifecycleStep("BROWSER_LAUNCHING");

    // Initialize QR code path internally
    initializeQRCodePath(config.BOT_ID);

    // Get pre-validated Puppeteer configuration (Chromium already validated in startup)
    const puppeteerOptions = puppeteerConfig.getConfiguration();

    // Log Puppeteer configuration details (Chromium path already shown in startup)
    logger.info(`Puppeteer config for ${process.platform}`, "⚙️");

    whatsappClient = new Client({
      authStrategy: new LocalAuth({
        clientId: config.BOT_ID,
        dataPath: config.SESSION_PATH,
      }),
      puppeteer: puppeteerOptions,
      webVersionCache: {
        type: "local",
        path: path.join(config.SESSION_PATH, '.wwebjs_cache')
      },
      // Memory optimization settings
      qrMaxRetries: 3,
      takeoverOnConflict: true,
    });

    // Create a promise that resolves when the client is ready
    const clientReadyPromise = new Promise<Client>((resolve, reject) => {
      // State change handler - captures all state transitions
      whatsappClient!.on("change_state", (state) => {
        try {
          logger.info(`WhatsApp state change: ${state}`, "🔄", undefined, "WHATSAPP_STATUS", state);
          
          // Update specific metrics based on state
          if (state === "PAIRING") {
            logger.updateMetric("PAIRING_ATTEMPTS", 1);
          } else if (state === "CONNECTED") {
            logger.updateMetric("WHATSAPP_CONNECTIONS", 1);
          }
        } catch (error) {
          logger.error(`Error handling state change: ${error}`, {}, "ERRORS", 1);
        }
      });

      // Track WhatsApp state to prevent loading events from overriding READY
      let isWhatsAppReady = false;

      // Loading screen handler - shows authentication progress
      whatsappClient!.on("loading_screen", (percent, message) => {
        try {
          // Only update to LOADING if we're not already READY
          // This prevents loading events from overriding the READY state
          if (!isWhatsAppReady) {
            logger.info(`WhatsApp loading: ${percent}% - ${message}`, "⏳", undefined, "WHATSAPP_STATUS", "LOADING");
          } else {
            // Just log the progress without changing the status
            logger.info(`WhatsApp loading: ${percent}% - ${message} (status already READY)`, "⏳");
          }
          logger.updateMetric("LOADING_PROGRESS", percent);
        } catch (error) {
          logger.error(`Error handling loading screen: ${error}`, {}, "ERRORS", 1);
        }
      });

      // Remote session saved handler
      whatsappClient!.on("remote_session_saved", () => {
        try {
          logger.info("WhatsApp session saved to remote storage", "💾", undefined, "WHATSAPP_STATUS", "SESSION_SAVED");
          logger.updateMetric("SESSION_SAVES", 1);
        } catch (error) {
          logger.error(`Error handling session save: ${error}`, {}, "ERRORS", 1);
        }
      });

      // QR Code generation handler
      whatsappClient!.on("qr", async (qr) => {
        try {
          logger.info("Waiting for QR", "🤖", undefined, "WHATSAPP_STATUS", "WAITING_FOR_QR");
          await handleQRGenerated(qr);
          logger.info("QR Code ready for scanning", "🤖", undefined, "WHATSAPP_STATUS", "QR_READY");

          if (onQRGenerated) {
            await onQRGenerated(qr);
          }
        } catch (error) {
          logger.error(`QR generation error: ${error}`, {}, "ERRORS", 1);
          logger.info("QR Code generation failed", "🤖", undefined, "WHATSAPP_STATUS", "ERROR_CONNECTION");
        }
      });

      // Authentication handlers
      whatsappClient!.on("authenticated", () => {
        try {
          logger.info("QR Code scanned successfully!", "📱", undefined, "QR_STATUS", "SCANNED");
          logger.info("WhatsApp authentication successful", "🤖", undefined, "WHATSAPP_STATUS", "AUTHENTICATED");
          logger.info("Processing session data and preparing connection", "🤖", undefined, "WHATSAPP_STATUS", "PROCESSING_SESSION");
          logger.logLifecycleStep("AUTHENTICATING");
          
          // Update authentication metrics
          logger.updateMetric("AUTH_SUCCESS", 1);
          logger.updateMetric("QR_SCANS", 1);
          
          cleanupQRCode();
        } catch (error) {
          logger.error(`Error during authentication: ${error}`, {}, "ERRORS", 1);
          logger.info("Authentication processing failed", "🤖", undefined, "WHATSAPP_STATUS", "ERROR_AUTHENTICATION");
        }
      });

      whatsappClient!.on("auth_failure", (message) => {
        try {
          logger.error(`WhatsApp authentication failed: ${message}`, {}, "ERRORS", 1);
          logger.info("WhatsApp state: error_authentication - Authentication failed", "🤖", undefined, "WHATSAPP_STATUS", "ERROR_AUTHENTICATION");
          logger.updateMetric("AUTH_FAILURES", 1);
          reject(new Error(`WhatsApp authentication failed: ${message}`));
        } catch (error) {
          logger.error(`Error handling auth failure: ${error}`, {}, "ERRORS", 1);
          reject(new Error("WhatsApp authentication failed"));
        }
      });

      // Ready handler - this is where we resolve the promise
      whatsappClient!.on("ready", async () => {
        isWhatsAppReady = true; // Mark as ready to prevent loading events from overriding
        logger.info("WhatsApp state: ready - WhatsApp client is ready", "🤖", undefined, "WHATSAPP_STATUS", "READY");
        logger.logLifecycleStep("READY");

        // Start monitoring browser metrics
        startBrowserMetricsMonitoring();

        // Connect modern client to route exporter
        setClient(whatsappClient);

        try {
          const clientInfo = whatsappClient!.info;
          if (clientInfo) {
            // Extract phone number directly from wid.user
            let phoneNumber = "0"; // fallback
            if (clientInfo.wid?.user) {
              const { cleanedPhoneNumber } = cleanAndFormatPhoneNumber(clientInfo.wid.user);
              if (cleanedPhoneNumber !== "0") {
                phoneNumber = cleanedPhoneNumber;
                logger.info(`✅ Phone number extracted: ${phoneNumber}`, "✅");
              }
            }
            
            if (phoneNumber === "0") {
              logger.info("❌ Could not extract phone number from client info", "❌");
            }
            
            logger.info(`WhatsApp connected as: ${phoneNumber}`, "✅", undefined, "WHATSAPP_CONNECTIONS", 1);
            
            // Update WhatsApp connections metric
            logger.updateMetric("WHATSAPP_CONNECTIONS", 1);
            
            // Update client metrics - phone number and pushname (only once)
            logger.updateMetric("CLIENT_PHONE", phoneNumber);
            logger.updateMetric("CLIENT_PUSHNAME", clientInfo.pushname || "Unknown");
            
            // Log the client info
            logger.info(`Client Phone: ${phoneNumber}`, "📱");
            logger.info(`Client Name: ${clientInfo.pushname || "Unknown"}`, "👤");
          }
        } catch (error) {
          logger.info(`Could not get client info: ${error}`, "⚠️");
        }

        // Resolve the promise now that the client is ready
        resolve(whatsappClient!);
      });

      // Battery info handler - shows phone battery status
      whatsappClient!.on("change_battery", (batteryInfo) => {
        try {
          logger.info(`Phone battery: ${batteryInfo.battery}% (${batteryInfo.plugged ? 'charging' : 'not charging'})`, "🔋", undefined, "WHATSAPP_STATUS", "BATTERY_UPDATE");
          logger.updateMetric("PHONE_BATTERY", batteryInfo.battery);
        } catch (error) {
          logger.error(`Error handling battery info: ${error}`, {}, "ERRORS", 1);
        }
      });

      // Disconnection handler
      whatsappClient!.on("disconnected", (reason) => {
        try {
          logger.info(`WhatsApp disconnected: ${reason}`, "🔌", undefined, "WHATSAPP_STATUS", "DISCONNECTED");
          logger.updateMetric("DISCONNECTIONS", 1);

          // Handle specific disconnection reasons
          if (reason === "LOGOUT") {
            logger.info("User logged out from WhatsApp Web", "🤖", undefined, "WHATSAPP_STATUS", "LOGOUT");
            logger.updateMetric("LOGOUTS", 1);
          } else if (reason === "CONFLICT") {
            logger.info("WhatsApp session conflict detected", "🤖", undefined, "WHATSAPP_STATUS", "CONFLICT");
            logger.updateMetric("CONFLICTS", 1);
          } else {
            logger.info(`WhatsApp disconnected with reason: ${reason}`, "🤖", undefined, "WHATSAPP_STATUS", "DISCONNECTED");
          }
        } catch (error) {
          logger.error(`Error handling disconnection: ${error}`, {}, "ERRORS", 1);
        }
      });

      // Error handlers
      whatsappClient!.on("error", (error) => {
        try {
          logger.error(`WhatsApp connection error: ${error}`, {}, "ERRORS", 1);
          logger.info(`WhatsApp state: error_connection - Connection error occurred`, "🤖", undefined, "WHATSAPP_STATUS", "ERROR_CONNECTION");
          logger.updateMetric("CONNECTION_ERRORS", 1);
          reject(error);
        } catch (handlingError) {
          logger.error(`Error handling WhatsApp error: ${handlingError}`, {}, "ERRORS", 1);
          reject(error);
        }
      });
    });

    // Initialize the client
    await whatsappClient.initialize();

    // Wait for the client to be ready before continuing
    await clientReadyPromise;

    return whatsappClient;
  } catch (error) {
    logger.info("WhatsApp state: error_validation - Validation error", "🤖", undefined, "WHATSAPP_STATUS", "ERROR_VALIDATION");
    throw error;
  }
}

/**
 * Shutdown WhatsApp client
 * ULTRA-OPTIMIZED - Silent shutdown, orchestrator handles all logging
 */
export async function shutdownWhatsAppClient(): Promise<void> {
  if (!whatsappClient) {
    return; // Silent return
  }

  try {
    // Silent state update - no logging during shutdown

    // Check if client has a destroy method and is not null
    if (whatsappClient && typeof whatsappClient.destroy === "function") {
      try {
        await whatsappClient.destroy();
      } catch (destroyError) {
        // Handle specific whatsapp-web.js internal errors
        const errorMessage =
          destroyError instanceof Error
            ? destroyError.message
            : String(destroyError);
        if (
          !errorMessage.includes("Cannot read properties of null") &&
          !errorMessage.includes("close")
        ) {
          // Only log unexpected errors
          logger.error(`Error during WhatsApp client destroy: ${errorMessage}`);
        }
      }
    }

    whatsappClient = null;
  } catch (error) {
    logger.error(`Error during WhatsApp client shutdown: ${error}`);
    whatsappClient = null;
  }
}

/**
 * Get WhatsApp client
 */
export function getWhatsAppClient(): Client | null {
  return whatsappClient;
}

/**
 * Check if WhatsApp client is ready
 */
export function isWhatsAppClientReady(): boolean {
  return whatsappClient !== null;
}

/**
 * QR Code API exports for compatibility
 */
export function getQRCode(): string | null {
  return currentQRCode;
}

export function hasQRCode(): boolean {
  return currentQRCode !== null;
}

export function getQRCodePath(): string | null {
  return qrCodePath;
}

export function getQRStatus() {
  return {
    hasCode: currentQRCode !== null,
    path: qrCodePath,
    code: currentQRCode,
  };
}

/**
 * Clean up QR code (public export for shutdown procedures)
 * ULTRA-OPTIMIZED - Silent cleanup during shutdown
 */
export function cleanupQRCodeAfterConnection(): void {
  // Only cleanup if QR code was actually generated and saved
  if (currentQRCode && qrCodePath) {
    logger.info("QR authentication completed successfully", "✅", undefined, "QR_STATUS", "COMPLETED");
    cleanupQRCode(); // Silent cleanup - no logging
  }
  // No logging during shutdown - orchestrator handles all logging
}

/**
 * Utility functions for updating WhatsApp metrics
 * These can be called from other parts of the application
 */

/**
 * Update message processing metric
 */
export function updateMessageMetric(): void {
  logger.updateMetric("MESSAGES", 1);
}

/**
 * Update message processing time metric
 */
export function updateMessageProcessingTime(timeMs: number): void {
  logger.updateMetric("MESSAGE_PROCESSING_TIME", timeMs);
}

/**
 * Update error metric
 */
export function updateErrorMetric(): void {
  logger.updateMetric("ERRORS", 1);
}

/**
 * Update browser memory usage metric
 */
export function updateBrowserMemoryMetric(memoryMB: number): void {
  logger.updateMetric("BROWSER_MEMORY", memoryMB);
}

/**
 * Update browser CPU usage metric
 */
export function updateBrowserCpuMetric(cpuPercent: number): void {
  logger.updateMetric("BROWSER_CPU", cpuPercent);
}

/**
 * Start monitoring browser metrics (CPU and Memory)
 */
export function startBrowserMetricsMonitoring(): void {
  // Monitor every 30 seconds
  setInterval(async () => {
    try {
      const client = getWhatsAppClient();
      if (!client || !client.pupPage) {
        // No client or page available, set metrics to 0
        updateBrowserMemoryMetric(0);
        updateBrowserCpuMetric(0);
        return;
      }

      // Get the browser and page from the WhatsApp client
      const page = client.pupPage;
      
      // Get browser process metrics (this is approximate)
      const metrics = await page.metrics();
      
      // Calculate memory usage in MB
      const memoryMB = Math.round((metrics.JSHeapUsedSize || 0) / (1024 * 1024));
      
      // CPU usage is harder to get directly from Puppeteer
      // We'll use ScriptDuration as a simple heuristic for CPU activity
      const scriptDuration = metrics.ScriptDuration || 0;
      
      // Simple heuristic: if there's recent activity, show some CPU usage
      const cpuPercent = Math.min(Math.round(scriptDuration * 100), 100);
      
      // Update metrics
      updateBrowserMemoryMetric(memoryMB);
      updateBrowserCpuMetric(cpuPercent);
      
    } catch {
      // If we can't get metrics, set to 0
      updateBrowserMemoryMetric(0);
      updateBrowserCpuMetric(0);
    }
  }, 30000); // 30 seconds
}
