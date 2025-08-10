/**
 * QR Code Service
 * Handles QR code generation, storage, and management
 */

import * as fs from "fs";
import * as path from "path";
import * as QRCode from "qrcode";
import { Logger } from "./Logger";
import { QR_PATH } from "../config/EnvironmentManager";
import { updatePM2Metrics } from "../utils/pm2Utils";

export class QRCodeService {
  private qrCode: string | null = null;
  private qrCodePath: string;

  constructor(
    private botId: string,
    private botPort: number,
    private logger: Logger
  ) {
    this.qrCodePath = path.join(QR_PATH, `${this.botId}.png`);
  }

  public async handleQRGenerated(qr: string): Promise<void> {
    try {
      this.qrCode = qr;
      await this.saveQRCode(qr);
      
      // Update PM2 with QR code ready status
      updatePM2Metrics('qr_code_ready', 'success', 'QR code generated and ready for scanning', 60, {
        qr_available: true,
        qr_endpoint: `http://localhost:${this.botPort}/qr-code`
      });

      this.logger.info(`QR Code saved to: ${this.qrCodePath}`, "💾");
      this.logger.info(`QR available at: http://localhost:${this.botPort}/qr-code`, "🌐");
    } catch (error) {
      this.logger.error(`Error handling QR code: ${error}`);
      throw error;
    }
  }

  private async saveQRCode(qr: string): Promise<void> {
    return new Promise((resolve, reject) => {
      QRCode.toFile(
        this.qrCodePath,
        qr,
        {
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
          width: 256,
        },
        (error: Error | null | undefined) => {
          if (error) {
            this.logger.error(`Error saving QR code: ${error}`);
            reject(error);
          } else {
            this.logger.success("QR code image saved successfully", "💾");
            resolve();
          }
        }
      );
    });
  }

  public cleanupQRCode(): void {
    try {
      if (fs.existsSync(this.qrCodePath)) {
        fs.unlinkSync(this.qrCodePath);
        this.logger.info("QR code file cleaned up after successful connection", "🧹");
      }
      this.qrCode = null;
    } catch (error) {
      this.logger.warn(`Could not clean up QR code file: ${error}`);
    }
  }

  public getQRCode(): string | null {
    return this.qrCode;
  }

  public hasQRCode(): boolean {
    return this.qrCode !== null;
  }

  public getQRCodePath(): string {
    return this.qrCodePath;
  }

  public getQRStatus() {
    return {
      hasQRCode: this.hasQRCode(),
      qrCode: this.getQRCode(),
      qrCodePath: this.hasQRCode() ? this.qrCodePath : null,
    };
  }
}
