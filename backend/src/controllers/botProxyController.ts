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
    const baseUrl = this.getBotApiUrl(botId);
    const url = `${baseUrl}${endpoint}`;

    console.log(`🔄 Forwarding ${method} request to bot ${botId}`);
    console.log(`📡 Target URL: ${url}`);

    const config: any = {
      method,
      url,
      timeout: 30000, // 30 second timeout
    };

    if (method === "POST" || method === "PUT") {
      if (file) {
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
      const response = await axios(config);
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          // The bot responded with an error status
          throw new Error(
            `Bot API error (${error.response.status}): ${JSON.stringify(
              error.response.data
            )}`
          );
        } else if (error.request) {
          // The request was made but no response was received
          throw new Error(`Bot not responding: Cannot connect to ${url}`);
        } else {
          // Something happened in setting up the request
          throw new Error(`Request setup error: ${error.message}`);
        }
      }
      throw error;
    }
  }

  // POST /api/bots/status - Get bot status (using request body)
  public async getBotStatus(req: Request, res: Response): Promise<void> {
    try {
      const { botId } = req.body;
      if (!botId) {
        res.status(400).json({ error: "Bot ID is required in request body" });
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

  // GET /api/bots/:id/status - Get bot status (using route parameter)
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

  // POST /api/bots/restart - Restart bot (using request body)
  public async restartBot(req: Request, res: Response): Promise<void> {
    try {
      const { botId, ...bodyData } = req.body;
      if (!botId) {
        res.status(400).json({ error: "Bot ID is required in request body" });
        return;
      }
      const result = await this.forwardRequest(
        botId,
        "/restart",
        "POST",
        bodyData
      );
      res.json(result);
    } catch (error) {
      console.error("Error restarting bot:", error);
      res.status(500).json({
        error: "Failed to restart bot",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // POST /api/bots/:id/restart - Restart bot (using route parameter)
  public async restartBotById(req: Request, res: Response): Promise<void> {
    try {
      const botId = req.params.id;
      if (!botId) {
        res.status(400).json({ error: "Bot ID is required in URL path" });
        return;
      }
      const result = await this.forwardRequest(
        botId,
        "/restart",
        "POST",
        req.body
      );
      res.json(result);
    } catch (error) {
      console.error("Error restarting bot:", error);
      res.status(500).json({
        error: "Failed to restart bot",
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

  // POST /api/bots/:id/change-fallback-number - Change fallback number (using route parameter)
  public async changeFallbackNumberById(
    req: Request,
    res: Response
  ): Promise<void> {
    try {
      const botId = req.params.id;
      if (!botId) {
        res.status(400).json({ error: "Bot ID is required in URL path" });
        return;
      }
      const result = await this.forwardRequest(
        botId,
        "/change-fallback-number",
        "POST",
        req.body
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

    // POST /api/bots/change-port - Change bot port (using request body)
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
      console.error("Error changing bot port:", error);
      res.status(500).json({
        error: "Failed to change bot port",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // POST /api/bots/:id/change-port - Change bot port (using route parameter)
  public async changePortById(req: Request, res: Response): Promise<void> {
    try {
      const botId = req.params.id;
      if (!botId) {
        res.status(400).json({ error: "Bot ID is required in URL path" });
        return;
      }
      const result = await this.forwardRequest(
        botId,
        "/change-port",
        "POST",
        req.body
      );
      res.json(result);
    } catch (error) {
      console.error("Error changing bot port:", error);
      res.status(500).json({
        error: "Failed to change bot port",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  // POST /api/bots/send-message - Send WhatsApp message
  public async sendMessage(req: Request, res: Response): Promise<void> {
    try {
      const { botId, ...bodyData } = req.body;
      if (!botId) {
        res.status(400).json({ error: "Bot ID is required in request body" });
        return;
      }
      const result = await this.forwardRequest(
        botId,
        "/send-message",
        "POST",
        bodyData,
        req.file
      );
      res.json(result);
    } catch (error) {
      console.error("Error sending message:", error);
      res.status(500).json({
        error: "Failed to send message",
        details: error instanceof Error ? error.message : "Unknown error",
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
}
