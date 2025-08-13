/**
 * WhatsApp Client Management Utilities
 * CENTRALIZED - Unified utility functions for WhatsApp client lifecycle
 * Now includes internal QR code management
 */

import { Client, LocalAuth } from "whatsapp-web.js";
import * as QRCode from "qrcode";
import * as fs from "fs";
import * as path from "path";
import { cleanAndFormatPhoneNumber } from "./cleanAndFormatPhoneNumber";
import { botLogger } from "./loggerWrapper";
import { updatePM2Metrics } from "./pm2Utils";
import { puppeteerConfig } from "../config/PuppeteerConfig";
import { QR_PATH } from "../config/EnvironmentManager";
import { DirectoryManagerService } from "../services/DirectoryManagerService";
import { BotLifecycleState } from "../types/types";

// State management
let whatsappClient: Client | null = null;
let currentState: BotLifecycleState = BotLifecycleState.INITIALIZING;

// QR Code state (moved from qrUtils)
let currentQRCode: string | null = null;
let qrCodePath: string | null = null;

/**
 * Update WhatsApp state with proper logging
 */
export function updateWhatsAppState(
  state: BotLifecycleState,
  details?: string,
  error?: unknown
): void {
  currentState = state;
  
  if (error) {
    botLogger.error(`WhatsApp State: ${state} - ${details || ''}`);
    if (error instanceof Error) {
      botLogger.error(`Error details: ${error.message}`);
    }
  } else {
    botLogger.info(`WhatsApp State: ${state} - ${details || ''}`);
  }
}

/**
 * Initialize QR code system (internal function)
 */
function initializeQRCodePath(botId: string): void {
  try {
    // Use DirectoryManagerService to ensure QR directory exists
    const directoryManager = new DirectoryManagerService();
    directoryManager.createDirectoryIfNotExists(QR_PATH);
    
    qrCodePath = path.join(QR_PATH, `${botId}.png`);
    botLogger.info(`QR code path initialized: ${qrCodePath}`, "📱");
  } catch (error) {
    botLogger.error(`Failed to initialize QR code path: ${error}`);
    throw new Error(`QR code path initialization failed: ${error}`);
  }
}

/**
 * Handle QR code generation (internal function)
 */
async function handleQRGenerated(qr: string, botPort: number): Promise<void> {
  if (!qrCodePath) {
    throw new Error("QR code path not initialized");
  }

  try {
    botLogger.info("Processing QR code generation...", "⏳");
    currentQRCode = qr;
    
    await saveQRCode(qr);
    
    // Update PM2 with QR code ready status
    updatePM2Metrics('qr_code_ready', 'success', 'QR code generated and ready for scanning', 60, {
      qr_available: true,
      qr_endpoint: `http://localhost:${botPort}/qr-code`,
      qr_file_path: qrCodePath
    });

    botLogger.info(`QR Code saved to: ${qrCodePath}`, "💾");
    botLogger.info(`QR available at: http://localhost:${botPort}/qr-code`, "🌐");
    botLogger.success("QR code generation completed successfully", "✅");
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    botLogger.error(`Error handling QR code: ${errorMessage}`);
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
    // Ensure directory exists before saving
    const directoryManager = new DirectoryManagerService();
    const qrDir = path.dirname(qrCodePath);
    directoryManager.createDirectoryIfNotExists(qrDir);

    // Generate QR code file
    return new Promise((resolve, reject) => {
      QRCode.toFile(
        qrCodePath!,
        qr,
        {
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
          width: 512,
        },
        (error) => {
          if (error) {
            botLogger.error(`QR code file generation failed: ${error}`);
            reject(new Error(`Failed to save QR code: ${error.message}`));
          } else {
            botLogger.success(`QR code saved successfully: ${qrCodePath}`);
            resolve();
          }
        }
      );
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    botLogger.error(`QR code save operation failed: ${errorMessage}`);
    throw new Error(`QR code save failed: ${errorMessage}`);
  }
}

/**
 * Clean up QR code file (internal function)
 */
function cleanupQRCode(): void {
  try {
    if (qrCodePath) {
      const directoryManager = new DirectoryManagerService();
      const wasDeleted = directoryManager.cleanupFile(qrCodePath);
      
      if (wasDeleted) {
        botLogger.info("QR code file cleaned up after successful connection", "🧹");
      }
    }
    currentQRCode = null;
  } catch (error) {
    botLogger.warn(`Could not clean up QR code file: ${error}`);
  }
}

/**
 * Initialize WhatsApp client with proper configuration
 * Now handles QR code management internally
 */
export async function initializeWhatsAppClient(
  config: any,
  onQRGenerated?: (qr: string) => Promise<void>
): Promise<Client> {
  if (whatsappClient && currentState !== BotLifecycleState.INITIALIZING) {
    botLogger.warn("WhatsApp client already initialized or initialization in progress");
    return whatsappClient;
  }

  try {
    botLogger.info("🤖 WHATSAPP CLIENT INITIALIZATION");
    updateWhatsAppState(BotLifecycleState.BROWSER_LAUNCHING, "Starting WhatsApp Web browser");

    // Initialize QR code path internally
    initializeQRCodePath(config.BOT_ID);

    const puppeteerOptions = puppeteerConfig.getConfiguration();
    
    whatsappClient = new Client({
      authStrategy: new LocalAuth({
        clientId: config.BOT_ID,
        dataPath: config.SESSION_PATH,
      }),
      puppeteer: puppeteerOptions,
      webVersionCache: {
        type: "remote",
        remotePath: "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2412.54.html",
      },
    });

    // QR Code generation handler
    whatsappClient.on("qr", async (qr) => {
      try {
        updateWhatsAppState(BotLifecycleState.WAITING_FOR_QR, "QR Code generated");
        await handleQRGenerated(qr, parseInt(config.BOT_PORT));
        updateWhatsAppState(BotLifecycleState.QR_READY, "QR Code ready for scanning");
        
        if (onQRGenerated) {
          await onQRGenerated(qr);
        }
      } catch (error) {
        botLogger.error(`QR generation error: ${error}`);
        updateWhatsAppState(BotLifecycleState.ERROR_CONNECTION, "QR Code generation failed", error);
      }
    });

    // Authentication handlers
    whatsappClient.on("authenticated", () => {
      updateWhatsAppState(BotLifecycleState.AUTHENTICATING, "Authenticating with WhatsApp servers");
      cleanupQRCode();
    });

    whatsappClient.on("auth_failure", (error) => {
      updateWhatsAppState(BotLifecycleState.ERROR_AUTHENTICATION, "WhatsApp authentication failed", error);
    });

    // Ready handler
    whatsappClient.on("ready", async () => {
      updateWhatsAppState(BotLifecycleState.READY, "Bot is fully initialized and ready");
      
      try {
        const clientInfo = whatsappClient!.info;
        if (clientInfo) {
          const { cleanedPhoneNumber } = cleanAndFormatPhoneNumber(clientInfo.wid.user);
          botLogger.success(`WhatsApp connected as: ${cleanedPhoneNumber}`);
        }
      } catch (error) {
        botLogger.warn(`Could not get client info: ${error}`);
      }
    });

    // Disconnection handler
    whatsappClient.on("disconnected", (reason) => {
      updateWhatsAppState(BotLifecycleState.DISCONNECTED, `Disconnected from WhatsApp: ${reason}`);
      
      if (reason === "LOGOUT") {
        updateWhatsAppState(BotLifecycleState.RECONNECTING, "Attempting to reconnect to WhatsApp");
      }
    });

    // Error handlers
    whatsappClient.on("error", (error) => {
      updateWhatsAppState(BotLifecycleState.ERROR_CONNECTION, "WhatsApp connection error", error);
    });

    // Initialize the client
    await whatsappClient.initialize();
    
    return whatsappClient;

  } catch (error) {
    updateWhatsAppState(BotLifecycleState.ERROR_VALIDATION, "WhatsApp client initialization failed", error);
    throw error;
  }
}

/**
 * Shutdown WhatsApp client
 */
export async function shutdownWhatsAppClient(): Promise<void> {
  if (!whatsappClient) {
    botLogger.info("WhatsApp client not initialized, nothing to shutdown");
    return;
  }

  try {
    botLogger.info("Shutting down WhatsApp client...");
    updateWhatsAppState(BotLifecycleState.DISCONNECTED, "Shutting down WhatsApp client");
    
    await whatsappClient.destroy();
    whatsappClient = null;
    currentState = BotLifecycleState.DISCONNECTED;
    
    botLogger.success("WhatsApp client shutdown completed");
  } catch (error) {
    botLogger.error(`Error during WhatsApp client shutdown: ${error}`);
    whatsappClient = null;
    currentState = BotLifecycleState.ERROR_CONNECTION;
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
  return whatsappClient !== null && currentState === BotLifecycleState.READY;
}

/**
 * Get current WhatsApp status
 */
export function getWhatsAppStatus(): {
  state: BotLifecycleState;
  isReady: boolean;
  hasClient: boolean;
} {
  return {
    state: currentState,
    isReady: isWhatsAppClientReady(),
    hasClient: whatsappClient !== null,
  };
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
    code: currentQRCode
  };
}

export function sendQRCode(res: any): void {
  const directoryManager = new DirectoryManagerService();
  
  if (!hasQRCode() || !qrCodePath || !directoryManager.fileExists(qrCodePath)) {
    res.status(404).json({ error: "QR Code not available" });
    return;
  }

  res.sendFile(qrCodePath);
}

/**
 * Clean up QR code (public export for shutdown procedures)
 */
export function cleanupQRCodeAfterConnection(): void {
  cleanupQRCode();
}
