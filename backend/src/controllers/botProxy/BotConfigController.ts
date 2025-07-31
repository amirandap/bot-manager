import { Request, Response } from "express";
import { BotCommunicationService } from "../../services/botProxy/BotCommunicationService";
import { ErrorHandlingService } from "../../services/botProxy/ErrorHandlingService";

export class BotConfigController {
  private botCommunicationService: BotCommunicationService;
  private errorHandlingService: ErrorHandlingService;

  constructor() {
    this.botCommunicationService = new BotCommunicationService();
    this.errorHandlingService = new ErrorHandlingService();
  }

  // POST /api/bots/change-fallback-number - Change fallback number
  public async changeFallbackNumber(req: Request, res: Response): Promise<void> {
    try {
      const { botId, ...bodyData } = req.body;
      if (!botId) {
        res.status(400).json({ error: "Bot ID is required in request body" });
        return;
      }
      const result = await this.botCommunicationService.forwardRequest({
        botId,
        endpoint: "/change-fallback-number",
        method: "POST",
        requestData: bodyData
      });
      res.json(result);
    } catch (error) {
      this.errorHandlingService.handleControllerError("change fallback number", error, res);
    }
  }

  // POST /api/bots/change-port - Change bot port
  public async changePort(req: Request, res: Response): Promise<void> {
    try {
      const { botId, ...bodyData } = req.body;
      if (!botId) {
        res.status(400).json({ error: "Bot ID is required in request body" });
        return;
      }
      const result = await this.botCommunicationService.forwardRequest({
        botId,
        endpoint: "/change-port",
        method: "POST",
        requestData: bodyData
      });
      res.json(result);
    } catch (error) {
      this.errorHandlingService.handleControllerError("change port", error, res);
    }
  }

  // POST /api/bots/get-groups - Get WhatsApp groups
  public async getGroups(req: Request, res: Response): Promise<void> {
    try {
      const { botId } = req.body;
      if (!botId) {
        res.status(400).json({ error: "Bot ID is required in request body" });
        return;
      }
      const result = await this.botCommunicationService.forwardRequest({
        botId,
        endpoint: "/get-groups",
        method: "GET"
      });
      res.json(result);
    } catch (error) {
      this.errorHandlingService.handleControllerError("get groups", error, res);
    }
  }
}
