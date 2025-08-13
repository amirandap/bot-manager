/**
 * WhatsApp Client Management Utilities
 * CENTRALIZED - Unified utility functions for WhatsApp client lifecycle
 * Now includes internal QR code management
 */

import { Client, LocalAuth } from "whatsapp-web.js";
import * as QRCode from "qrcode";
import * as path from "path";
import { cleanAndFormatPhoneNumber } from "./cleanAndFormatPhoneNumber";
import { logPM2Event, setShutdownContext } from "./pm2Utils_unified";
import { puppeteerConfig } from "../config/PuppeteerConfig";
import { QR_PATH } from "../config/EnvironmentManager";
import { DirectoryManagerService } from "../services/DirectoryManagerService";
import { BotLifecycleState, EnvironmentConfig } from "../types/types";

// State management
let whatsappClient: Client | null = null;
let currentState: BotLifecycleState = BotLifecycleState.INITIALIZING;

// QR Code state (moved from qrUtils)
let currentQRCode: string | null = null;
let qrCodePath: string | null = null;

/**
 * Update WhatsApp state with proper logging
 * OPTIMIZED - Delegates to PM2 centralized logging with context awareness
 */
export const updateWhatsAppState = (state: BotLifecycleState, info: string = ""): void => {
  currentState = state;
  
  // Log state change via PM2
  logPM2Event('whatsapp', 'info', `WhatsApp state: ${state} - ${info}`, { state, info });
};

/**
 * Initialize QR code system (internal function)
 */
export async function initializeQRCodePath(botId: string): Promise<string> {
  try {
    qrCodePath = path.join(QR_PATH, `qr-code-${botId}.png`);
    logPM2Event('startup', 'info', `QR code path initialized: ${qrCodePath}`, { qrCodePath, botId });
    return qrCodePath;
  } catch (error) {
    logPM2Event('startup', 'error', `Failed to initialize QR code path: ${error}`, { botId, error });
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
    logPM2Event('whatsapp', 'info', 'Processing QR code generation...', { qrCodePath });
    currentQRCode = qr;
    
    await saveQRCode(qr);
    
    // Update PM2 with QR code ready status
    logPM2Event('whatsapp', 'info', 'QR code generated and ready for scanning', {
      qr_available: true,
      qr_file_path: qrCodePath
    });

    logPM2Event('whatsapp', 'success', `QR Code saved to: ${qrCodePath}`, { qrCodePath });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logPM2Event('whatsapp', 'error', `Error handling QR code: ${errorMessage}`, { qrCodePath, error });
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
    logPM2Event('whatsapp', 'success', `QR code saved to: ${qrCodePath}`, { qrCodePath });
  } catch (error) {
    logPM2Event('whatsapp', 'error', `Failed to save QR code: ${error}`, { qrCodePath, error });
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
        logPM2Event('whatsapp', 'success', 'QR code file cleaned up', { qrCodePath });
      }
    } catch (error) {
      logPM2Event('whatsapp', 'error', `Failed to cleanup QR code: ${error}`, { qrCodePath, error });
    }
  }
  currentQRCode = null;
}

/**
 * Initialize WhatsApp client with proper configuration
 * Now handles QR code management internally
 */
export async function initializeWhatsAppClient(
  config: EnvironmentConfig,
  onQRGenerated?: (qr: string) => Promise<void>
): Promise<Client> {
  if (whatsappClient && currentState !== BotLifecycleState.INITIALIZING) {
    logPM2Event('whatsapp', 'info', 'WhatsApp client already initialized or initialization in progress', { currentState });
    return whatsappClient;
  }

  try {
    logPM2Event('whatsapp', 'info', 'WHATSAPP CLIENT INITIALIZATION', { botId: config.BOT_ID });
    updateWhatsAppState(BotLifecycleState.BROWSER_LAUNCHING, "Starting WhatsApp Web browser");

    // Initialize QR code path internally
    initializeQRCodePath(config.BOT_ID);

    // Get pre-validated Puppeteer configuration (Chrome already validated in startup)
    const puppeteerOptions = puppeteerConfig.getConfiguration();
    
    // Log Puppeteer configuration details (Chrome path already shown in startup)
    logPM2Event('whatsapp', 'info', `Puppeteer config for ${process.platform}`, {
      platform: process.platform,
      headless: puppeteerOptions.headless,
      argsCount: puppeteerOptions.args.length
    });
    
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
        await handleQRGenerated(qr);
        updateWhatsAppState(BotLifecycleState.QR_READY, "QR Code ready for scanning");
        
        if (onQRGenerated) {
          await onQRGenerated(qr);
        }
      } catch (error) {
        logPM2Event('whatsapp', 'error', `QR generation error: ${error}`, { error });
        updateWhatsAppState(BotLifecycleState.ERROR_CONNECTION, `QR Code generation failed: ${error}`);
      }
    });

    // Authentication handlers
    whatsappClient.on("authenticated", () => {
      updateWhatsAppState(BotLifecycleState.AUTHENTICATING, "Authenticating with WhatsApp servers");
      cleanupQRCode();
    });

    whatsappClient.on("auth_failure", (error) => {
      updateWhatsAppState(BotLifecycleState.ERROR_AUTHENTICATION, `WhatsApp authentication failed: ${error}`);
    });

    // Ready handler
    whatsappClient.on("ready", async () => {
      updateWhatsAppState(BotLifecycleState.READY, "Bot is fully initialized and ready");
      
      try {
        const clientInfo = whatsappClient!.info;
        if (clientInfo) {
          const { cleanedPhoneNumber } = cleanAndFormatPhoneNumber(clientInfo.wid.user);
          logPM2Event('whatsapp', 'success', `WhatsApp connected as: ${cleanedPhoneNumber}`, { phoneNumber: cleanedPhoneNumber });
        }
      } catch (error) {
        logPM2Event('whatsapp', 'info', `Could not get client info: ${error}`, { error });
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
      updateWhatsAppState(BotLifecycleState.ERROR_CONNECTION, `WhatsApp connection error: ${error}`);
    });

    // Initialize the client
    await whatsappClient.initialize();
    
    return whatsappClient;

  } catch (error) {
    updateWhatsAppState(BotLifecycleState.ERROR_VALIDATION, `WhatsApp client initialization failed: ${error}`);
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
    currentState = BotLifecycleState.DISCONNECTED;
    
    // Check if client has a destroy method and is not null
    if (whatsappClient && typeof whatsappClient.destroy === 'function') {
      try {
        await whatsappClient.destroy();
      } catch (destroyError) {
        // Handle specific whatsapp-web.js internal errors
        const errorMessage = destroyError instanceof Error ? destroyError.message : String(destroyError);
        if (!errorMessage.includes("Cannot read properties of null") && !errorMessage.includes("close")) {
          // Only log unexpected errors
          logPM2Event('shutdown', 'error', `Error during WhatsApp client destroy: ${errorMessage}`, { error: destroyError });
        }
      }
    }
    
    whatsappClient = null;
    
  } catch (error) {
    logPM2Event('shutdown', 'error', `Error during WhatsApp client shutdown: ${error}`, { error });
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

/**
 * Clean up QR code (public export for shutdown procedures)
 * ULTRA-OPTIMIZED - Silent cleanup during shutdown
 */
export function cleanupQRCodeAfterConnection(): void {
  // Only cleanup if QR code was actually generated and saved
  if (currentQRCode && qrCodePath) {
    cleanupQRCode(); // Silent cleanup - no logging
  }
  // No logging during shutdown - orchestrator handles all logging
}
