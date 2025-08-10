/**
 * Unified Bot Lifecycle Manager
 * Handles the complete WhatsApp bot lifecycle from initialization to ready
 */

import { Client, LocalAuth } from "whatsapp-web.js";
import * as fs from "fs";
import * as path from "path";
import * as QRCode from "qrcode";
import { Logger } from "./Logger";
import { botLifecycle } from "../utils/botLifecycleTracker";
import { setClient } from "../config/clientExporter";
import {
  CHROME_PATH,
  SESSION_PATH,
  QR_PATH,
  LOGS_PATH,
} from "../config/EnvironmentManager";
import { BotLifecycleState } from "../types/types";

interface BotConfig {
  BOT_ID: string;
  BOT_NAME: string;
  BOT_PORT: number;
  CHROME_PATH?: string;
}

export class UnifiedBotLifecycle {
  private client: Client | null = null;
  private qrCode: string | null = null;
  private isInitialized = false;
  private isShuttingDown = false;
  private sessionPath: string;
  private qrCodePath: string;

  public constructor(private config: BotConfig, private logger: Logger) {
    this.sessionPath = SESSION_PATH;
    this.qrCodePath = path.join(QR_PATH, `${this.config.BOT_ID}.png`);

    // Ensure directories exist
    this.ensureDirectoriesExist();
  }

  private ensureDirectoriesExist(): void {
    [SESSION_PATH, QR_PATH, LOGS_PATH].forEach((dir) => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  public async initializeClient(): Promise<void> {
    if (this.isInitialized || this.isShuttingDown) {
      this.logger.warn("Client already initialized or shutting down");
      return;
    }

    try {
      this.logger.startupHeader("🤖 WHATSAPP BOT LIFECYCLE INITIALIZATION");
      botLifecycle.markBrowserLaunching();

      // Validate Chrome path
      await this.validateChromePath();

      // Create WhatsApp client with session management
      this.client = new Client({
        authStrategy: new LocalAuth({
          clientId: this.config.BOT_ID,
          dataPath: this.sessionPath,
        }),
        puppeteer: {
          headless: true,
          args: [
            "--no-sandbox",
            "--disable-setuid-sandbox",
            "--disable-dev-shm-usage",
            "--disable-accelerated-2d-canvas",
            "--no-first-run",
            "--no-zygote",
            "--single-process",
            "--disable-gpu",
          ],
          executablePath: CHROME_PATH || undefined,
        },
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

      // Initialize client
      this.logger.info("Initializing WhatsApp client...", "🔄");
      botLifecycle.markWaitingForQR();

      await this.client.initialize();
      this.isInitialized = true;
    } catch (error) {
      this.logger.error(`Failed to initialize WhatsApp client: ${error}`);
      botLifecycle.markBrowserError(error as Error);
      throw error;
    }
  }

  private async validateChromePath(): Promise<void> {
    if (CHROME_PATH && !fs.existsSync(CHROME_PATH)) {
      const error = new Error(`Chrome executable not found at: ${CHROME_PATH}`);
      botLifecycle.markChromeError(error);
      throw error;
    }
  }

  private setupEventHandlers(): void {
    if (!this.client) return;

    // QR Code generation
    this.client.on("qr", (qr) => {
      try {
        this.logger.success("QR Code generated! Scan to connect.", "📱");
        this.qrCode = qr;
        this.saveQRCode(qr);
        botLifecycle.markQRReady();

        this.logger.info(`QR Code saved to: ${this.qrCodePath}`, "💾");
        this.logger.info(
          `QR available at: http://localhost:${this.config.BOT_PORT}/qr-code`,
          "🌐"
        );
      } catch (error) {
        this.logger.error(`Error handling QR code: ${error}`);
        botLifecycle.markQRError(error as Error);
      }
    });

    // Authentication success
    this.client.on("authenticated", () => {
      this.logger.success("WhatsApp authentication successful!", "✅");
      botLifecycle.markAuthenticating();
    });

    // Authentication failure
    this.client.on("auth_failure", (msg) => {
      const error = new Error(`Authentication failed: ${msg}`);
      this.logger.error(`Authentication failed: ${msg}`);
      botLifecycle.markAuthenticationError(error);
    });

    // Client ready
    this.client.on("ready", () => {
      this.logger.success(
        `${this.config.BOT_NAME} is ready and connected!`,
        "🎉"
      );
      botLifecycle.markReady();

      // Clean up QR code file after successful connection
      this.cleanupQRCode();
    });

    // Client disconnected
    this.client.on("disconnected", (reason) => {
      this.logger.warn(`WhatsApp client disconnected: ${reason}`, "⚠️");
      botLifecycle.markDisconnected(reason);

      if (!this.isShuttingDown) {
        this.logger.info("Attempting to reconnect...", "🔄");
        botLifecycle.markReconnecting();
      }
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
      botLifecycle.markConnectionError(error);
    });

    // Message events for logging
    this.client.on("message_create", (message) => {
      if (message.fromMe) {
        const msgPreview = message.body.substring(0, 30);
        this.logger.info(
          `Message sent to ${message.to}: ${msgPreview}...`,
          "📤"
        );
      }
    });

    this.client.on("message", (message) => {
      if (!message.fromMe) {
        const msgPreview = message.body.substring(0, 30);
        this.logger.info(
          `Message received from ${message.from}: ${msgPreview}...`,
          "📥"
        );
      }
    });
  }

  private saveQRCode(qr: string): void {
    try {
      QRCode.toFile(
        this.qrCodePath,
        qr,
        {
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
          width: 256,
        },
        (error: Error | null | undefined) => {
          if (error) {
            this.logger.error(`Error saving QR code: ${error}`);
            botLifecycle.markQRError(error);
          } else {
            this.logger.success("QR code image saved successfully", "💾");
          }
        }
      );
    } catch (error) {
      this.logger.error(`Error generating QR code image: ${error}`);
      botLifecycle.markQRError(error as Error);
    }
  }

  private cleanupQRCode(): void {
    try {
      if (fs.existsSync(this.qrCodePath)) {
        fs.unlinkSync(this.qrCodePath);
        this.logger.info(
          "QR code file cleaned up after successful connection",
          "🧹"
        );
      }
      this.qrCode = null;
    } catch (error) {
      this.logger.warn(`Could not clean up QR code file: ${error}`);
    }
  }

  public getQRCode(): string | null {
    return this.qrCode;
  }

  public hasQRCode(): boolean {
    return this.qrCode !== null && botLifecycle.hasQRCode();
  }

  public getQRCodePath(): string {
    return this.qrCodePath;
  }

  public isClientReady(): boolean {
    return (
      this.client !== null &&
      this.isInitialized &&
      botLifecycle.getState() === BotLifecycleState.READY
    );
  }

  public getClient(): Client | null {
    return this.client;
  }



  public async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      this.logger.warn("Shutdown already in progress");
      return;
    }

    this.isShuttingDown = true;
    botLifecycle.markStopping("Graceful shutdown requested");

    try {
      this.logger.info("Shutting down WhatsApp bot...", "🛑");

      if (this.client) {
        // Clean up client
        await this.client.destroy();
        this.client = null;
        setClient(null);
      }

      // Clean up QR code
      this.cleanupQRCode();

      botLifecycle.markStopped();
      this.logger.success("WhatsApp bot shutdown complete", "✅");
    } catch (error) {
      this.logger.error(`Error during shutdown: ${error}`);
      botLifecycle.markError(error as Error);
      throw error;
    }
  }

  public async restartClient(): Promise<void> {
    this.logger.info("Restarting WhatsApp client...", "🔄");

    await this.shutdown();

    // Reset state
    this.isShuttingDown = false;
    this.isInitialized = false;
    this.qrCode = null;

    // Wait a moment before restarting
    await new Promise((resolve) => setTimeout(resolve, 2000));

    await this.initializeClient();
  }

  public getStatus() {
    return {
      botId: this.config.BOT_ID,
      botName: this.config.BOT_NAME,
      isInitialized: this.isInitialized,
      isShuttingDown: this.isShuttingDown,
      hasClient: this.client !== null,
      isReady: this.isClientReady(),
      hasQRCode: this.hasQRCode(),
      qrCodePath: this.hasQRCode() ? this.qrCodePath : null,
      lifecycleState: botLifecycle.getState(),
      stateDescription: botLifecycle.getStateDescription(),
      lifecycleDetails: botLifecycle.getStateDetails(),
    };
  }
}
