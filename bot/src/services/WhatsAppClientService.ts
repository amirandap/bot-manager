/**
 * WhatsApp Client Service
 * Handles WhatsApp client initialization, configuration, and core events
 */

import { Client, LocalAuth } from "whatsapp-web.js";
import { Logger } from "./Logger";
import { setClient } from "../config/clientExporter";
import { puppeteerConfig } from "../config/PuppeteerConfig";
import { SESSION_PATH, CHROME_PATH } from "../config/EnvironmentManager";
import { BotLifecycleState } from "../types/types";

interface BotConfig {
  BOT_ID: string;
  BOT_NAME: string;
  BOT_PORT: number;
  CHROME_PATH?: string;
}

export interface ClientEventCallbacks {
  onStateChange: (state: BotLifecycleState, details?: string, error?: Error) => void;
  onQRGenerated: (qr: string) => void;
  onAuthenticated: () => void;
  onReady: () => void;
  onDisconnected: (reason: string) => void;
  onError: (error: Error) => void;
}

export class WhatsAppClientService {
  private client: Client | null = null;
  private isInitialized = false;
  private isInitializing = false;
  private callbacks: ClientEventCallbacks;

  constructor(
    private config: BotConfig,
    private logger: Logger,
    callbacks: ClientEventCallbacks
  ) {
    this.callbacks = callbacks;
  }

  public async initializeClient(): Promise<void> {
    if (this.isInitialized || this.isInitializing) {
      this.logger.warn("Client already initialized or initialization in progress");
      return;
    }

    this.isInitializing = true;

    try {
      this.logger.startupHeader("🤖 WHATSAPP CLIENT INITIALIZATION");
      this.callbacks.onStateChange(BotLifecycleState.BROWSER_LAUNCHING, "Starting WhatsApp Web browser");

      // Get system information for debugging
      const systemInfo = puppeteerConfig.getSystemInfo();
      this.logger.info(`System: ${systemInfo.platform} ${systemInfo.arch}`, "💻");
      this.logger.info(`Node: ${systemInfo.nodeVersion}`, "💚");
      this.logger.info(`Memory: ${systemInfo.availableMemory}`, "🧠");
      
      // Validate environment before proceeding
      const validation = await puppeteerConfig.validateEnvironment();
      if (!validation.isValid) {
        this.logger.warn("Environment validation issues found:", "⚠️");
        validation.issues.forEach(issue => this.logger.warn(`  - ${issue}`, "❌"));
        validation.recommendations.forEach(rec => this.logger.info(`  💡 ${rec}`, "💡"));
      }

      // Get optimized Puppeteer configuration
      const puppeteerConf = puppeteerConfig.getConfiguration({
        customChromePath: CHROME_PATH,
        isProduction: process.env.NODE_ENV === "production",
        headless: true,
      });

      // Create WhatsApp client with optimized configuration
      this.client = new Client({
        authStrategy: new LocalAuth({
          clientId: this.config.BOT_ID,
          dataPath: SESSION_PATH,
        }),
        puppeteer: puppeteerConf,
        webVersionCache: {
          type: "remote",
          remotePath:
            "https://raw.githubusercontent.com/wppconnect-team/" +
            "wa-version/main/html/2.2412.54.html",
        },
      });

      // Set up event handlers
      this.setupEventHandlers();

      // Export client for use by other modules
      setClient(this.client);

      // Initialize client - this will trigger the browser startup
      this.logger.info("Initializing WhatsApp client...", "🔄");
      await this.client.initialize();
      
      // Only mark as waiting for QR after client initialization succeeds
      this.logger.info("WhatsApp client initialized, waiting for QR code...", "⏳");
      this.callbacks.onStateChange(BotLifecycleState.WAITING_FOR_QR, "Waiting for QR code generation");
      
      this.isInitialized = true;
    } catch (error) {
      this.logger.error(`Failed to initialize WhatsApp client: ${error}`);
      this.callbacks.onStateChange(BotLifecycleState.ERROR_BROWSER, "Browser initialization failed", error as Error);
      
      // Log the error details for debugging
      if (error instanceof Error && error.message.includes('SingletonLock')) {
        this.logger.error("Chrome browser session conflict detected. Bot is now in error state.", "❌");
        this.logger.info("Please manually stop the bot and restart it to resolve the issue.", "💡");
      } else {
        this.logger.error("Browser initialization failed. Bot is now in error state.", "❌");
      }
      
      this.logger.error("Bot will remain in error state. Manual intervention required.", "⚠️");
      return;
    } finally {
      this.isInitializing = false;
    }
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    // QR Code generation
    this.client.on("qr", (qr) => {
      try {
        this.logger.success("QR Code generated! Scan to connect.", "📱");
        this.callbacks.onQRGenerated(qr);
        this.callbacks.onStateChange(BotLifecycleState.QR_READY, "QR code is ready for scanning");
      } catch (error) {
        this.logger.error(`Error handling QR code: ${error}`);
        this.callbacks.onStateChange(BotLifecycleState.QR_ERROR, "Error generating or sending QR code", error as Error);
      }
    });

    // Authentication success
    this.client.on("authenticated", () => {
      this.logger.success("WhatsApp authentication successful!", "✅");
      this.callbacks.onAuthenticated();
      this.callbacks.onStateChange(BotLifecycleState.AUTHENTICATING, "Authenticating with WhatsApp servers");
    });

    // Authentication failure
    this.client.on("auth_failure", (msg) => {
      const error = new Error(`Authentication failed: ${msg}`);
      this.logger.error(`Authentication failed: ${msg}`);
      this.callbacks.onStateChange(BotLifecycleState.ERROR_AUTHENTICATION, "WhatsApp authentication failed", error);
    });

    // Client ready
    this.client.on("ready", () => {
      this.logger.success(`${this.config.BOT_NAME} is ready and connected!`, "🎉");
      this.callbacks.onReady();
      this.callbacks.onStateChange(BotLifecycleState.READY, "Bot is fully initialized and ready");
    });

    // Client disconnected
    this.client.on("disconnected", (reason) => {
      this.logger.warn(`WhatsApp client disconnected: ${reason}`, "⚠️");
      this.callbacks.onDisconnected(reason);
      this.callbacks.onStateChange(BotLifecycleState.DISCONNECTED, `Disconnected from WhatsApp: ${reason}`);
    });

    // Connection loading screen
    this.client.on("loading_screen", (percent, message) => {
      this.logger.info(`Loading: ${percent}% - ${message}`, "⏳");
    });

    // Remote session saved
    this.client.on("remote_session_saved", () => {
      this.logger.info("Remote session saved successfully", "💾");
    });

    // Error handling
    this.client.on("error", (error) => {
      this.logger.error(`WhatsApp client error: ${error}`);
      this.callbacks.onError(error);
      this.callbacks.onStateChange(BotLifecycleState.ERROR_CONNECTION, "WhatsApp connection error", error);
    });

    // Message events for logging
    this.client.on("message_create", (message) => {
      if (message.fromMe) {
        const msgPreview = message.body.substring(0, 30);
        this.logger.info(`Message sent to ${message.to}: ${msgPreview}...`, "📤");
      }
    });

    this.client.on("message", (message) => {
      if (!message.fromMe) {
        const msgPreview = message.body.substring(0, 30);
        this.logger.info(`Message received from ${message.from}: ${msgPreview}...`, "📥");
      }
    });
  }

  public async shutdown(): Promise<void> {
    this.logger.info("Shutting down WhatsApp client...", "🛑");

    if (this.client) {
      await this.client.destroy();
      this.client = null;
      setClient(null);
    }

    this.isInitialized = false;
    this.logger.success("WhatsApp client shutdown complete", "✅");
  }

  public getClient(): Client | null {
    return this.client;
  }

  public isClientReady(): boolean {
    return this.client !== null && this.isInitialized;
  }

  public async restart(): Promise<void> {
    this.logger.info("Restarting WhatsApp client...", "🔄");
    await this.shutdown();
    
    // Wait a moment before restarting
    await new Promise((resolve) => setTimeout(resolve, 2000));
    
    await this.initializeClient();
  }
}
