import { Request, Response } from "express";
import { ConfigService } from "../services/configService";
import axios from "axios";
import FormData from "form-data";

export class BotProxyController {
  private configService: ConfigService;

  constructor() {
    this.configService = ConfigService.getInstance();
  }

  private getBotApiUrl(botId: string): string {
    const bot = this.configService.getBotById(botId);
    if (!bot) {
      throw new Error("Bot not found");
    }

    // Check if apiHost already includes protocol
    const host = bot.apiHost;
    if (host.startsWith("http://") || host.startsWith("https://")) {
      // Extract the hostname/IP from the URL
      const url = new URL(host);
      return `${url.protocol}//${url.hostname}:${bot.apiPort}`;
    } else {
      // No protocol, add http://
      return `http://${host}:${bot.apiPort}`;
    }
  }

  private async forwardRequest(
    botId: string,
    endpoint: string,
    method: "GET" | "POST" | "PUT" | "DELETE",
    requestData?: any,
    file?: Express.Multer.File
  ) {
    const startTime = Date.now();
    let baseUrl: string;
    
    try {
      baseUrl = this.getBotApiUrl(botId);
    } catch (error) {
      console.error(`❌ [BACKEND] Bot configuration error for ${botId}:`, error);
      throw new Error(`BACKEND_ERROR: Bot ${botId} not found or misconfigured`);
    }

    const url = `${baseUrl}${endpoint}`;

    console.log(`🔄 [BACKEND] Forwarding ${method} request to bot ${botId}`);
    console.log(`📡 [BACKEND] Target URL: ${url}`);
    if (requestData) {
      console.log(`📦 [BACKEND] Request data:`, JSON.stringify(requestData, null, 2));
    }

    const config: any = {
      method,
      url,
      timeout: 30000, // 30 second timeout
    };

    if (method === "POST" || method === "PUT") {
      if (file) {
        console.log(`📁 [BACKEND] Handling file upload: ${file.originalname}`);
        // Handle multipart/form-data for file uploads
        const formData = new FormData();

        // Add all form fields
        for (const key in requestData) {
          if (Array.isArray(requestData[key])) {
            requestData[key].forEach((value: string) =>
              formData.append(`${key}[]`, value)
            );
          } else {
            formData.append(key, requestData[key]);
          }
        }

        // Add file
        formData.append("file", file.buffer, file.originalname);

        config.data = formData;
        config.headers = formData.getHeaders();
      } else {
        // Handle JSON data
        config.data = requestData;
        config.headers = {
          "Content-Type": "application/json",
        };
      }
    }

    try {
      console.log(`⏳ [BACKEND] Sending request to bot...`);
      const response = await axios(config);
      const duration = Date.now() - startTime;
      
      console.log(`✅ [BACKEND] Bot responded successfully in ${duration}ms`);
      console.log(`📤 [BACKEND] Response status: ${response.status}`);
      
      return response.data;
    } catch (error) {
      const duration = Date.now() - startTime;
      console.error(`❌ [BACKEND] Request failed after ${duration}ms`);
      
      if (axios.isAxiosError(error)) {
        if (error.response) {
          // The bot responded with an error status
          console.error(`🤖 [BOT_ERROR] Bot responded with error:`, {
            status: error.response.status,
            statusText: error.response.statusText,
            data: error.response.data,
            url: url
          });
          
          throw new Error(
            `BOT_ERROR: Bot API returned ${error.response.status} - ${JSON.stringify(error.response.data)}`
          );
        } else if (error.request) {
          // The request was made but no response was received
          console.error(`🔌 [CONNECTION_ERROR] Bot not responding:`, {
            url: url,
            timeout: config.timeout,
            code: error.code
          });
          
          throw new Error(`CONNECTION_ERROR: Cannot connect to bot at ${url} - ${error.code || 'Unknown error'}`);
        } else {
          // Something happened in setting up the request
          console.error(`⚙️ [REQUEST_SETUP_ERROR] Request configuration error:`, error.message);
          throw new Error(`REQUEST_SETUP_ERROR: ${error.message}`);
        }
      }
      
      console.error(`🔥 [UNKNOWN_ERROR] Unexpected error:`, error);
      throw new Error(`UNKNOWN_ERROR: ${error instanceof Error ? error.message : 'Unknown error occurred'}`);
    }
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
      
      const result = await this.forwardRequest(botId, "/qr-code", "GET");
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
      
      const result = await this.forwardRequest(botId, "/qr-code", "GET");
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
      
      const result = await this.forwardRequest(botId, "/status", "GET");
      res.json(result);
    } catch (error) {
      console.error("Error getting bot status:", error);
      res.status(500).json({
        error: "Failed to get bot status",
        details: error instanceof Error ? error.message : "Unknown error",
      });
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
      const result = await this.forwardRequest(
        botId,
        "/qr-code",
        "POST",
        bodyData
      );
      res.json(result);
    } catch (error) {
      console.error("Error updating bot QR code:", error);
      res.status(500).json({
        error: "Failed to update QR code",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // POST /api/bots/change-fallback-number - Change fallback number
  public async changeFallbackNumber(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { botId, ...bodyData } = req.body;
      if (!botId) {
        res.status(400).json({ error: "Bot ID is required in request body" });
        return;
      }
      const result = await this.forwardRequest(
        botId,
        "/change-fallback-number",
        "POST",
        bodyData
      );
      res.json(result);
    } catch (error) {
      console.error("Error changing fallback number:", error);
      res.status(500).json({
        error: "Failed to change fallback number",
        details: error instanceof Error ? error.message : "Unknown error",
      });
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
      const result = await this.forwardRequest(
        botId,
        "/change-port",
        "POST",
        bodyData
      );
      res.json(result);
    } catch (error) {
      console.error("Error changing port:", error);
      res.status(500).json({
        error: "Failed to change port",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // POST /api/bots/send-message - Send WhatsApp message (with automatic endpoint routing)
  public async sendMessage(req: Request, res: Response): Promise<void> {
    const requestId = Date.now();
    
    try {
      console.log(`📨 [BACKEND] Message request ${requestId} received`);
      
      const { botId, ...rawBodyData } = req.body;
      if (!botId) {
        console.error(`❌ [BACKEND] Request ${requestId}: Bot ID missing`);
        res.status(400).json({ 
          error: "VALIDATION_ERROR: Bot ID is required in request body",
          requestId,
          timestamp: new Date().toISOString()
        });
        return;
      }

      // Normalize message data and determine optimal endpoint
      const { endpoint, bodyData, messageType } = this.determineOptimalEndpoint(rawBodyData, req.file);
      
      console.log(`📋 [BACKEND] Request ${requestId} details:`, {
        botId,
        messageType,
        endpoint,
        originalData: rawBodyData,
        normalizedData: bodyData,
        hasFile: !!req.file
      });

      const result = await this.forwardRequest(
        botId,
        endpoint,
        "POST",
        bodyData,
        req.file
      );
      
      console.log(`✅ [BACKEND] Request ${requestId} completed successfully`);
      res.json({
        success: true,
        result,
        messageType,
        endpoint,
        requestId,
        timestamp: new Date().toISOString()
      });
      
    } catch (error) {
      console.error(`❌ [BACKEND] Request ${requestId} failed:`, error);
      
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      const isBackendError = errorMessage.startsWith('BACKEND_ERROR:');
      const isBotError = errorMessage.startsWith('BOT_ERROR:');
      const isConnectionError = errorMessage.startsWith('CONNECTION_ERROR:');
      const isRequestSetupError = errorMessage.startsWith('REQUEST_SETUP_ERROR:');
      
      let statusCode = 500;
      let errorType = "UNKNOWN_ERROR";
      
      if (isBackendError) {
        statusCode = 404;
        errorType = "BACKEND_ERROR";
      } else if (isBotError) {
        statusCode = 502;
        errorType = "BOT_ERROR";
      } else if (isConnectionError) {
        statusCode = 503;
        errorType = "CONNECTION_ERROR";
      } else if (isRequestSetupError) {
        statusCode = 400;
        errorType = "REQUEST_SETUP_ERROR";
      }
      
      res.status(statusCode).json({
        success: false,
        error: "Failed to send message",
        errorType,
        details: errorMessage,
        requestId,
        timestamp: new Date().toISOString(),
        troubleshooting: {
          BACKEND_ERROR: "Check bot configuration in config/bots.json",
          BOT_ERROR: "Check bot logs and WhatsApp session status",
          CONNECTION_ERROR: "Verify bot is running and accessible",
          REQUEST_SETUP_ERROR: "Check request format and parameters",
          UNKNOWN_ERROR: "Check system logs for more details"
        }[errorType]
      });
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
      const result = await this.forwardRequest(botId, "/get-groups", "GET");
      res.json(result);
    } catch (error) {
      console.error("Error getting groups:", error);
      res.status(500).json({
        error: "Failed to get groups",
        details: error instanceof Error ? error.message : "Unknown error",
      });
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
      const result = await this.forwardRequest(
        botId,
        "/pending",
        "POST",
        bodyData
      );
      res.json(result);
    } catch (error) {
      console.error("Error sending pending message:", error);
      res.status(500).json({
        error: "Failed to send pending message",
        details: error instanceof Error ? error.message : "Unknown error",
      });
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
      const result = await this.forwardRequest(
        botId,
        "/followup",
        "POST",
        bodyData
      );
      res.json(result);
    } catch (error) {
      console.error("Error sending followup message:", error);
      res.status(500).json({
        error: "Failed to send followup message",
        details: error instanceof Error ? error.message : "Unknown error",
      });
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
      const result = await this.forwardRequest(
        botId,
        "/receive-image-and-json",
        "POST",
        bodyData
      );
      res.json(result);
    } catch (error) {
      console.error("Error processing image and JSON:", error);
      res.status(500).json({
        error: "Failed to process image and JSON",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // POST /api/bots/confirmation - Send confirmation message
  public async sendConfirmationMessage(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const { botId, ...bodyData } = req.body;
      if (!botId) {
        res.status(400).json({ error: "Bot ID is required in request body" });
        return;
      }
      const result = await this.forwardRequest(
        botId,
        "/confirmation",
        "POST",
        bodyData
      );
      res.json(result);
    } catch (error) {
      console.error("Error sending confirmation message:", error);
      res.status(500).json({
        error: "Failed to send confirmation message",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // Helper method to determine optimal endpoint and normalize data (updated for attachments)
  private determineOptimalEndpoint(data: any, file?: Express.Multer.File): { endpoint: string; bodyData: any; messageType: string } {
    
    // Check if there's a file attachment
    if (file) {
      console.log(`📎 [BACKEND] File attachment detected: ${file.originalname} (${file.mimetype})`);
      
      // Determine endpoint based on file type
      const mimeType = file.mimetype.toLowerCase();
      
      if (mimeType.startsWith('image/')) {
        console.log(`🖼️ [BACKEND] IMAGE attachment → /send-image`);
        return {
          endpoint: "/send-image",
          bodyData: {
            to: this.normalizeRecipients(data),
            message: data.message || '' // Use as caption for images
          },
          messageType: "IMAGE_ATTACHMENT"
        };
      } else if (mimeType.startsWith('video/')) {
        console.log(`🎬 [BACKEND] VIDEO attachment → /send-video`);
        return {
          endpoint: "/send-video",
          bodyData: {
            to: this.normalizeRecipients(data),
            message: data.message || '' // Use as caption for videos
          },
          messageType: "VIDEO_ATTACHMENT"
        };
      } else if (mimeType.startsWith('audio/')) {
        console.log(`🎵 [BACKEND] AUDIO attachment → /send-audio`);
        return {
          endpoint: "/send-audio",
          bodyData: {
            to: this.normalizeRecipients(data),
            message: data.message || ''
          },
          messageType: "AUDIO_ATTACHMENT"
        };
      } else {
        // Everything else goes to document endpoint
        console.log(`📄 [BACKEND] DOCUMENT attachment → /send-document`);
        return {
          endpoint: "/send-document",
          bodyData: {
            to: this.normalizeRecipients(data),
            message: data.message || ''
          },
          messageType: "DOCUMENT_ATTACHMENT"
        };
      }
    }
    
    // No file attachment - use existing logic
    return this.determineTextMessageEndpoint(data);
  }

  // Helper method to normalize recipients from various input formats
  private normalizeRecipients(data: any): string[] {
    const toField = data.to || [];
    const phoneNumbers = data.phoneNumber || [];
    const groupId = data.groupId || data.group_id;
    
    // Combine all recipients into unified array
    let allRecipients: string[] = [];
    
    // Add phoneNumber(s) to recipients
    if (Array.isArray(phoneNumbers)) {
      allRecipients.push(...phoneNumbers);
    } else if (phoneNumbers) {
      allRecipients.push(phoneNumbers);
    }
    
    // Add to field to recipients  
    if (Array.isArray(toField)) {
      allRecipients.push(...toField);
    } else if (toField) {
      allRecipients.push(toField);
    }
    
    // Add groupId to recipients
    if (groupId) {
      allRecipients.push(groupId);
    }
    
    // Remove duplicates
    return [...new Set(allRecipients)];
  }

  // Helper method for text-only messages (existing logic)
  private determineTextMessageEndpoint(data: any): { endpoint: string; bodyData: any; messageType: string } {
    const allRecipients = this.normalizeRecipients(data);
    
    // Classify recipients
    const groups = allRecipients.filter(recipient => recipient.includes('@g.us'));
    const phones = allRecipients.filter(recipient => !recipient.includes('@g.us'));
    
    // Determine optimal endpoint and format data
    if (groups.length > 0 && phones.length > 0) {
      // HYBRID: Use broadcast endpoint
      console.log(`🔄 [BACKEND] HYBRID message → /send-broadcast (${phones.length} phones + ${groups.length} groups)`);
      return {
        endpoint: "/send-broadcast",
        bodyData: { 
          to: allRecipients,
          message: data.message
        },
        messageType: "HYBRID"
      };
      
    } else if (groups.length > 0) {
      // GROUP ONLY: Use group-specific endpoint
      console.log(`🏢 [BACKEND] GROUP message → /send-to-group (${groups.length} group(s))`);
      return {
        endpoint: "/send-to-group",
        bodyData: {
          groupId: groups.length === 1 ? groups[0] : groups,
          message: data.message
        },
        messageType: "GROUP"
      };
      
    } else if (phones.length >= 1) {
      // PHONE(S): Use phone-specific endpoint
      console.log(`📱 [BACKEND] PHONE message → /send-to-phone (${phones.length} phone(s))`);
      return {
        endpoint: "/send-to-phone",
        bodyData: {
          phoneNumber: phones.length === 1 ? phones[0] : phones,
          message: data.message,
          discorduserid: data.discorduserid // Pass through if exists
        },
        messageType: phones.length === 1 ? "INDIVIDUAL" : "BROADCAST"
      };
      
    } else {
      // NO VALID RECIPIENTS: Fallback to legacy endpoint
      console.warn(`⚠️ [BACKEND] UNKNOWN message → /send-message (fallback)`);
      return {
        endpoint: "/send-message",
        bodyData: data,
        messageType: "UNKNOWN"
      };
    }
  }
}
