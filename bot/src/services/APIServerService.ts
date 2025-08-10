/**
 * API Server Service
 * Handles Express server setup, routes, and middleware configuration
 */

import express from "express";
import { Logger } from "./Logger";

interface BotConfig {
  BOT_ID: string;
  BOT_NAME: string;
  BOT_PORT: number;
}

interface StatusProvider {
  getStatus(): any;
}

interface QRProvider {
  hasQRCode(): boolean;
  getQRCode(): string | null;
  getQRStatus(): any;
}

export class APIServerService {
  private app: express.Application;
  private server: any = null;

  constructor(
    private config: BotConfig,
    private logger: Logger,
    private statusProvider: StatusProvider,
    private qrProvider: QRProvider
  ) {
    this.app = express();
  }

  public async setupAPI(): Promise<any> {
    // Import routes only when needed
    const messageRoutes = (await import("../routes/unified/messageRoutes")).default;
    const getGroupsRouter = (await import("../routes/getGroups")).default;
    const { addRequestId, logRequest } = await import("../middleware/botMiddleware");

    // Basic middleware
    this.app.use(express.json());
    this.app.use(addRequestId);
    this.app.use(logRequest);

    // API routes
    this.app.use("/", messageRoutes);
    this.app.use("/get-groups", getGroupsRouter);

    // Status endpoints
    this.setupStatusEndpoints();

    return this.app;
  }

  private setupStatusEndpoints(): void {
    // QR Code endpoint
    this.app.get("/qr-code", (req, res) => {
      try {
        const qrStatus = this.qrProvider.getQRStatus();
        const status = this.statusProvider.getStatus();
        
        if (this.qrProvider.hasQRCode()) {
          res.json({
            success: true,
            qrCode: this.qrProvider.getQRCode(),
            message: "QR code ready for scanning",
            ...qrStatus,
            ...status,
          });
        } else {
          res.json({
            success: false,
            message: status.stateDescription || "QR code not available",
            ...qrStatus,
            ...status,
          });
        }
      } catch (error) {
        this.logger.error(`Error in QR endpoint: ${error}`);
        res.status(500).json({
          success: false,
          message: "Internal server error",
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    });

    // Status endpoint
    this.app.get("/status", (req, res) => {
      try {
        const status = this.statusProvider.getStatus();
        res.json(status);
      } catch (error) {
        this.logger.error(`Error in status endpoint: ${error}`);
        res.status(500).json({
          success: false,
          message: "Internal server error",
          error: error instanceof Error ? error.message : "Unknown error"
        });
      }
    });

    // Health check endpoint
    this.app.get("/health", (req, res) => {
      res.json({
        status: "healthy",
        timestamp: new Date().toISOString(),
        botId: this.config.BOT_ID,
        botName: this.config.BOT_NAME
      });
    });
  }

  public async startServer(): Promise<any> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.config.BOT_PORT, () => {
          this.logger.success(`✅ ${this.config.BOT_NAME} API server started on port ${this.config.BOT_PORT}`);
          this.logger.info(`📊 Status: http://localhost:${this.config.BOT_PORT}/status`);
          this.logger.info(`📱 QR Code: http://localhost:${this.config.BOT_PORT}/qr-code`);
          this.logger.info(`💚 Health: http://localhost:${this.config.BOT_PORT}/health`);
          resolve(this.server);
        });

        this.server.on('error', (error: Error) => {
          this.logger.error(`Server error: ${error}`);
          reject(error);
        });
      } catch (error) {
        this.logger.error(`Failed to start server: ${error}`);
        reject(error);
      }
    });
  }

  public async shutdown(): Promise<void> {
    if (this.server) {
      return new Promise((resolve) => {
        this.server.close(() => {
          this.logger.info("API server shutdown complete", "✅");
          resolve();
        });
      });
    }
  }

  public getApp(): express.Application {
    return this.app;
  }
}
