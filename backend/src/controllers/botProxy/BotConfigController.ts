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

  // POST /api/bots/add-to-group - Add contacts to WhatsApp group
  public async addToGroup(req: Request, res: Response): Promise<void> {
    try {
      const { botId, groupName, participants, groupId } = req.body;
      
      if (!botId) {
        res.status(400).json({ error: "Bot ID is required in request body" });
        return;
      }
      
      if (!groupName && !groupId) {
        res.status(400).json({ error: "Either groupName or groupId is required" });
        return;
      }
      
      if (!participants || !Array.isArray(participants) || participants.length === 0) {
        res.status(400).json({ error: "Participants array is required and must not be empty" });
        return;
      }

      const requestData = {
        groupName,
        groupId,
        participants
      };

      const result = await this.botCommunicationService.forwardRequest({
        botId,
        endpoint: "/add-to-group",
        method: "POST",
        requestData
      });
      
      res.json(result);
    } catch (error) {
      this.errorHandlingService.handleControllerError("add to group", error, res);
    }
  }

  // POST /api/bots/verify-number - Verify WhatsApp number
  public async verifyWhatsAppNumber(req: Request, res: Response): Promise<void> {
    try {
      const { phoneNumber } = req.body;
      
      if (!phoneNumber) {
        res.status(400).json({ error: "Phone number is required in request body" });
        return;
      }

      // Auto-select the first available bot if no botId is provided
      let { botId } = req.body;
      
      if (!botId) {
        // Import bot configuration service to get available bots
        const { ConfigService } = await import("../../services/configService");
        const configService = ConfigService.getInstance();
        const config = configService.loadConfig();
        
        const availableBots = config.bots.filter((bot: any) => bot.enabled && bot.status === 'online');
        
        if (availableBots.length === 0) {
          res.status(503).json({ 
            error: "No available bots for verification",
            details: "All bots are offline or disabled"
          });
          return;
        }
        
        botId = availableBots[0].id;
        console.log(`Auto-selected bot ${botId} for number verification`);
      }

      const requestData = { phoneNumber };

      const result = await this.botCommunicationService.forwardRequest({
        botId,
        endpoint: "/verify-number",
        method: "POST",
        requestData
      });
      
      res.json(result);
    } catch (error) {
      this.errorHandlingService.handleControllerError("verify WhatsApp number", error, res);
    }
  }
}
