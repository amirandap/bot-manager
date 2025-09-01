/**
 * QR Code Management Utilities
 * Handles QR code generation, saving, and cleanup for WhatsApp authentication
 */

import * as QRCode from "qrcode";
import * as path from "path";
import { logger } from "./LoggerService";
import { QR_PATH } from "../config/EnvironmentManager";

// QR Code state
let currentQRCode: string | null = null;
let qrCodePath: string | null = null;

/**
 * Initialize QR code system
 */
export async function initializeQRCodePath(botId: string): Promise<string> {
  try {
    qrCodePath = path.join(QR_PATH, `qr-code-${botId}.png`);
    logger.info(`QR code path initialized: ${qrCodePath}`, "📂", undefined, "QR_STATUS", "INITIALIZING");
    return qrCodePath;
  } catch (error) {
    logger.error(`Failed to initialize QR code path: ${error}`, {}, "ERRORS", 1);
    throw error;
  }
}

/**
 * Handle QR code generation
 */
export async function handleQRGenerated(qr: string): Promise<void> {
  if (!qrCodePath) {
    throw new Error("QR code path not initialized");
  }

  try {
    logger.info("Processing QR code generation...", "🔄", undefined, "QR_STATUS", "GENERATING");
    currentQRCode = qr;

    await saveQRCode(qr);

    // Update PM2 with QR code ready status
    logger.info("QR code generated and ready for scanning", "✅", undefined, "QR_STATUS", "SCANME");
    
    // Update QR Codes metric
    logger.updateMetric("QR_CODES", 1);

    logger.info(`QR Code saved to: ${qrCodePath}`, "💾");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error handling QR code: ${errorMessage}`);
    
    // Update errors metric
    logger.updateMetric("ERRORS", 1);
    
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
    await QRCode.toFile(qrCodePath, qr);
    logger.info(`QR code saved to: ${qrCodePath}`, "💾", undefined, "QR_STATUS", "SAVED");
  } catch (error) {
    logger.error(`Failed to save QR code: ${error}`, {}, "ERRORS", 1);
    throw error;
  }
}

/**
 * Clean up QR code file
 */
export function cleanupQRCode(): void {
  if (qrCodePath) {
    try {
      const fs = require("fs");
      if (fs.existsSync(qrCodePath)) {
        fs.unlinkSync(qrCodePath);
        logger.info("QR code file cleaned up", "🧹");
      }
    } catch (error) {
      logger.error(`Failed to cleanup QR code: ${error}`);
    }
  }
  currentQRCode = null;
}

/**
 * QR Code API exports for compatibility
 */
export function getQRCode(): string | null {
  return currentQRCode;
}

export function hasQRCode(): boolean {
  return currentQRCode !== null;
}

export function getQRCodePath(): string | null {
  return qrCodePath;
}

export function getQRStatus() {
  return {
    hasCode: currentQRCode !== null,
    path: qrCodePath,
    code: currentQRCode,
  };
}

/**
 * Clean up QR code after successful connection
 */
export function cleanupQRCodeAfterConnection(): void {
  // Only cleanup if QR code was actually generated and saved
  if (currentQRCode && qrCodePath) {
    logger.info("QR authentication completed successfully", "✅", undefined, "QR_STATUS", "COMPLETED");
    cleanupQRCode(); // Silent cleanup - no logging
  }
  // No logging during shutdown - orchestrator handles all logging
}
