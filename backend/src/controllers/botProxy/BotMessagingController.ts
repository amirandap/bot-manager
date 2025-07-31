import { Request, Response } from "express";
import { BotCommunicationService } from "../../services/botProxy/BotCommunicationService";
import { MessageRoutingService } from "../../services/botProxy/MessageRoutingService";
import { ErrorHandlingService } from "../../services/botProxy/ErrorHandlingService";

export interface MessageResponse {
  success: true;
  result: any;
  messageType: string;
  endpoint: string;
  requestId: number;
  timestamp: string;
}

export class BotMessagingController {
  private botCommunicationService: BotCommunicationService;
  private messageRoutingService: MessageRoutingService;
  private errorHandlingService: ErrorHandlingService;

  constructor() {
    this.botCommunicationService = new BotCommunicationService();
    this.messageRoutingService = new MessageRoutingService();
    this.errorHandlingService = new ErrorHandlingService();
  }

  // POST /api/bots/send-message - Send WhatsApp message (with automatic endpoint routing)
  public async sendMessage(req: Request, res: Response): Promise<void> {
    const requestId = Date.now();
    
    try {
      console.log(`📨 [BACKEND] Message request ${requestId} received`);
      
      const { botId, ...rawBodyData } = req.body;
      if (!botId) {
        this.errorHandlingService.handleValidationError(
          "Bot ID is required in request body", 
          requestId, 
          res
        );
        return;
      }

      // Normalize message data and determine optimal endpoint
      const { endpoint, bodyData, messageType } = this.messageRoutingService.determineOptimalEndpoint(rawBodyData, req.file);
      
      console.log(`📋 [BACKEND] Request ${requestId} details:`, {
        botId,
        messageType,
        endpoint,
        originalData: rawBodyData,
        normalizedData: bodyData,
        hasFile: !!req.file
      });

      const result = await this.botCommunicationService.forwardRequest({
        botId,
        endpoint,
        method: "POST",
        requestData: bodyData,
        file: req.file
      });
      
      console.log(`✅ [BACKEND] Request ${requestId} completed successfully`);
      
      const response: MessageResponse = {
        success: true,
        result,
        messageType,
        endpoint,
        requestId,
        timestamp: new Date().toISOString()
      };
      
      res.json(response);
      
    } catch (error) {
      this.errorHandlingService.handleError(error, requestId, res);
    }
  }

  // POST /api/bots/pending - Send pending message
  public async sendPendingMessage(req: Request, res: Response): Promise<void> {
    try {
      const { botId, ...bodyData } = req.body;
      if (!botId) {
        res.status(400).json({ error: "Bot ID is required in request body" });
        return;
      }
      const result = await this.botCommunicationService.forwardRequest({
        botId,
        endpoint: "/pending",
        method: "POST",
        requestData: bodyData
      });
      res.json(result);
    } catch (error) {
      this.errorHandlingService.handleControllerError("send pending message", error, res);
    }
  }

  // POST /api/bots/followup - Send followup message
  public async sendFollowupMessage(req: Request, res: Response): Promise<void> {
    try {
      const { botId, ...bodyData } = req.body;
      if (!botId) {
        res.status(400).json({ error: "Bot ID is required in request body" });
        return;
      }
      const result = await this.botCommunicationService.forwardRequest({
        botId,
        endpoint: "/followup",
        method: "POST",
        requestData: bodyData
      });
      res.json(result);
    } catch (error) {
      this.errorHandlingService.handleControllerError("send followup message", error, res);
    }
  }

  // POST /api/bots/receive-image-and-json - Send image with JSON data
  public async receiveImageAndJson(req: Request, res: Response): Promise<void> {
    try {
      const { botId, ...bodyData } = req.body;
      if (!botId) {
        res.status(400).json({ error: "Bot ID is required in request body" });
        return;
      }
      const result = await this.botCommunicationService.forwardRequest({
        botId,
        endpoint: "/receive-image-and-json",
        method: "POST",
        requestData: bodyData
      });
      res.json(result);
    } catch (error) {
      this.errorHandlingService.handleControllerError("process image and JSON", error, res);
    }
  }

  // POST /api/bots/confirmation - Send confirmation message
  public async sendConfirmationMessage(req: Request, res: Response): Promise<void> {
    try {
      const { botId, ...bodyData } = req.body;
      if (!botId) {
        res.status(400).json({ error: "Bot ID is required in request body" });
        return;
      }
      const result = await this.botCommunicationService.forwardRequest({
        botId,
        endpoint: "/confirmation",
        method: "POST",
        requestData: bodyData
      });
      res.json(result);
    } catch (error) {
      this.errorHandlingService.handleControllerError("send confirmation message", error, res);
    }
  }
}
