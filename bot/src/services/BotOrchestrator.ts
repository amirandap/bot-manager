/**
 * Bot Orchestrator
 * Coordinates all bot services and handles the complete bot lifecycle
 */

import { Logger } from "./Logger";
import { WhatsAppClientService, ClientEventCallbacks } from "./WhatsAppClientService";
import { QRCodeService } from "./QRCodeService";
import { BotStateManager } from "./BotStateManager";
import { APIServerService } from "./APIServerService";
import { DirectoryManagerService } from "./DirectoryManagerService";
import { BotLifecycleState } from "../types/types";
import { updatePM2Metrics } from "../utils/pm2Utils";

interface BotConfig {
  BOT_ID: string;
  BOT_NAME: string;
  BOT_PORT: number;
  CHROME_PATH?: string;
}

export class BotOrchestrator {
  private whatsappService: WhatsAppClientService;
  private qrService: QRCodeService;
  private stateManager: BotStateManager;
  private apiService: APIServerService;
  private directoryService: DirectoryManagerService;
  private isShuttingDown = false;
  private server: any = null;

  constructor(private config: BotConfig, private logger: Logger) {
    // Initialize directory service first
    this.directoryService = new DirectoryManagerService(logger);
    
    // Initialize state manager
    this.stateManager = new BotStateManager(config.BOT_ID, logger);
    
    // Initialize QR service
    this.qrService = new QRCodeService(config.BOT_ID, config.BOT_PORT, logger);
    
    // Setup WhatsApp client callbacks
    const callbacks: ClientEventCallbacks = {
      onStateChange: (state, details, error) => this.stateManager.updateState(state, details, error),
      onQRGenerated: (qr) => this.handleQRGenerated(qr),
      onAuthenticated: () => this.handleAuthenticated(),
      onReady: () => this.handleReady(),
      onDisconnected: (reason) => this.handleDisconnected(reason),
      onError: (error) => this.handleError(error)
    };
    
    // Initialize WhatsApp service
    this.whatsappService = new WhatsAppClientService(config, logger, callbacks);
    
    // Initialize API service
    this.apiService = new APIServerService(
      config, 
      logger, 
      this, // StatusProvider
      this.qrService // QRProvider
    );
  }

  /**
   * Initialize the complete bot system
   */
  public async initialize(): Promise<void> {
    try {
      this.logger.startupHeader("🚀 BOT ORCHESTRATOR INITIALIZATION");
      
      // Step 1: Ensure directories exist
      this.logger.info("Creating required directories...", "📁");
      this.directoryService.ensureDirectoriesExist();
      
      // Step 2: Setup API server
      this.logger.info("Setting up API server...", "🌐");
      await this.apiService.setupAPI();
      
      // Step 3: Start API server
      this.logger.info("Starting API server...", "🚀");
      this.server = await this.apiService.startServer();
      
      // Step 4: Initialize WhatsApp client
      this.logger.info("Initializing WhatsApp client...", "📱");
      await this.whatsappService.initializeClient();
      
    } catch (error) {
      this.logger.error(`Bot initialization failed: ${error}`);
      this.stateManager.updateState(BotLifecycleState.ERROR_UNKNOWN, "Bot initialization failed", error as Error);
      throw error;
    }
  }

  /**
   * Event handlers for WhatsApp client events
   */
  private async handleQRGenerated(qr: string): Promise<void> {
    try {
      await this.qrService.handleQRGenerated(qr);
    } catch (error) {
      this.logger.error(`Error handling QR generation: ${error}`);
      this.stateManager.updateState(BotLifecycleState.QR_ERROR, "QR generation failed", error as Error);
    }
  }

  private handleAuthenticated(): void {
    updatePM2Metrics('whatsapp_authenticated', 'success', 'WhatsApp authentication successful', 80, {
      authenticated: true
    });
  }

  private handleReady(): void {
    // Clean up QR code after successful connection
    this.qrService.cleanupQRCode();
    
    updatePM2Metrics('whatsapp_ready', 'success', 'WhatsApp client is ready and connected', 90, {
      client_ready: true,
      bot_operational: true
    });
  }

  private handleDisconnected(reason: string): void {
    if (!this.isShuttingDown) {
      this.logger.info("Attempting to reconnect...", "🔄");
      this.stateManager.updateState(BotLifecycleState.RECONNECTING, "Attempting to reconnect to WhatsApp");
    }
  }

  private handleError(error: Error): void {
    this.logger.error(`WhatsApp error: ${error}`);
    // Error state is already updated by the state change callback
  }

  /**
   * Graceful shutdown of all services
   */
  public async shutdown(): Promise<void> {
    if (this.isShuttingDown) {
      this.logger.warn("Shutdown already in progress");
      return;
    }

    this.isShuttingDown = true;
    this.stateManager.updateState(BotLifecycleState.STOPPING, "Graceful shutdown requested");

    try {
      this.logger.info("Shutting down bot orchestrator...", "🛑");

      // Shutdown WhatsApp client
      await this.whatsappService.shutdown();

      // Clean up QR code
      this.qrService.cleanupQRCode();

      // Shutdown API server
      await this.apiService.shutdown();

      this.stateManager.updateState(BotLifecycleState.STOPPED, "Bot has been stopped");
      this.logger.success("Bot orchestrator shutdown complete", "✅");
    } catch (error) {
      this.logger.error(`Error during shutdown: ${error}`);
      this.stateManager.updateState(BotLifecycleState.ERROR_UNKNOWN, "Shutdown error", error as Error);
      throw error;
    }
  }

  /**
   * Restart the WhatsApp client
   */
  public async restartClient(): Promise<void> {
    this.logger.info("Restarting WhatsApp client...", "🔄");
    await this.whatsappService.restart();
  }

  /**
   * Status provider interface implementation
   */
  public getStatus() {
    const whatsappReady = this.whatsappService.isClientReady();
    const stateDetails = this.stateManager.getStateDetails();
    const qrStatus = this.qrService.getQRStatus();

    return {
      botId: this.config.BOT_ID,
      botName: this.config.BOT_NAME,
      isInitialized: whatsappReady,
      isShuttingDown: this.isShuttingDown,
      hasClient: this.whatsappService.getClient() !== null,
      isReady: this.stateManager.isReady(),
      lifecycleState: this.stateManager.getCurrentState(),
      stateDescription: this.stateManager.getStateDescription(),
      lifecycleDetails: stateDetails,
      ...qrStatus,
    };
  }

  /**
   * Get WhatsApp client for direct access if needed
   */
  public getClient() {
    return this.whatsappService.getClient();
  }

  /**
   * Check if bot is ready for operations
   */
  public isReady(): boolean {
    return this.stateManager.isReady() && this.whatsappService.isClientReady();
  }
}
