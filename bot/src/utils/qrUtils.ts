/**
 * QR Code Utilities
 * Centralized functions for QR code management
 */

import * as fs from "fs";
import * as path from "path";
import * as QRCode from "qrcode";
import { botLogger } from "./loggerWrapper";
import { QR_PATH } from "../config/EnvironmentManager";
import { updatePM2Metrics, handleStep } from "./pm2Utils";
import { DirectoryManagerService } from "../services/DirectoryManagerService";

// Global QR state
let currentQRCode: string | null = null;
let qrCodePath: string | null = null;

/**
 * Initialize QR code system
 */
export function initializeQRCode(botId: string, botPort: number): void {
  try {
    // Use DirectoryManagerService to ensure QR directory exists
    const directoryManager = new DirectoryManagerService();
    directoryManager.createDirectoryIfNotExists(QR_PATH);
    
    qrCodePath = path.join(QR_PATH, `${botId}.png`);
    botLogger.info(`QR code system initialized for bot: ${botId}`, "📱");
  } catch (error) {
    botLogger.error(`Failed to initialize QR code system: ${error}`);
    throw new Error(`QR code system initialization failed: ${error}`);
  }
}

/**
 * Handle QR code generation
 */
export async function handleQRGenerated(
  qr: string, 
  botPort: number
): Promise<void> {
  if (!qrCodePath) {
    const error = new Error("QR code system not initialized. Call initializeQRCode first.");
    botLogger.error(`QR handling failed: ${error.message}`);
    // Note: This function is deprecated, QR handling is now in whatsAppUtils.ts
    throw error;
  }

  try {
    botLogger.info("Processing QR code generation...", "⏳");
    currentQRCode = qr;
    
    await saveQRCode(qr);
    
    // Update PM2 with QR code ready status
    updatePM2Metrics('qr_code_ready', 'success', 'QR code generated and ready for scanning', 60, {
      qr_available: true,
      qr_endpoint: `http://localhost:${botPort}/qr-code`,
      qr_file_path: qrCodePath
    });

    botLogger.info(`QR Code saved to: ${qrCodePath}`, "💾");
    botLogger.info(`QR available at: http://localhost:${botPort}/qr-code`, "🌐");
    botLogger.success("QR code generation completed successfully", "✅");
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    botLogger.error(`QR code handling failed: ${errorMessage}`);
    
    // Note: This function is deprecated, QR handling is now in whatsAppUtils.ts
    throw new Error(`QR code handling failed: ${errorMessage}`);
  }
}

/**
 * Save QR code to file
 */
async function saveQRCode(qr: string): Promise<void> {
  if (!qrCodePath) {
    throw new Error("QR code path not initialized");
  }

  try {
    // Use DirectoryManagerService to ensure directory exists before saving
    const directoryManager = new DirectoryManagerService();
    const qrDir = path.dirname(qrCodePath);
    directoryManager.createDirectoryIfNotExists(qrDir);

    // Generate QR code file
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
            botLogger.error(`QR code file generation failed: ${error}`);
            reject(new Error(`Failed to save QR code: ${error.message}`));
          } else {
            botLogger.success(`QR code saved successfully: ${qrCodePath}`);
            resolve();
          }
        }
      );
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    botLogger.error(`QR code save operation failed: ${errorMessage}`);
    throw new Error(`QR code save failed: ${errorMessage}`);
  }
}

/**
 * Clean up QR code file after successful connection
 */
export function cleanupQRCode(): void {
  try {
    if (qrCodePath) {
      const directoryManager = new DirectoryManagerService();
      const wasDeleted = directoryManager.cleanupFile(qrCodePath);
      
      if (wasDeleted) {
        botLogger.info("QR code file cleaned up after successful connection", "🧹");
      }
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
  const directoryManager = new DirectoryManagerService();
  
  if (!hasQRCode() || !qrCodePath || !directoryManager.fileExists(qrCodePath)) {
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

    // Use DirectoryManagerService to ensure directory exists
    const directoryManager = new DirectoryManagerService();
    const qrDir = path.dirname(qrCodePath);
    directoryManager.createDirectoryIfNotExists(qrDir);

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
    
    botLogger.success(`QR code generated successfully: ${qrCodePath}`);
    
    return {
      success: true,
      filePath: qrCodePath,
      dataUrl: dataUrl
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    botLogger.error(`Error generating QR code: ${errorMessage}`);
    return { success: false };
  }
}
