// Unified WhatsApp bot with improved lifecycle management - Test version
import express from "express";
import * as path from "path";
import * as fs from "fs";
import * as dotenv from "dotenv";
import * as qrTerminal from "qrcode";
import { Client, LocalAuth } from "whatsapp-web.js";
import { BotLifecycleState, BOT_ID } from './utils/botLifecycleTracker';
import { getFallbackNumber } from "./utils/fallbackUtils";
import { WhatsAppErrorHandler } from "./utils/errorHandler";

// Load environment variables
dotenv.config();

// Bot configuration from environment variables
// BOT_ID is now imported from botLifecycleTracker to avoid circular dependency
const BOT_NAME = process.env.BOT_NAME || `WhatsApp Bot ${BOT_ID}`;
const BOT_PORT = parseInt(process.env.BOT_PORT || "3000");
const BOT_TYPE = process.env.BOT_TYPE || "whatsapp";

// Centralized data paths
const DATA_ROOT = path.join(__dirname, "../../../data");
const SESSION_PATH = path.join(DATA_ROOT, "sessions", BOT_ID);
const QR_PATH = path.join(DATA_ROOT, "qr-codes");
const LOGS_PATH = path.join(DATA_ROOT, "logs", BOT_ID);

// Create directories if they don't exist
[SESSION_PATH, QR_PATH, LOGS_PATH].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
});

console.log(`🤖 Initializing ${BOT_NAME} (${BOT_ID})`);
console.log(`📂 Session path: ${SESSION_PATH}`);
console.log(`📱 QR path: ${QR_PATH}`);
console.log(`📄 Logs path: ${LOGS_PATH}`);
console.log(`🌐 Port: ${BOT_PORT}`);

// Create a unified lifecycle tracker with WhatsApp client integration
class UnifiedBotLifecycle {
  private _state: BotLifecycleState = BotLifecycleState.INITIALIZING;
  private _client: Client | null = null;
  private _qrCodeData: string | null = null;
  private _routesInitialized: boolean = false;
  private _errorHandler: WhatsAppErrorHandler;

  constructor() {
    this._errorHandler = WhatsAppErrorHandler.getInstance();
  }

  get state(): BotLifecycleState {
    return this._state;
  }

  get client(): Client | null {
    return this._client;
  }

  get isReady(): boolean {
    return (
      this._state === BotLifecycleState.READY ||
      this._state === BotLifecycleState.CONNECTED
    );
  }

  get qrCodeData(): string | null {
    return this._qrCodeData;
  }

  setState(state: BotLifecycleState, details?: string): void {
    const previousState = this._state;
    this._state = state;

    console.log(
      `🔄 Bot state: ${previousState} → ${state}${
        details ? ` (${details})` : ""
      }`
    );
    logToFile(
      "lifecycle.log",
      `State changed: ${previousState} → ${state}${
        details ? ` - ${details}` : ""
      }`
    );

    this.updatePM2Metrics();
  }

  setQRCode(qrData: string): void {
    this._qrCodeData = qrData;
    this.setState(
      BotLifecycleState.QR_READY,
      "QR code generated and available"
    );

    // Save QR code as file for API access
    try {
      const qrFilePath = path.join(QR_PATH, `${BOT_ID}.json`);
      fs.writeFileSync(
        qrFilePath,
        JSON.stringify(
          {
            qrCode: qrData,
            timestamp: new Date().toISOString(),
            botId: BOT_ID,
          },
          null,
          2
        )
      );

      console.log(`💾 QR code saved: ${qrFilePath}`);
    } catch (error) {
      console.error("❌ Error saving QR code:", error);
    }
  }

  clearQRCode(): void {
    this._qrCodeData = null;
    // Clean up QR code files
    try {
      const qrFilePath = path.join(QR_PATH, `${BOT_ID}.json`);
      if (fs.existsSync(qrFilePath)) {
        fs.unlinkSync(qrFilePath);
        console.log("🗑️ QR code file cleaned up");
      }
    } catch (error) {
      console.error("❌ Error cleaning QR code:", error);
    }
  }

  public initializeClient(): void {
    this.setState(
      BotLifecycleState.BROWSER_LAUNCHING,
      "Starting WhatsApp Web client"
    );

    try {
      const chromeExecutablePath =
        process.env.CHROME_PATH || "/usr/bin/google-chrome-stable";
      console.log(`🌐 Using Chrome: ${chromeExecutablePath}`);

      // Enhanced browser arguments for better stability
      const browserArgs = [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--no-first-run",
        "--no-zygote",
        "--single-process",
        "--disable-background-timer-throttling",
        "--disable-backgrounding-occluded-windows",
        "--disable-renderer-backgrounding",
        "--disable-features=TranslateUI,VizDisplayCompositor",
        "--disable-web-security",
        "--disable-features=VizDisplayCompositor",
        "--disable-extensions",
        "--disable-plugins",
        "--disable-sync",
        "--disable-translate",
        "--hide-scrollbars",
        "--mute-audio",
        "--disable-client-side-phishing-detection",
        "--disable-component-update",
        "--disable-hang-monitor",
        "--disable-prompt-on-repost",
        "--ignore-certificate-errors",
        "--ignore-ssl-errors",
        "--ignore-certificate-errors-spki-list",
        "--disable-infobars",
        "--disable-blink-features=AutomationControlled",
        "--disable-notifications",
        "--disable-desktop-notifications",
        "--disable-permissions-api",
        "--autoplay-policy=no-user-gesture-required",
        "--memory-pressure-off",
      ];

      this._client = new Client({
        authStrategy: new LocalAuth({
          dataPath: SESSION_PATH,
          clientId: BOT_ID,
        }),
        puppeteer: {
          headless: true,
          args: browserArgs,
          executablePath: chromeExecutablePath,
          timeout: 60000, // 60 seconds timeout
          defaultViewport: null,
          ignoreDefaultArgs: ["--disable-extensions"],
        },
      });

      this.setupClientEventListeners();

      this.setState(
        BotLifecycleState.WAITING_FOR_QR,
        "Client created, waiting for QR"
      );

      // Add timeout for initialization
      const initTimeout = setTimeout(() => {
        console.log("⏰ WhatsApp client initialization timeout");
        this.setState(
          BotLifecycleState.ERROR_BROWSER,
          "Initialization timeout"
        );
      }, 120000); // 2 minutes timeout

      this._client
        .initialize()
        .then(() => {
          clearTimeout(initTimeout);
        })
        .catch((error) => {
          clearTimeout(initTimeout);
          this.handleBotError(error, "CLIENT_INITIALIZATION");
        });
    } catch (error) {
      this.handleBotError(error, "BROWSER_SETUP");
    }
  }

  /**
   * Handle bot lifecycle errors using the centralized error handler
   */
  private async handleBotError(error: Error, context: string): Promise<void> {
    try {
      const whatsappError = await this._errorHandler.handle(
        error,
        this._client,
        {
          context: `BOT_LIFECYCLE_${context}`,
          enableFallback: true,
        }
      );

      // Set appropriate bot state based on error category
      switch (whatsappError.category) {
        case "AUTHENTICATION_ERROR":
          this.setState(
            BotLifecycleState.ERROR_AUTHENTICATION,
            whatsappError.message
          );
          break;
        case "BROWSER_ERROR":
          this.setState(BotLifecycleState.ERROR_BROWSER, whatsappError.message);
          break;
        case "SESSION_ERROR":
          this.setState(BotLifecycleState.DISCONNECTED, whatsappError.message);
          break;
        default:
          this.setState(BotLifecycleState.ERROR_UNKNOWN, whatsappError.message);
      }

      // Log the error details
      logToFile(
        "errors.log",
        `${context} Error: ${whatsappError.message} - Category: ${whatsappError.category}`
      );
    } catch (handlerError) {
      // Fallback if error handler itself fails
      console.error("❌ Error handler failed:", handlerError);
      this.setState(
        BotLifecycleState.ERROR_UNKNOWN,
        `${context} error + handler failure`
      );
      logToFile(
        "errors.log",
        `Critical: Error handler failed for ${context}: ${handlerError}`
      );
    }
  }

  private setupClientEventListeners(): void {
    if (!this._client) return;

    // Add error handling for the client itself
    this._client.on("loading_screen", (percent, message) => {
      console.log(`📊 Loading: ${percent}% - ${message}`);
    });

    // QR Code event - only endpoint that should work during initialization
    this._client.on("qr", (qr) => {
      console.log("📱 QR Code received - scan with your phone");

      // Display in terminal
      qrTerminal.toString(
        qr,
        { type: "terminal", small: true },
        (err, qrString) => {
          if (!err && qrString) {
            console.log(qrString);
          } else {
            console.log(
              "📱 QR code generated (display error, but QR is available via API)"
            );
          }
        }
      );

      // Store QR for API access
      this.setQRCode(qr);
    });

    // Authenticated event
    this._client.on("authenticated", () => {
      console.log("🔐 WhatsApp client authenticated successfully");
      this.setState(BotLifecycleState.AUTHENTICATING, "Client authenticated");
    });

    // Client ready - initialize all API routes
    this._client.on("ready", () => {
      console.log("✅ WhatsApp client ready!");
      this.clearQRCode(); // Remove QR since we're authenticated
      this.setState(BotLifecycleState.CONNECTED, "WhatsApp client connected");
      this.setState(BotLifecycleState.READY, "Bot fully operational");

      // TODO: Initialize API routes here when they're fixed
      console.log("🚀 API routes will be initialized here once fixed");
    });

    // Error handling
    this._client.on("error", (error) => {
      this.handleBotError(error, "CLIENT_ERROR").catch(console.error);
    });

    // Disconnection handling
    this._client.on("disconnected", (reason) => {
      this.handleBotError(
        new Error(`Client disconnected: ${reason}`),
        "DISCONNECTION"
      ).catch(console.error);
      this._routesInitialized = false; // Reset routes on disconnect
    });

    // Authentication failure
    this._client.on("auth_failure", (message) => {
      this.handleBotError(
        new Error(`Authentication failed: ${message}`),
        "AUTHENTICATION"
      ).catch(console.error);
      this.clearQRCode(); // Clear QR so new one can be generated
    });

    // Basic message handling
    this._client.on("message", async (message) => {
      try {
        const chat = await message.getChat();
        if (message.body.toLowerCase() === "estamos ready??" && !chat.isGroup) {
          await this._client!.sendMessage(message.from, "Funcionando jefe 👀");
        }
      } catch (error) {
        this.handleBotError(error, "MESSAGE_HANDLING").catch(() => {
          // Silent catch to avoid console.error lint issues
        });
      }
    });
  }

  public updatePM2Metrics(): void {
    if (process.send) {
      process.send({
        type: "process:msg",
        data: {
          botState: this._state,
          botReady: this.isReady,
          botId: BOT_ID,
          stateTimestamp: new Date().toISOString(),
          hasQR: !!this._qrCodeData,
          routesReady: this._routesInitialized,
          clientConnected: !!this._client && this.isReady,
        },
      });
    }
  }
}

const botLifecycle = new UnifiedBotLifecycle();

const app = express();
app.use(express.json());

// Log helper function
const logToFile = (file: string, message: string) => {
  const logFile = path.join(LOGS_PATH, file);
  const timestamp = new Date().toISOString();
  fs.appendFileSync(logFile, `${timestamp} - ${message}\n`);
};

// ONLY QR Code endpoint - available during initialization
app.get("/qr-code", (req, res) => {
  const qrFilePath = path.join(QR_PATH, `${BOT_ID}.json`);

  if (botLifecycle.qrCodeData) {
    res.json({
      qr: botLifecycle.qrCodeData,
      available: true,
      state: botLifecycle.state,
      botId: BOT_ID,
    });
  } else if (fs.existsSync(qrFilePath)) {
    try {
      const qrData = JSON.parse(fs.readFileSync(qrFilePath, "utf-8"));
      res.json({
        qr: qrData.qrCode,
        available: true,
        timestamp: qrData.timestamp,
        state: botLifecycle.state,
        botId: BOT_ID,
      });
    } catch (error) {
      res.status(500).json({
        error: "Error reading QR code",
        state: botLifecycle.state,
        botId: BOT_ID,
      });
    }
  } else {
    res.status(404).json({
      error: "QR code not available",
      message: botLifecycle.isReady
        ? "Bot is already authenticated"
        : "Bot is initializing",
      state: botLifecycle.state,
      botId: BOT_ID,
    });
  }
});

// Start server and initialize WhatsApp bot
const startServer = async () => {
  try {
    const server = app.listen(BOT_PORT, () => {
      console.log(`✅ ${BOT_NAME} server started on port ${BOT_PORT}`);
      console.log(`📱 QR Code endpoint: http://localhost:${BOT_PORT}/qr-code`);

      logToFile("status.log", `Server started on port ${BOT_PORT}`);

      // Initialize WhatsApp client immediately after server starts
      console.log("🚀 Starting WhatsApp client initialization...");
      botLifecycle.initializeClient();
    });

    server.on("error", (err) => {
      console.error(`❌ Server error: ${err.message}`);
      logToFile("errors.log", `Server error: ${err.message}`);
      botLifecycle.setState(
        BotLifecycleState.ERROR_UNKNOWN,
        `Server error: ${err.message}`
      );
    });

    return server;
  } catch (error) {
    console.error(`❌ Failed to start server: ${error}`);
    logToFile("errors.log", `Failed to start server: ${error}`);
    process.exit(1);
  }
};

// Graceful shutdown handlers
process.on("SIGINT", async () => {
  console.log(`🛑 Gracefully shutting down ${BOT_NAME}...`);
  logToFile("status.log", "Graceful shutdown initiated");
  botLifecycle.setState(BotLifecycleState.STOPPING, "SIGINT received");

  // Destroy WhatsApp client if it exists
  if (botLifecycle.client) {
    try {
      await botLifecycle.client.destroy();
      console.log("✅ WhatsApp client destroyed");
    } catch (error) {
      console.error("❌ Error destroying client:", error);
    }
  }

  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log(`🛑 Received SIGTERM, shutting down ${BOT_NAME}...`);
  logToFile("status.log", "SIGTERM shutdown initiated");
  botLifecycle.setState(BotLifecycleState.STOPPING, "SIGTERM received");

  // Destroy WhatsApp client if it exists
  if (botLifecycle.client) {
    try {
      await botLifecycle.client.destroy();
    } catch (error) {
      console.error("❌ Error destroying client:", error);
    }
  }

  process.exit(0);
});

// Start the server and initialize bot
startServer();

export { BOT_ID, BOT_NAME, BOT_PORT, SESSION_PATH, QR_PATH, LOGS_PATH };
