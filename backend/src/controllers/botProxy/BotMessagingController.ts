import { Request, Response } from "express";
import { BotCommunicationService } from "../../services/botProxy/BotCommunicationService";
import { MessageRoutingService } from "../../services/botProxy/MessageRoutingService";
import { ErrorHandlingService } from "../../services/botProxy/ErrorHandlingService";
import { contactMappingService } from "../../services/ContactMappingService";

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

      const { botId, imageUrl, externalid, externalsource, ...rawBodyData } = req.body;
      if (!botId) {
        this.errorHandlingService.handleValidationError(
          "Bot ID is required in request body",
          requestId,
          res
        );
        return;
      }

      // Handle external ID lookup if provided
      let processedBodyData = { ...rawBodyData };
      
      if (externalid && externalsource) {
        console.log(`🔍 [BACKEND] External lookup requested: ${externalsource} -> ${externalid}`);
        
        try {
          const lookupResult = contactMappingService.lookupPhoneNumber(externalsource, externalid);
          
          if (lookupResult.found && lookupResult.phonenumber) {
            console.log(`✅ [BACKEND] External contact found: ${externalid} -> ${lookupResult.phonenumber}`);
            
            // Override the 'to' field with the found phone number
            processedBodyData.to = lookupResult.phonenumber;
            
            console.log(`📞 [BACKEND] Phone number resolved from external ID: ${lookupResult.phonenumber}`);
          } else {
            console.log(`❌ [BACKEND] External contact not found: ${externalsource} -> ${externalid}`);
            this.errorHandlingService.handleValidationError(
              `Contact not found for external ID: ${externalsource}:${externalid}. Please ensure the mapping exists in the contact database.`,
              requestId,
              res
            );
            return;
          }
        } catch (lookupError) {
          console.error(`❌ [BACKEND] Error during external lookup:`, lookupError);
          this.errorHandlingService.handleValidationError(
            `Failed to lookup external contact: ${lookupError instanceof Error ? lookupError.message : 'Unknown error'}`,
            requestId,
            res
          );
          return;
        }
      } else if (externalid || externalsource) {
        // If only one is provided, it's an error
        this.errorHandlingService.handleValidationError(
          "Both 'externalid' and 'externalsource' must be provided together for external contact lookup",
          requestId,
          res
        );
        return;
      }

      // Validate that we have a 'to' field (either original or from lookup)
      if (!processedBodyData.to) {
        this.errorHandlingService.handleValidationError(
          "Either 'to' field or both 'externalid' and 'externalsource' must be provided",
          requestId,
          res
        );
        return;
      }

      // Handle imageUrl by downloading the image
      let processedFile = req.file;
      if (imageUrl && !req.file) {
        try {
          console.log(`🌐 [BACKEND] Downloading image from URL: ${imageUrl}`);
          const response = await fetch(imageUrl);
          
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          const arrayBuffer = await response.arrayBuffer();
          const buffer = Buffer.from(arrayBuffer);
          const contentType = response.headers.get('content-type') || 'image/jpeg';
          
          // Extract filename from URL or use default
          const urlPath = new URL(imageUrl).pathname;
          const filename = urlPath.split('/').pop() || 'image.jpg';
          
          // Create a mock file object similar to multer
          processedFile = {
            fieldname: 'file',
            originalname: filename,
            encoding: '7bit',
            mimetype: contentType,
            size: buffer.length,
            buffer: buffer
          } as Express.Multer.File;
          
          console.log(`✅ [BACKEND] Image downloaded: ${filename} (${buffer.length} bytes)`);
        } catch (error) {
          console.error(`❌ [BACKEND] Failed to download image from ${imageUrl}:`, error);
          this.errorHandlingService.handleValidationError(
            `Failed to download image from URL: ${error instanceof Error ? error.message : 'Unknown error'}`,
            requestId,
            res
          );
          return;
        }
      }

      // Normalize message data and determine optimal endpoint
      const { endpoint, bodyData, messageType } =
        this.messageRoutingService.determineOptimalEndpoint(
          processedBodyData,
          processedFile
        );

      console.log(`📋 [BACKEND] Request ${requestId} details:`, {
        botId,
        messageType,
        endpoint,
        originalData: rawBodyData,
        normalizedData: bodyData,
        hasFile: !!processedFile,
        imageUrl: imageUrl || undefined,
        externalLookup: externalid && externalsource ? { externalsource, externalid, resolvedTo: processedBodyData.to } : undefined,
      });

      const result = await this.botCommunicationService.forwardRequest({
        botId,
        endpoint,
        method: "POST",
        requestData: bodyData,
        file: processedFile,
      });

      console.log(`✅ [BACKEND] Request ${requestId} completed successfully`);

      const response: MessageResponse = {
        success: true,
        result,
        messageType,
        endpoint,
        requestId,
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      this.errorHandlingService.handleError(error, requestId, res);
    }
  }

  // POST /api/bots/pending - Send pending message (redirected to unified system)
  public async sendPendingMessage(req: Request, res: Response): Promise<void> {
    const requestId = Date.now();

    try {
      console.log(
        `📨 [BACKEND] Legacy pending request ${requestId} - redirecting to unified system`
      );

      const { botId, ...rawBodyData } = req.body;
      if (!botId) {
        this.errorHandlingService.handleValidationError(
          "Bot ID is required in request body",
          requestId,
          res
        );
        return;
      }

      // Add a default message if none provided
      if (!rawBodyData.message) {
        rawBodyData.message = "Your request is being processed. Please wait...";
      }

      // Use unified routing system
      const { endpoint, bodyData, messageType } =
        this.messageRoutingService.determineOptimalEndpoint(
          rawBodyData,
          req.file
        );

      console.log(
        `📋 [BACKEND] Pending request ${requestId} redirected to: ${endpoint}`
      );

      const result = await this.botCommunicationService.forwardRequest({
        botId,
        endpoint,
        method: "POST",
        requestData: bodyData,
        file: req.file,
      });

      const response: MessageResponse = {
        success: true,
        result,
        messageType: "PENDING_" + messageType,
        endpoint,
        requestId,
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      this.errorHandlingService.handleError(error, requestId, res);
    }
  }

  // POST /api/bots/followup - Send followup message (redirected to unified system)
  public async sendFollowupMessage(req: Request, res: Response): Promise<void> {
    const requestId = Date.now();

    try {
      console.log(
        `📨 [BACKEND] Legacy followup request ${requestId} - redirecting to unified system`
      );

      const { botId, ...rawBodyData } = req.body;
      if (!botId) {
        this.errorHandlingService.handleValidationError(
          "Bot ID is required in request body",
          requestId,
          res
        );
        return;
      }

      // Add a default followup message if none provided
      if (!rawBodyData.message) {
        rawBodyData.message = "Following up on your previous request...";
      }

      // Use unified routing system
      const { endpoint, bodyData, messageType } =
        this.messageRoutingService.determineOptimalEndpoint(
          rawBodyData,
          req.file
        );

      console.log(
        `📋 [BACKEND] Followup request ${requestId} redirected to: ${endpoint}`
      );

      const result = await this.botCommunicationService.forwardRequest({
        botId,
        endpoint,
        method: "POST",
        requestData: bodyData,
        file: req.file,
      });

      const response: MessageResponse = {
        success: true,
        result,
        messageType: "FOLLOWUP_" + messageType,
        endpoint,
        requestId,
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      this.errorHandlingService.handleError(error, requestId, res);
    }
  }

  // POST /api/bots/receive-image-and-json - Send image with JSON data (redirected to unified system)
  public async receiveImageAndJson(req: Request, res: Response): Promise<void> {
    const requestId = Date.now();

    try {
      console.log(
        `📨 [BACKEND] Legacy image+JSON request ${requestId} - redirecting to unified system`
      );

      const { botId, imageUrl, data, ...rawBodyData } = req.body;
      if (!botId) {
        this.errorHandlingService.handleValidationError(
          "Bot ID is required in request body",
          requestId,
          res
        );
        return;
      }

      // Handle image URL or attachment
      let processedData = { ...rawBodyData };

      if (imageUrl) {
        // If imageUrl is provided, add it to the message
        processedData.message = `Image: ${imageUrl}${
          data ? `\nData: ${JSON.stringify(data)}` : ""
        }`;
      } else if (data) {
        // If only JSON data is provided
        processedData.message = `Data: ${JSON.stringify(data)}`;
      }

      // Use unified routing system - this will handle file attachments automatically
      const { endpoint, bodyData, messageType } =
        this.messageRoutingService.determineOptimalEndpoint(
          processedData,
          req.file
        );

      console.log(
        `📋 [BACKEND] Image+JSON request ${requestId} redirected to: ${endpoint}`
      );

      const result = await this.botCommunicationService.forwardRequest({
        botId,
        endpoint,
        method: "POST",
        requestData: bodyData,
        file: req.file,
      });

      const response: MessageResponse = {
        success: true,
        result,
        messageType: "IMAGE_JSON_" + messageType,
        endpoint,
        requestId,
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      this.errorHandlingService.handleError(error, requestId, res);
    }
  }

  // POST /api/bots/confirmation - Send confirmation message (redirected to unified system)
  public async sendConfirmationMessage(
    req: Request,
    res: Response
  ): Promise<void> {
    const requestId = Date.now();

    try {
      console.log(
        `📨 [BACKEND] Legacy confirmation request ${requestId} - redirecting to unified system`
      );

      const { botId, ...rawBodyData } = req.body;
      if (!botId) {
        this.errorHandlingService.handleValidationError(
          "Bot ID is required in request body",
          requestId,
          res
        );
        return;
      }

      // Confirmation messages should have explicit content
      if (!rawBodyData.message) {
        this.errorHandlingService.handleValidationError(
          "Message is required for confirmation",
          requestId,
          res
        );
        return;
      }

      // Use unified routing system
      const { endpoint, bodyData, messageType } =
        this.messageRoutingService.determineOptimalEndpoint(
          rawBodyData,
          req.file
        );

      console.log(
        `📋 [BACKEND] Confirmation request ${requestId} redirected to: ${endpoint}`
      );

      const result = await this.botCommunicationService.forwardRequest({
        botId,
        endpoint,
        method: "POST",
        requestData: bodyData,
        file: req.file,
      });

      const response: MessageResponse = {
        success: true,
        result,
        messageType: "CONFIRMATION_" + messageType,
        endpoint,
        requestId,
        timestamp: new Date().toISOString(),
      };

      res.json(response);
    } catch (error) {
      this.errorHandlingService.handleError(error, requestId, res);
    }
  }
}
