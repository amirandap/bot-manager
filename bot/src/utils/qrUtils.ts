/**
 * QR Code Utilities - DEPRECATED
 * ⚠️ DEPRECATED: This file is deprecated and should not be used.
 * All QR functionality has been consolidated into whatsAppUtils.ts
 * 
 * Migration completed: 2025-08-13
 * 
 * Please use whatsAppUtils.ts for all QR code operations:
 * - getQRCode()
 * - hasQRCode() 
 * - getQRCodePath()
 * - getQRStatus()
 * - sendQRCode()
 * - cleanupQRCodeAfterConnection()
 */

// Re-export from whatsAppUtils for backward compatibility
export {
  getQRCode,
  hasQRCode,
  getQRCodePath,
  getQRStatus,
  sendQRCode,
  cleanupQRCodeAfterConnection as cleanupQRCode
} from "./whatsAppUtils";

import { botLogger } from "./loggerWrapper";

/**
 * @deprecated Use whatsAppUtils.ts instead
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function initializeQRCode(_botId: string, _botPort: number): void {
  botLogger.warn("⚠️ DEPRECATED: initializeQRCode() from qrUtils.ts is deprecated. QR initialization is now handled internally in whatsAppUtils.ts");
  botLogger.warn("Please remove this call - QR is initialized automatically when WhatsApp client starts");
}

/**
 * @deprecated Use whatsAppUtils.ts instead
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function handleQRGenerated(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _qr: string, 
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _botPort: number
): Promise<void> {
  botLogger.warn("⚠️ DEPRECATED: handleQRGenerated() from qrUtils.ts is deprecated. QR handling is now internal to whatsAppUtils.ts");
  throw new Error("DEPRECATED: handleQRGenerated() from qrUtils.ts is no longer supported. QR handling is automatic in whatsAppUtils.ts");
}

/**
 * @deprecated Use whatsAppUtils.ts instead
 */
export async function generateQRCode(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  _qrData: string
): Promise<{ success: boolean; filePath?: string; dataUrl?: string }> {
  botLogger.warn("⚠️ DEPRECATED: generateQRCode() from qrUtils.ts is deprecated");
  throw new Error("DEPRECATED: generateQRCode() from qrUtils.ts is no longer supported");
}
