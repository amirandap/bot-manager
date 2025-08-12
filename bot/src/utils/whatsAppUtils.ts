/**
 * WhatsApp Client Management Utilities
 * CENTRALIZED - Unified utility functions for WhatsApp client lifecycle
 */

import { Client, LocalAuth } from "whatsapp-web.js";
import { handleQRGenerated, cleanupQRCode } from "./qrUtils";
import { cleanAndFormatPhoneNumber } from "./cleanAndFormatPhoneNumber";
import { botLogger } from "./loggerWrapper";
import { puppeteerConfig } from "../config/PuppeteerConfig";
import { BotLifecycleState } from "../types/types";

// State management
let whatsappClient: Client | null = null;
let currentState: BotLifecycleState = BotLifecycleState.INITIALIZING;

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
 * Initialize WhatsApp client with proper configuration
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
