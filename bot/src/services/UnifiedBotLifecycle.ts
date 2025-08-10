/**
 * Unified Bot Lifecycle Manager
 * Handles the complete WhatsApp bot lifecycle from initialization to ready
 */

import { Client, LocalAuth } from "whatsapp-web.js";
import * as fs from "fs";
import * as path from "path";
import * as QRCode from "qrcode";
import express from "express";
import { Logger } from "./Logger";
import { setClient } from "../config/clientExporter";
import { puppeteerConfig } from "../config/PuppeteerConfig";
import { updatePM2Metrics, markStepSuccess, markStepFailure, markStepInProgress } from "../utils/pm2Utils";
import { BotLifecycleState } from "../types/types";
import {
  CHROME_PATH,
  SESSION_PATH,
  QR_PATH,
  LOGS_PATH,
} from "../config/EnvironmentManager";

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
  private isInitializing = false; // Add flag to prevent multiple simultaneous initializations
  private currentState: BotLifecycleState = BotLifecycleState.INITIALIZING;
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

  /**
   * Update lifecycle state and notify PM2
   */
  private updateLifecycleState(state: BotLifecycleState, details?: string, error?: Error): void {
    const previousState = this.currentState;
    this.currentState = state;

    // Calculate progress percentage
    const lifecycleStages = [
      BotLifecycleState.INITIALIZING,
      BotLifecycleState.BROWSER_LAUNCHING,
      BotLifecycleState.WAITING_FOR_QR,
      BotLifecycleState.QR_READY,
      BotLifecycleState.QR_SCANNED,
      BotLifecycleState.AUTHENTICATING,
      BotLifecycleState.CONNECTED,
      BotLifecycleState.READY,
    ];

    const currentIndex = lifecycleStages.indexOf(state);
    const progress = currentIndex !== -1 
      ? Math.round((currentIndex / (lifecycleStages.length - 1)) * 100)
      : 0;

    // Use PM2 utilities for communication
    const stepName = `whatsapp_${state.toLowerCase()}`;
    
    if (error || state.toString().startsWith('ERROR_')) {
      if (error) {
        markStepFailure(stepName, error, { 
          lifecycle_state: state,
          details,
          progress,
          bot_id: this.config.BOT_ID
        });
      } else {
        updatePM2Metrics(stepName, 'failure', details || `State: ${state}`, progress, {
          lifecycle_state: state,
          bot_id: this.config.BOT_ID
        });
      }
    } else {
      // Critical states that should be marked as success
      const criticalStates = [
        BotLifecycleState.QR_READY,
        BotLifecycleState.CONNECTED,
        BotLifecycleState.READY,
        BotLifecycleState.AUTHENTICATING
      ];

      if (criticalStates.includes(state)) {
        markStepSuccess(stepName, details || this.getStateDescription(state), {
          lifecycle_state: state,
          progress,
          bot_id: this.config.BOT_ID
        });
      } else {
        markStepInProgress(stepName, details || this.getStateDescription(state), progress);
      }
    }

    // Log state change
    this.logger.info(
      `📊 WhatsApp state: ${previousState} -> ${state}${details ? ` (${details})` : ""}${error ? ` [ERROR: ${error.message}]` : ""}`
    );
  }

  /**
   * Get human-readable state description
   */
  private getStateDescription(state: BotLifecycleState): string {
    switch (state) {
      case BotLifecycleState.INITIALIZING:
        return "Iniciando el bot";
      case BotLifecycleState.BROWSER_LAUNCHING:
        return "Iniciando el navegador";
      case BotLifecycleState.WAITING_FOR_QR:
        return "Esperando código QR";
      case BotLifecycleState.QR_READY:
        return "Código QR listo para escanear";
      case BotLifecycleState.QR_SCANNED:
        return "Código QR escaneado";
      case BotLifecycleState.AUTHENTICATING:
        return "Autenticando con WhatsApp";
      case BotLifecycleState.CONNECTED:
        return "Conectado a WhatsApp";
      case BotLifecycleState.READY:
        return "Completamente operativo";
      case BotLifecycleState.DISCONNECTED:
        return "Desconectado de WhatsApp";
      case BotLifecycleState.RECONNECTING:
        return "Reconectando a WhatsApp";
      case BotLifecycleState.STOPPING:
        return "Deteniendo el bot";
      case BotLifecycleState.STOPPED:
        return "Bot detenido";
      default:
        return "Estado desconocido";
    }
  }

  public async initializeClient(): Promise<void> {
    if (this.isInitialized || this.isShuttingDown) {
      this.logger.warn("Client already initialized or shutting down");
      return;
    }

    if (this.isInitializing) {
      this.logger.warn("Client initialization already in progress");
      return;
    }

    this.isInitializing = true;

    try {
      this.logger.startupHeader("🤖 WHATSAPP BOT LIFECYCLE INITIALIZATION");
      this.updateLifecycleState(BotLifecycleState.BROWSER_LAUNCHING, "Starting WhatsApp Web browser");

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
          dataPath: this.sessionPath,
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
      this.updateLifecycleState(BotLifecycleState.WAITING_FOR_QR, "Waiting for QR code generation");
      
      this.isInitialized = true;
    } catch (error) {
      this.logger.error(`Failed to initialize WhatsApp client: ${error}`);
      
      // Mark error state immediately and do not attempt any cleanup or retry
      this.updateLifecycleState(BotLifecycleState.ERROR_BROWSER, "Browser initialization failed", error as Error);
      
      // Log the error details for debugging but don't attempt any fixes
      if (error instanceof Error && error.message.includes('SingletonLock')) {
        this.logger.error("Chrome browser session conflict detected. Bot is now in error state.", "❌");
        this.logger.info("Please manually stop the bot and restart it to resolve the issue.", "💡");
      } else {
        this.logger.error("Browser initialization failed. Bot is now in error state.", "❌");
      }
      
      // Keep the bot in error state - don't throw the error to prevent restart cycles
      this.logger.error("Bot will remain in error state. Manual intervention required.", "⚠️");
      return; // Exit without throwing to prevent automatic restarts
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
        this.qrCode = qr;
        this.saveQRCode(qr);
        this.updateLifecycleState(BotLifecycleState.QR_READY, "QR code is ready for scanning");

        // Update PM2 with QR code ready status
        updatePM2Metrics('qr_code_ready', 'success', 'QR code generated and ready for scanning', 60, {
          qr_available: true,
          qr_endpoint: `http://localhost:${this.config.BOT_PORT}/qr-code`
        });

        this.logger.info(`QR Code saved to: ${this.qrCodePath}`, "💾");
        this.logger.info(
          `QR available at: http://localhost:${this.config.BOT_PORT}/qr-code`,
          "🌐"
        );
      } catch (error) {
        this.logger.error(`Error handling QR code: ${error}`);
        this.updateLifecycleState(BotLifecycleState.QR_ERROR, "Error generating or sending QR code", error as Error);
        markStepFailure('qr_code_generation', error as Error);
      }
    });

    // Authentication success
    this.client.on("authenticated", () => {
      this.logger.success("WhatsApp authentication successful!", "✅");
      this.updateLifecycleState(BotLifecycleState.AUTHENTICATING, "Authenticating with WhatsApp servers");
      
      // Update PM2 with authentication success
      updatePM2Metrics('whatsapp_authenticated', 'success', 'WhatsApp authentication successful', 80, {
        authenticated: true
      });
    });

    // Authentication failure
    this.client.on("auth_failure", (msg) => {
      const error = new Error(`Authentication failed: ${msg}`);
      this.logger.error(`Authentication failed: ${msg}`);
      this.updateLifecycleState(BotLifecycleState.ERROR_AUTHENTICATION, "WhatsApp authentication failed", error);
      markStepFailure('whatsapp_authentication', error);
    });

    // Client ready
    this.client.on("ready", () => {
      this.logger.success(
        `${this.config.BOT_NAME} is ready and connected!`,
        "🎉"
      );
      this.updateLifecycleState(BotLifecycleState.READY, "Bot is fully initialized and ready");

      // Update PM2 with ready status
      updatePM2Metrics('whatsapp_ready', 'success', 'WhatsApp client is ready and connected', 90, {
        client_ready: true,
        bot_operational: true
      });

      // Clean up QR code file after successful connection
      this.cleanupQRCode();
    });

    // Client disconnected
    this.client.on("disconnected", (reason) => {
      this.logger.warn(`WhatsApp client disconnected: ${reason}`, "⚠️");
      this.updateLifecycleState(BotLifecycleState.DISCONNECTED, `Disconnected from WhatsApp: ${reason}`);

      if (!this.isShuttingDown) {
        this.logger.info("Attempting to reconnect...", "🔄");
        this.updateLifecycleState(BotLifecycleState.RECONNECTING, "Attempting to reconnect to WhatsApp");
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
      this.updateLifecycleState(BotLifecycleState.ERROR_CONNECTION, "WhatsApp connection error", error);
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
            this.updateLifecycleState(BotLifecycleState.QR_ERROR, "Error saving QR code", error);
          } else {
            this.logger.success("QR code image saved successfully", "💾");
          }
        }
      );
    } catch (error) {
      this.logger.error(`Error generating QR code image: ${error}`);
      this.updateLifecycleState(BotLifecycleState.QR_ERROR, "Error generating QR code image", error as Error);
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
    return this.qrCode !== null && this.currentState === BotLifecycleState.QR_READY;
  }

  public getQRCodePath(): string {
    return this.qrCodePath;
  }

  public isClientReady(): boolean {
    return (
      this.client !== null &&
      this.isInitialized &&
      this.currentState === BotLifecycleState.READY
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
    this.updateLifecycleState(BotLifecycleState.STOPPING, "Graceful shutdown requested");

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

      this.updateLifecycleState(BotLifecycleState.STOPPED, "Bot has been stopped");
      this.logger.success("WhatsApp bot shutdown complete", "✅");
    } catch (error) {
      this.logger.error(`Error during shutdown: ${error}`);
      this.updateLifecycleState(BotLifecycleState.ERROR_UNKNOWN, "Unknown error occurred", error as Error);
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
      lifecycleState: this.currentState,
      stateDescription: this.getStateDescription(this.currentState),
      lifecycleDetails: {
        currentState: this.currentState,
        timestamp: new Date().toISOString()
      },
    };
  }

  /**
   * Setup Express API with all necessary routes and middleware
   */
  public async setupAPI(app: any, port: number): Promise<any> {
    // Import routes only when needed
    const messageRoutes = (await import("../routes/unified/messageRoutes")).default;
    const getGroupsRouter = (await import("../routes/getGroups")).default;
    const { addRequestId, logRequest } = await import("../middleware/botMiddleware");

    // Basic middleware
    app.use((await import("express")).json());
    app.use(addRequestId);
    app.use(logRequest);

    // API routes
    app.use("/", messageRoutes);
    app.use("/get-groups", getGroupsRouter);

    // Status endpoints managed by this lifecycle instance
    app.get("/qr-code", (req: any, res: any) => {
      const status = this.getStatus();
      if (this.hasQRCode()) {
        res.json({
          success: true,
          qrCode: this.getQRCode(),
          message: "QR code ready for scanning",
          ...status,
        });
      } else {
        res.json({
          success: false,
          message: status.stateDescription,
          ...status,
        });
      }
    });

    app.get("/status", (req: any, res: any) => {
      const status = this.getStatus();
      res.json(status);
    });

    // Start server
    const server = app.listen(port, () => {
      this.logger.success(`✅ ${this.config.BOT_NAME} started successfully on port ${port}`);
      this.logger.info(`📊 Status: http://localhost:${port}/status`);
      this.logger.info(`📱 QR Code: http://localhost:${port}/qr-code`);
    });

    return server;
  }
}
