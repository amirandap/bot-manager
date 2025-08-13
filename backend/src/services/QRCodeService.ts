import * as fs from "fs";
import * as path from "path";

/**
 * QR Code Service - Backend QR Code Management
 * Serves QR codes directly from the bot's data directory
 */
export class QRCodeService {
  private readonly qrCodesPath: string;

  constructor() {
    // Path to the shared data directory where bots store QR codes
    this.qrCodesPath = path.join(__dirname, "../../../data/qr-codes");
  }

  /**
   * Get QR code file path for a specific bot
   */
  private getQRCodePath(botId: string): string {
    return path.join(this.qrCodesPath, `${botId}.png`);
  }

  /**
   * Check if QR code exists for a bot
   */
  public hasQRCode(botId: string): boolean {
    const qrPath = this.getQRCodePath(botId);
    return fs.existsSync(qrPath);
  }

  /**
   * Get QR code file stats (creation time, etc.)
   */
  public getQRCodeStats(botId: string): fs.Stats | null {
    try {
      const qrPath = this.getQRCodePath(botId);
      if (fs.existsSync(qrPath)) {
        return fs.statSync(qrPath);
      }
      return null;
    } catch (error) {
      console.error(`Error getting QR code stats for bot ${botId}:`, error);
      return null;
    }
  }

  /**
   * Get QR code file path if it exists
   */
  public getQRCodeFilePath(botId: string): string | null {
    const qrPath = this.getQRCodePath(botId);
    return fs.existsSync(qrPath) ? qrPath : null;
  }

  /**
   * Get QR code status for a bot
   */
  public getQRCodeStatus(botId: string): {
    available: boolean;
    filePath?: string;
    createdAt?: Date;
    ageMinutes?: number;
    expired?: boolean;
  } {
    const qrPath = this.getQRCodePath(botId);

    if (!fs.existsSync(qrPath)) {
      return { available: false };
    }

    try {
      const stats = fs.statSync(qrPath);
      const createdAt = stats.birthtime;
      const ageMinutes = (Date.now() - createdAt.getTime()) / (1000 * 60);
      const expired = ageMinutes > 2; // QR codes typically expire after 2 minutes

      return {
        available: true,
        filePath: qrPath,
        createdAt,
        ageMinutes,
        expired,
      };
    } catch (error) {
      console.error(`Error reading QR code file for bot ${botId}:`, error);
      return { available: false };
    }
  }

  /**
   * Generate HTML response for QR code display
   */
  public generateQRCodeHTML(botId: string, botName?: string): string {
    const status = this.getQRCodeStatus(botId);

    if (!status.available) {
      return this.generateNotAvailableHTML(botId, botName);
    }

    if (status.expired) {
      return this.generateExpiredHTML(botId, botName, status.ageMinutes!);
    }

    // Generate base64 image data
    try {
      const imageBuffer = fs.readFileSync(status.filePath!);
      const base64Image = imageBuffer.toString("base64");
      const expiresInMinutes = Math.ceil(2 - status.ageMinutes!);

      return `
        <!DOCTYPE html>
        <html>
          <head>
            <title>WhatsApp QR Code - ${botName || botId}</title>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <style>
              body { 
                font-family: Arial, sans-serif; 
                padding: 20px; 
                text-align: center; 
                background-color: #f5f5f5;
                margin: 0;
              }
              .container {
                background: white;
                padding: 30px;
                border-radius: 10px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                max-width: 400px;
                margin: 0 auto;
              }
              .qr-image {
                max-width: 300px;
                border: 2px solid #ddd;
                border-radius: 10px;
                margin: 20px 0;
              }
              .expires {
                color: #666;
                font-size: 12px;
                margin: 15px 0;
              }
              .button {
                background-color: #25D366;
                color: white;
                border: none;
                padding: 12px 24px;
                border-radius: 5px;
                cursor: pointer;
                margin: 5px;
                font-size: 14px;
                transition: background-color 0.3s;
              }
              .button:hover {
                background-color: #1ea952;
              }
              .button.secondary {
                background-color: #6c757d;
              }
              .button.secondary:hover {
                background-color: #5a6268;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <h2 style="color: #25D366; margin-bottom: 10px;">📱 Scan QR Code</h2>
              <p style="color: #333; margin-bottom: 20px;">
                Scan this QR code with your WhatsApp mobile app for bot: <strong>${
                  botName || botId
                }</strong>
              </p>
              <img src="data:image/png;base64,${base64Image}" alt="QR Code" class="qr-image" />
              <div class="expires">
                Generated: ${status.createdAt!.toLocaleString()}<br>
                Expires in: ${expiresInMinutes} minute(s)
              </div>
              <button class="button" onclick="window.location.reload()">
                🔄 Refresh QR Code
              </button>
              <button class="button secondary" onclick="window.close()">
                ✕ Close
              </button>
            </div>
          </body>
        </html>
      `;
    } catch (error) {
      console.error(`Error reading QR code file for display:`, error);
      return this.generateErrorHTML(
        botId,
        botName,
        "Error reading QR code file"
      );
    }
  }

  /**
   * Generate HTML for when QR code is not available
   */
  private generateNotAvailableHTML(botId: string, botName?: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code Not Available - ${botName || botId}</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px; 
              text-align: center; 
              background-color: #f5f5f5;
              margin: 0;
            }
            .container {
              background: white;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              max-width: 400px;
              margin: 0 auto;
            }
            .button {
              background-color: #007bff;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 5px;
              cursor: pointer;
              margin: 5px;
              font-size: 14px;
            }
            .button.secondary {
              background-color: #6c757d;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 style="color: #ffc107;">⚠️ QR Code Not Available</h1>
            <p style="font-size: 16px; color: #333;">
              The QR code for bot <strong>${
                botName || botId
              }</strong> is currently not available.
            </p>
            <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
              <h3 style="color: #495057;">Possible reasons:</h3>
              <ul style="text-align: left; display: inline-block; color: #666;">
                <li>Bot is starting up (wait 30-60 seconds)</li>
                <li>Bot is already connected to WhatsApp</li>
                <li>QR code has expired and bot is generating a new one</li>
                <li>WhatsApp Web session is being restored</li>
              </ul>
            </div>
            <button class="button" onclick="window.location.reload()">
              🔄 Refresh Page
            </button>
            <button class="button secondary" onclick="window.close()">
              ✕ Close
            </button>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate HTML for when QR code has expired
   */
  private generateExpiredHTML(
    botId: string,
    botName: string | undefined,
    ageMinutes: number
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code Expired - ${botName || botId}</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px; 
              text-align: center; 
              background-color: #f5f5f5;
              margin: 0;
            }
            .container {
              background: white;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              max-width: 400px;
              margin: 0 auto;
            }
            .button {
              background-color: #007bff;
              color: white;
              border: none;
              padding: 12px 24px;
              border-radius: 5px;
              cursor: pointer;
              margin: 5px;
              font-size: 14px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 style="color: #ff6b6b;">⏰ QR Code Expired</h1>
            <p style="font-size: 16px; color: #333;">
              The QR code for bot <strong>${
                botName || botId
              }</strong> has expired 
              (generated ${Math.floor(ageMinutes)} minutes ago).
            </p>
            <p style="font-size: 14px; color: #666;">
              Please restart the bot to generate a new QR code.
            </p>
            <button class="button" onclick="window.location.reload()">
              🔄 Refresh Page
            </button>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Generate HTML for errors
   */
  private generateErrorHTML(
    botId: string,
    botName: string | undefined,
    errorMessage: string
  ): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Error - ${botName || botId}</title>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { 
              font-family: Arial, sans-serif; 
              padding: 20px; 
              text-align: center; 
              background-color: #f5f5f5;
              margin: 0;
            }
            .container {
              background: white;
              padding: 30px;
              border-radius: 10px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              max-width: 400px;
              margin: 0 auto;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <h1 style="color: #dc3545;">❌ Error</h1>
            <p style="color: #333;">${errorMessage}</p>
            <p style="color: #666;">Bot: <strong>${
              botName || botId
            }</strong></p>
          </div>
        </body>
      </html>
    `;
  }
}
