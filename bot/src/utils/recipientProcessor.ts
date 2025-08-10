/**
 * @deprecated This file has been moved to recipientFormatting.ts
 * This file exists only for backward compatibility
 */

// Re-export everything from recipientFormatting for compatibility
export {
  RecipientProcessor as default,
  RecipientProcessor,
  formatRecipient,
  separateRecipients,
  formatRecipients,
  isValidRecipient,
  formatPhoneForWhatsApp,
} from "./recipientFormatting";
