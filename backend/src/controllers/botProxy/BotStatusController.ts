import { Request, Response } from "express";
import { BotCommunicationService } from "../../services/botProxy/BotCommunicationService";
import { ErrorHandlingService } from "../../services/botProxy/ErrorHandlingService";
import { QRCodeService } from "../../services/QRCodeService";
import { ConfigService } from "../../services/configService";
import { BotService } from "../../services/botService";
import { pm2MetricsService } from "../../services/PM2MetricsService";

export class BotStatusController {
  private botCommunicationService: BotCommunicationService;
  private errorHandlingService: ErrorHandlingService;
  private qrCodeService: QRCodeService;
  private configService: ConfigService;
  private botService: BotService;

  constructor() {
    this.botCommunicationService = new BotCommunicationService();
    this.errorHandlingService = new ErrorHandlingService();
    this.qrCodeService = new QRCodeService();
    this.configService = ConfigService.getInstance();
    this.botService = new BotService();
  }

  // GET/POST /api/bots/qr-code - Get QR code (returns HTML)
  public async getBotQRCode(req: Request, res: Response): Promise<void> {
    try {
      // Support both GET (query parameter) and POST (request body)
      const botId =
        req.method === "GET" ? (req.query.botId as string) : req.body.botId;

      if (!botId) {
        const errorMessage =
          req.method === "GET"
            ? "Bot ID is required as query parameter (?botId=your-bot-id)"
            : "Bot ID is required in request body";
        res.status(400).json({ error: errorMessage });
        return;
      }

      // Validate bot exists in configuration
      const botConfig = this.configService.getBotById(botId);
      if (!botConfig) {
        res.status(404).send(`
          <h1>Bot Not Found</h1>
          <p>Bot with ID <strong>${botId}</strong> was not found in the configuration.</p>
        `);
        return;
      }

      // Generate HTML response with QR code from data directory
      const htmlContent = this.qrCodeService.generateQRCodeHTML(
        botId,
        botConfig.name
      );

      // Set appropriate headers for HTML content
      res.set("Content-Type", "text/html; charset=utf-8");
      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
      res.set("Pragma", "no-cache");
      res.set("Expires", "0");

      res.status(200).send(htmlContent);
    } catch (error) {
      console.error("Error getting bot QR code:", error);
      res
        .status(500)
        .send(
          `<h1>Error loading QR code</h1><p>${
            error instanceof Error ? error.message : "Unknown error"
          }</p>`
        );
    }
  }

  // GET /api/bots/:id/qr-code - Get QR code using route parameter (returns HTML)
  public async getBotQRCodeById(req: Request, res: Response): Promise<void> {
    try {
      const botId = req.params.id;

      if (!botId) {
        res.status(400).json({ error: "Bot ID is required in URL path" });
        return;
      }

      // Validate bot exists in configuration
      const botConfig = this.configService.getBotById(botId);
      if (!botConfig) {
        res.status(404).send(`
          <h1>Bot Not Found</h1>
          <p>Bot with ID <strong>${botId}</strong> was not found in the configuration.</p>
        `);
        return;
      }

      // Generate HTML response with QR code from data directory
      const htmlContent = this.qrCodeService.generateQRCodeHTML(
        botId,
        botConfig.name
      );

      // Set appropriate headers for HTML content
      res.set("Content-Type", "text/html; charset=utf-8");
      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
      res.set("Pragma", "no-cache");
      res.set("Expires", "0");

      res.status(200).send(htmlContent);
    } catch (error) {
      console.error("Error getting bot QR code:", error);
      res
        .status(500)
        .send(
          `<h1>Error loading QR code</h1><p>${
            error instanceof Error ? error.message : "Unknown error"
          }</p>`
        );
    }
  }

  // GET /api/bots/:id/qr-code/image - Get QR code image (returns raw PNG)
  public async getBotQRCodeImage(req: Request, res: Response): Promise<void> {
    try {
      const botId = req.params.id;

      if (!botId) {
        res.status(400).json({ error: "Bot ID is required in URL path" });
        return;
      }

      // Validate bot exists in configuration
      const botConfig = this.configService.getBotById(botId);
      if (!botConfig) {
        res.status(404).json({
          error: "Bot not found",
          botId: botId,
        });
        return;
      }

      // Get QR code buffer from data directory
      const { buffer, status } = this.qrCodeService.getQRCodeBuffer(botId);

      if (!buffer || !status.available) {
        res.status(404).json({
          error: "QR code not available",
          botId: botId,
          status: status,
        });
        return;
      }

      // Set appropriate headers for PNG image
      res.set("Content-Type", "image/png");
      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
      res.set("Pragma", "no-cache");
      res.set("Expires", "0");
      res.set("Content-Disposition", `inline; filename="qr-${botId}.png"`);

      res.status(200).send(buffer);
    } catch (error) {
      console.error("Error getting bot QR code image:", error);
      res.status(500).json({
        error: "Failed to get QR code image",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // GET /api/bots/:id/qr-code/status - Get QR code status (returns JSON)
  public async getBotQRCodeStatus(req: Request, res: Response): Promise<void> {
    try {
      const botId = req.params.id;

      if (!botId) {
        res.status(400).json({ error: "Bot ID is required in URL path" });
        return;
      }

      // Validate bot exists in configuration
      const botConfig = this.configService.getBotById(botId);
      if (!botConfig) {
        res.status(404).json({
          error: "Bot not found",
          botId: botId,
        });
        return;
      }

      // Get QR code status from data directory
      const qrStatus = this.qrCodeService.getQRCodeStatus(botId);

      // Get bot status via PM2 metrics to include WhatsApp status
      let whatsappStatus: string | undefined;
      let botStatus: string | undefined;
      
      try {
        const botService = new (await import("../../services/botService")).BotService();
        const pm2Status = await botService.getBotStatusViaMetrics(botId);
        
        if (pm2Status?.pm2) {
          whatsappStatus = pm2Status.pm2.whatsappStatus;
          botStatus = pm2Status.pm2.status;
        }
      } catch (pm2Error) {
        console.log(`Could not get PM2 status for bot ${botId}:`, pm2Error);
        // Not a critical error, continue without PM2 status
      }

      res.json({
        botId: botId,
        botName: botConfig.name,
        qrCode: qrStatus,
        whatsappStatus,
        botStatus,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("Error getting bot QR code status:", error);
      res.status(500).json({
        error: "Failed to get QR code status",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // GET /api/bots/:id/status - Get bot status using route parameter
  // POST /api/bots/qr-code/update - Update QR code (internal use)
  public async updateBotQRCode(req: Request, res: Response): Promise<void> {
    try {
      const { botId, ...bodyData } = req.body;
      if (!botId) {
        res.status(400).json({ error: "Bot ID is required in request body" });
        return;
      }
      const result = await this.botCommunicationService.forwardRequest({
        botId,
        endpoint: "/qr-code",
        method: "POST",
        requestData: bodyData,
      });
      res.json(result);
    } catch (error) {
      this.errorHandlingService.handleControllerError(
        "update QR code",
        error,
        res
      );
    }
  }

  // 🚀 NEW ENDPOINTS: PM2 Metrics-based status (replaces deprecated API calls)

  /**
   * GET /api/bots/:botId/status/metrics - Get bot status via PM2 metrics
   */
  public async getBotStatusViaMetrics(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { botId } = req.params;

      if (!botId) {
        res.status(400).json({ error: "Bot ID is required" });
        return;
      }

      console.log(`📊 Getting PM2-based status for bot: ${botId}`);

      const status = await this.botService.getBotStatusViaMetrics(botId);

      if (!status) {
        res.status(404).json({ error: "Bot not found" });
        return;
      }

      res.json({
        success: true,
        botId,
        status,
        source: "pm2-metrics",
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ Error getting bot status via metrics:", error);
      this.errorHandlingService.handleControllerError(
        "get bot status via metrics",
        error,
        res
      );
    }
  }

  /**
   * GET /api/bots/:botId/metrics - Get raw PM2 metrics for a bot
   */
  public async getBotPM2Metrics(req: Request, res: Response): Promise<void> {
    try {
      const { botId } = req.params;

      if (!botId) {
        res.status(400).json({ error: "Bot ID is required" });
        return;
      }

      const bot = this.configService.getBotById(botId);
      if (!bot) {
        res.status(404).json({ error: "Bot not found" });
        return;
      }

      if (bot.isExternal) {
        res.status(400).json({
          error: "PM2 metrics not available for external bots",
          botId,
          isExternal: true,
        });
        return;
      }

      const pm2ProcessId = bot.pm2ServiceId || bot.id;
      console.log(`📊 Getting raw PM2 metrics for process: ${pm2ProcessId}`);

      const metrics = await pm2MetricsService.getProcessMetrics(pm2ProcessId);

      if (!metrics) {
        res.status(404).json({
          error: "PM2 process not found",
          pm2ProcessId,
        });
        return;
      }

      const health = pm2MetricsService.evaluateProcessHealth(metrics);

      res.json({
        success: true,
        botId,
        pm2ProcessId,
        metrics,
        health,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ Error getting PM2 metrics:", error);
      this.errorHandlingService.handleControllerError(
        "get PM2 metrics",
        error,
        res
      );
    }
  }

  /**
   * GET /api/bots/metrics/all - Get PM2 metrics for all managed processes
   */
  public async getAllPM2Metrics(req: Request, res: Response): Promise<void> {
    try {
      console.log("📊 Getting PM2 metrics for all processes");

      const allMetrics = await pm2MetricsService.getAllProcessesMetrics();

      const results = allMetrics.map((metrics) => ({
        processName: metrics.name,
        metrics,
        health: pm2MetricsService.evaluateProcessHealth(metrics),
      }));

      res.json({
        success: true,
        processCount: results.length,
        processes: results,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ Error getting all PM2 metrics:", error);
      this.errorHandlingService.handleControllerError(
        "get all PM2 metrics",
        error,
        res
      );
    }
  }

  /**
   * GET /api/bots/:botId/health - Get bot health evaluation
   */
  public async getBotHealth(req: Request, res: Response): Promise<void> {
    try {
      const { botId } = req.params;

      if (!botId) {
        res.status(400).json({ error: "Bot ID is required" });
        return;
      }

      const bot = this.configService.getBotById(botId);
      if (!bot) {
        res.status(404).json({ error: "Bot not found" });
        return;
      }

      if (bot.isExternal) {
        res.status(400).json({
          error: "Health metrics not available for external bots",
          botId,
          isExternal: true,
          suggestion: "Use /api/bots/:botId/status for external bots",
        });
        return;
      }

      const pm2ProcessId = bot.pm2ServiceId || bot.id;
      const metrics = await pm2MetricsService.getProcessMetrics(pm2ProcessId);

      if (!metrics) {
        res.status(404).json({
          error: "PM2 process not found",
          pm2ProcessId,
        });
        return;
      }

      const health = pm2MetricsService.evaluateProcessHealth(metrics);

      res.json({
        success: true,
        botId,
        pm2ProcessId,
        health: {
          ...health,
          processStatus: metrics.status,
          uptime: metrics.uptime,
          memoryUsage: metrics.memory,
          cpuUsage: metrics.cpu,
          restartCount: metrics.restarts,
        },
        recommendations: this.generateHealthRecommendations(health, metrics),
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error("❌ Error getting bot health:", error);
      this.errorHandlingService.handleControllerError(
        "get bot health",
        error,
        res
      );
    }
  }

  /**
   * Helper method to generate health recommendations
   */
  private generateHealthRecommendations(health: any, metrics: any): string[] {
    const recommendations: string[] = [];

    if (health.score < 70) {
      recommendations.push("Consider restarting the bot process");
    }

    if (metrics.memory && metrics.memory > 512) {
      recommendations.push(
        "Monitor memory usage - consider increasing available memory"
      );
    }

    if (metrics.restarts && metrics.restarts > 5) {
      recommendations.push("Investigate cause of frequent restarts");
    }

    if (metrics.errorCount && metrics.errorCount > 0) {
      recommendations.push("Check logs for error details");
    }

    if (metrics.heapUsage && metrics.heapUsage > 85) {
      recommendations.push("High heap usage detected - possible memory leak");
    }

    if (health.status === "critical") {
      recommendations.push(
        "Immediate attention required - bot may be non-functional"
      );
    }

    if (recommendations.length === 0) {
      recommendations.push("Bot is running optimally");
    }

    return recommendations;
  }
}
