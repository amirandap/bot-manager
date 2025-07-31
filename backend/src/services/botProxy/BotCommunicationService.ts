import axios from "axios";
import FormData = require("form-data");
import { ConfigService } from "../configService";

export interface ForwardRequestOptions {
  botId: string;
  endpoint: string;
  method: "GET" | "POST" | "PUT" | "DELETE";
  requestData?: any;
  file?: Express.Multer.File;
}

export class BotCommunicationService {
  private configService: ConfigService;

  constructor() {
    this.configService = ConfigService.getInstance();
  }

  /**
   * Get the complete API URL for a bot
   */
  public getBotApiUrl(botId: string): string {
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

  /**
   * Forward a request to a bot's API endpoint
   */
  public async forwardRequest(options: ForwardRequestOptions): Promise<any> {
    const { botId, endpoint, method, requestData, file } = options;
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
}
