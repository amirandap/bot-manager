/**
 * WhatsApp Client Management Utilities
 * CENTRALIZED - Unified utility functions for WhatsApp client lifecycle
 * Now includes internal QR code management
 */

import { Client, LocalAuth } from "whatsapp-web.js";
import * as QRCode from "qrcode";
import * as path from "path";
import { cleanAndFormatPhoneNumber } from "./cleanAndFormatPhoneNumber";
import { updatePM2Metrics, logWhatsAppOperation } from "./pm2Utils";
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
 */
export const updateWhatsAppState = (state: BotLifecycleState, info: string = ""): void => {
  currentState = state;
  
  const isError = state === BotLifecycleState.ERROR_CONNECTION || state === BotLifecycleState.ERROR_AUTHENTICATION || state === BotLifecycleState.ERROR_VALIDATION;
  const status = isError ? 'failure' : 'success';
  const message = `Estado: ${state}${info ? ` - ${info}` : ''}`;
  
  updatePM2Metrics('whatsapp_state', status, message, undefined, { state, info });
  
  if (isError) {
    logWhatsAppOperation('updateState', 'error', message, { state, info });
  } else {
    logWhatsAppOperation('updateState', 'success', message, { state, info });
  }
};

/**
 * Initialize QR code system (internal function)
 */
function initializeQRCodePath(botId: string): void {
  try {
    // Use DirectoryManagerService to ensure QR directory exists
    const directoryManager = new DirectoryManagerService();
    directoryManager.createDirectoryIfNotExists(QR_PATH);
    
    qrCodePath = path.join(QR_PATH, `${botId}.png`);
    logWhatsAppOperation('initQRPath', 'success', `QR code path initialized: ${qrCodePath}`, { qrCodePath, botId });
  } catch (error) {
    logWhatsAppOperation('initQRPath', 'error', `Failed to initialize QR code path: ${error}`, { botId, error });
    throw new Error(`QR code path initialization failed: ${error}`);
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
    logWhatsAppOperation('generateQR', 'progress', 'Processing QR code generation...', { qrCodePath });
    currentQRCode = qr;
    
    await saveQRCode(qr);
    
    // Update PM2 with QR code ready status
    updatePM2Metrics('qr_code_ready', 'success', 'QR code generated and ready for scanning', 60, {
      qr_available: true,
      qr_file_path: qrCodePath
    });

    logWhatsAppOperation('generateQR', 'success', `QR Code saved to: ${qrCodePath}`, { qrCodePath });
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logWhatsAppOperation('generateQR', 'error', `Error handling QR code: ${errorMessage}`, { qrCodePath, error });
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
    logWhatsAppOperation('saveQR', 'success', `QR code saved to: ${qrCodePath}`, { qrCodePath });
  } catch (error) {
    logWhatsAppOperation('saveQR', 'error', `Failed to save QR code: ${error}`, { qrCodePath, error });
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
        logWhatsAppOperation('cleanupQR', 'success', 'QR code file cleaned up', { qrCodePath });
      }
    } catch (error) {
      logWhatsAppOperation('cleanupQR', 'warning', `Failed to cleanup QR code: ${error}`, { qrCodePath, error });
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
    logWhatsAppOperation('initClient', 'warning', 'WhatsApp client already initialized or initialization in progress', { currentState });
    return whatsappClient;
  }

  try {
    logWhatsAppOperation('initClient', 'start', 'WHATSAPP CLIENT INITIALIZATION', { botId: config.BOT_ID });
    updateWhatsAppState(BotLifecycleState.BROWSER_LAUNCHING, "Starting WhatsApp Web browser");

    // Initialize QR code path internally
    initializeQRCodePath(config.BOT_ID);

    // Get pre-validated Puppeteer configuration (Chrome already validated in startup)
    const puppeteerOptions = puppeteerConfig.getConfiguration();
    
    // Log Puppeteer configuration details (Chrome path already shown in startup)
    logWhatsAppOperation('initClient', 'progress', `Puppeteer config for ${process.platform}`, {
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
        logWhatsAppOperation('qrGeneration', 'error', `QR generation error: ${error}`, { error });
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
          logWhatsAppOperation('clientReady', 'success', `WhatsApp connected as: ${cleanedPhoneNumber}`, { phoneNumber: cleanedPhoneNumber });
        }
      } catch (error) {
        logWhatsAppOperation('clientReady', 'warning', `Could not get client info: ${error}`, { error });
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
 */
export async function shutdownWhatsAppClient(): Promise<void> {
  if (!whatsappClient) {
    logWhatsAppOperation('shutdown', 'warning', 'WhatsApp client not initialized, nothing to shutdown', {});
    return;
  }

  try {
    logWhatsAppOperation('shutdown', 'start', 'Shutting down WhatsApp client...', {});
    updateWhatsAppState(BotLifecycleState.DISCONNECTED, "Shutting down WhatsApp client");
    
    // Check if client has a destroy method and is not null
    if (whatsappClient && typeof whatsappClient.destroy === 'function') {
      try {
        await whatsappClient.destroy();
      } catch (destroyError) {
        // Handle specific whatsapp-web.js internal errors
        const errorMessage = destroyError instanceof Error ? destroyError.message : String(destroyError);
        if (errorMessage.includes("Cannot read properties of null") && errorMessage.includes("close")) {
          logWhatsAppOperation('shutdown', 'warning', 'WhatsApp client browser was already closed or not properly initialized', { error: errorMessage });
        } else {
          logWhatsAppOperation('shutdown', 'error', `Error during WhatsApp client destroy: ${errorMessage}`, { error: destroyError });
        }
      }
    }
    
    whatsappClient = null;
    currentState = BotLifecycleState.DISCONNECTED;
    
    logWhatsAppOperation('shutdown', 'success', 'WhatsApp client shutdown completed', {});
  } catch (error) {
    logWhatsAppOperation('shutdown', 'error', `Error during WhatsApp client shutdown: ${error}`, { error });
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
 * Only cleans if QR was actually generated
 */
export function cleanupQRCodeAfterConnection(): void {
  // Only cleanup if QR code was actually generated and saved
  if (currentQRCode && qrCodePath) {
    logWhatsAppOperation('cleanup', 'progress', 'Cleaning up QR code after connection...', { qrCodePath });
    cleanupQRCode();
  } else {
    logWhatsAppOperation('cleanup', 'success', 'No QR code to cleanup - was never generated or saved', {});
  }
}
