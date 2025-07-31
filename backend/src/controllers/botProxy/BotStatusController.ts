import { Request, Response } from "express";
import { BotCommunicationService } from "../../services/botProxy/BotCommunicationService";
import { ErrorHandlingService } from "../../services/botProxy/ErrorHandlingService";

export class BotStatusController {
  private botCommunicationService: BotCommunicationService;
  private errorHandlingService: ErrorHandlingService;

  constructor() {
    this.botCommunicationService = new BotCommunicationService();
    this.errorHandlingService = new ErrorHandlingService();
  }

  // GET/POST /api/bots/qr-code - Get QR code (returns HTML)
  public async getBotQRCode(req: Request, res: Response): Promise<void> {
    try {
      // Support both GET (query parameter) and POST (request body)
      const botId = req.method === 'GET' ? req.query.botId as string : req.body.botId;
      
      if (!botId) {
        const errorMessage = req.method === 'GET' 
          ? "Bot ID is required as query parameter (?botId=your-bot-id)" 
          : "Bot ID is required in request body";
        res.status(400).json({ error: errorMessage });
        return;
      }
      
      const result = await this.botCommunicationService.forwardRequest({
        botId,
        endpoint: "/qr-code",
        method: "GET"
      });
      res.send(result); // Send HTML directly
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
      
      const result = await this.botCommunicationService.forwardRequest({
        botId,
        endpoint: "/qr-code",
        method: "GET"
      });
      res.send(result); // Send HTML directly
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

  // GET /api/bots/:id/status - Get bot status using route parameter
  public async getBotStatusById(req: Request, res: Response): Promise<void> {
    try {
      const botId = req.params.id;
      
      if (!botId) {
        res.status(400).json({ error: "Bot ID is required in URL path" });
        return;
      }
      
      const result = await this.botCommunicationService.forwardRequest({
        botId,
        endpoint: "/status",
        method: "GET"
      });
      res.json(result);
    } catch (error) {
      this.errorHandlingService.handleControllerError("get bot status", error, res);
    }
  }

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
        requestData: bodyData
      });
      res.json(result);
    } catch (error) {
      this.errorHandlingService.handleControllerError("update QR code", error, res);
    }
  }
}
