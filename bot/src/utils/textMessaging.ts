/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client } from "whatsapp-web.js";
import { formatRecipient } from "./recipientFormattingUtils";
import { shouldSendFallback, logWhatsAppError } from "./errorHandlerUtils";
import { MediaResult } from "../types/types";
import { logger } from "../services/LoggerService";

/**
 * Text messaging utilities
 * Extracted from mediaHelpers for better organization
 */

/**
 * Send text message to multiple recipients
 * @param client WhatsApp client
 * @param recipients Array of phone numbers or group IDs
 * @param message Text message to send
 * @returns MediaResult with sent messages and errors
 */
export async function sendTextMessage(
  client: Client,
  recipients: string[],
  message: string
): Promise<MediaResult> {
  const messagesSent: string[] = [];
  const errors: Array<{
    recipient: string;
    error: string;
    errorType: string;
    timestamp: string;
  }> = [];

  for (const recipient of recipients) {
    try {
      const formattedRecipient = formatRecipient(recipient);
      logger.info(`Sending text message to: ${formattedRecipient}`);

      // Verify number exists on WhatsApp (for phone numbers only)
      if (!recipient.includes("@g.us")) {
        try {
          const numberId = await client.getNumberId(formattedRecipient);
          if (!numberId) {
            throw new Error(
              `Number ${formattedRecipient} is not registered on WhatsApp`
            );
          }
        } catch (verifyError) {
          throw new Error(
            `WHATSAPP_VERIFICATION_ERROR: ${verifyError.message}`
          );
        }
      }

      let messageSent = false;

      try {
        await client.sendMessage(formattedRecipient, message);
        messageSent = true;
        logger.info(
          `Text message sent successfully to: ${formattedRecipient}`
        );
        messagesSent.push(recipient);
      } catch (sendError: any) {
        // Use centralized error validation instead of manual checking
        const validation = logWhatsAppError(sendError);

        if (messageSent || validation.isPostSendError) {
          logger.warn(
            `Post-send error (message likely sent): ${sendError.message}`
          );
          messagesSent.push(recipient);
          logger.info(
            "Treating text send as successful despite post-send error"
          );
          continue;
        }
        throw sendError;
      }
    } catch (error: any) {
      shouldSendFallback(error);
      logger.error(
        `Error sending text message to ${recipient}: ${error}`
      );

      errors.push({
        recipient,
        error: error.message || "Unknown error",
        errorType: "TEXT_SEND_ERROR",
        timestamp: new Date().toISOString(),
      });
    }
  }

  return { 
    messagesSent, 
    errors, 
    success: messagesSent.length > 0 
  };
}
