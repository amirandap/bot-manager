/**
 * QR Code Utilities
 * Centralized func    botLogger.info(`QR Code saved to: ${qrCodePath}`, "💾");
    botLogger.info(`QR available at: http://localhost:${botPort}/qr-code`, "🌐");
  } catch (error) {
    botLogger.error(`Error handling QR code: ${error}`);
    markStepFailure("QR_CODE_GENERATION", error);
    throw error;
  }
}r QR code management
 */

import * as fs from "fs";
import * as path from "path";
import * as QRCode from "qrcode";
import { botLogger } from "./loggerWrapper";
import { QR_PATH } from "../config/EnvironmentManager";
import { updatePM2Metrics, markStepFailure } from "./pm2Utils";

// Global QR state
let currentQRCode: string | null = null;
let qrCodePath: string | null = null;

/**
 * Initialize QR code system
 */
export function initializeQRCode(botId: string, botPort: number): void {
  qrCodePath = path.join(QR_PATH, `${botId}.png`);
}

/**
 * Handle QR code generation
 */
export async function handleQRGenerated(
  qr: string, 
  botPort: number
): Promise<void> {
  if (!qrCodePath) {
    throw new Error("QR code system not initialized. Call initializeQRCode first.");
  }

  try {
    currentQRCode = qr;
    await saveQRCode(qr);
    
    // Update PM2 with QR code ready status
    updatePM2Metrics('qr_code_ready', 'success', 'QR code generated and ready for scanning', 60, {
      qr_available: true,
      qr_endpoint: `http://localhost:${botPort}/qr-code`
    });

    botLogger.info(`QR Code saved to: ${qrCodePath}`, "💾");
    botLogger.info(`QR available at: http://localhost:${botPort}/qr-code`, "🌐");
  } catch (error) {
    botLogger.error(`Error handling QR code: ${error}`);
    markStepFailure('qr_code_generation', error as Error);
    throw error;
  }
}

/**
 * Save QR code to file
 */
async function saveQRCode(qr: string): Promise<void> {
  if (!qrCodePath) {
    throw new Error("QR code path not initialized");
  }

  return new Promise((resolve, reject) => {
    QRCode.toFile(
      qrCodePath!,
      qr,
      {
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
        width: 512,
      },
      (error) => {
        if (error) {
          reject(error);
        } else {
          resolve();
        }
      }
    );
  });
}

/**
 * Clean up QR code file after successful connection
 */
export function cleanupQRCode(): void {
  try {
    if (qrCodePath && fs.existsSync(qrCodePath)) {
      fs.unlinkSync(qrCodePath);
      botLogger.info("QR code file cleaned up after successful connection", "🧹");
    }
    currentQRCode = null;
  } catch (error) {
    botLogger.warn(`Could not clean up QR code file: ${error}`);
  }
}

/**
 * Get current QR code
 */
export function getQRCode(): string | null {
  return currentQRCode;
}

/**
 * Check if QR code is available
 */
export function hasQRCode(): boolean {
  return currentQRCode !== null;
}

/**
 * Get QR code file path
 */
export function getQRCodePath(): string | null {
  return qrCodePath;
}

/**
 * Get QR status for API responses
 */
export function getQRStatus() {
  return {
    hasCode: currentQRCode !== null,
    path: qrCodePath,
    code: currentQRCode
  };
}

/**
 * Send QR code as response
 */
export function sendQRCode(res: any): void {
  if (!hasQRCode() || !qrCodePath || !fs.existsSync(qrCodePath)) {
    res.status(404).json({ error: "QR Code not available" });
    return;
  }

  res.sendFile(qrCodePath);
}

/**
 * Generate QR code from data
 */
export async function generateQRCode(
  qrData: string
): Promise<{ success: boolean; filePath?: string; dataUrl?: string }> {
  try {
    if (!qrCodePath) {
      throw new Error("QR code system not initialized");
    }

    await QRCode.toFile(qrCodePath, qrData, {
      errorCorrectionLevel: 'M',
      type: 'png',
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    });

    const dataUrl = await QRCode.toDataURL(qrData);
    
    return {
      success: true,
      filePath: qrCodePath,
      dataUrl: dataUrl
    };
  } catch (error) {
    botLogger.error(`Error generating QR code: ${error}`);
    return { success: false };
  }
}
