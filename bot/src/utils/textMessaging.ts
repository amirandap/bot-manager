/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client } from 'whatsapp-web.js';
import { formatRecipient } from './recipientFormatting';
import { shouldSendFallback } from '../utils/errorHandler';
import { MediaResult } from './messageTypes';

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
  message: string,
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
      // eslint-disable-next-line no-console
      console.log(`📤 [BOT] Sending text message to: ${formattedRecipient}`);

      // Verify number exists on WhatsApp (for phone numbers only)
      if (!recipient.includes('@g.us')) {
        try {
          const numberId = await client.getNumberId(formattedRecipient);
          if (!numberId) {
            throw new Error(
              `Number ${formattedRecipient} is not registered on WhatsApp`,
            );
          }
        } catch (verifyError) {
          throw new Error(
            `WHATSAPP_VERIFICATION_ERROR: ${verifyError.message}`,
          );
        }
      }

      let messageSent = false;

      try {
        await client.sendMessage(formattedRecipient, message);
        messageSent = true;
        // eslint-disable-next-line no-console
        console.log(
          `✅ [BOT] Text message sent successfully to: ${formattedRecipient}`,
        );
        messagesSent.push(recipient);
      } catch (sendError: any) {
        // Handle post-send serialization errors
        if (
          messageSent || 
          (sendError.message && sendError.message.includes('serialize'))
        ) {
          // eslint-disable-next-line no-console
          console.warn(
            `⚠️ [BOT] Post-send serialization error (message likely sent): ` +
            `${sendError.message}`,
          );
          messagesSent.push(recipient);
          // eslint-disable-next-line no-console
          console.log(
            '✅ [BOT] Treating text send as successful despite post-send error',
          );
          continue;
        }
        throw sendError;
      }
    } catch (error: any) {
      shouldSendFallback(error, 'TEXT_MESSAGE', recipient);
      // eslint-disable-next-line no-console
      console.error(`❌ [BOT] Error sending text message to ${recipient}:`, error);
      
      errors.push({
        recipient,
        error: error.message || 'Unknown error',
        errorType: 'TEXT_SEND_ERROR',
        timestamp: new Date().toISOString(),
      });
    }
  }

  return { messagesSent, errors };
}
