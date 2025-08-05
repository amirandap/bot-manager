/* eslint-disable @typescript-eslint/no-explicit-any */
import { Client } from 'whatsapp-web.js';
import { 
  cleanAndFormatPhoneNumber,
} from '../helpers/cleanAndFormatPhoneNumber';
import { getFallbackNumber } from './fallbackUtils';

/**
 * Consolidated error messaging utility
 * Replaces duplicate sendErrorMessage implementations
 */

/**
 * Send error message to fallback number
 * Consolidated and improved version from mediaHelpers and helpers
 * @param client WhatsApp client
 * @param message Error message to send
 * @param fallbackNumber Optional fallback number (uses default if not provided)
 * @returns Promise<void>
 */
export async function sendErrorMessage(
  client: Client | null,
  message: string,
  fallbackNumber?: string,
): Promise<void> {
  if (!client) {
    // eslint-disable-next-line no-console
    console.error(
      '❌ [ERROR_SENDER] Client not initialized, cannot send error message',
    );
    return;
  }

  const targetNumber = fallbackNumber || getFallbackNumber();
  const { cleanedPhoneNumber } = cleanAndFormatPhoneNumber(targetNumber);
  const whatsappNumber = cleanedPhoneNumber.startsWith('+')
    ? cleanedPhoneNumber.slice(1)
    : cleanedPhoneNumber;
  const formattedNumber = `${whatsappNumber.trim()}@c.us`;

  // eslint-disable-next-line no-console
  console.log(
    `📱 [ERROR_SENDER] Sending error message to fallback: ${formattedNumber}`,
  );

  try {
    await client.sendMessage(formattedNumber, message);
    // eslint-disable-next-line no-console
    console.log('✅ [ERROR_SENDER] Error message sent successfully to fallback');
  } catch (error: any) {
    // eslint-disable-next-line no-console
    console.error(
      '❌ [ERROR_SENDER] Failed to send error message to fallback:',
      error,
    );
    // Don't throw here to avoid infinite error loops
  }
}

/**
 * Legacy wrapper for compatibility with helpers.ts
 * @deprecated Use sendErrorMessage instead
 */
export const sendErrorMessageLegacy = async (
  client: Client | null,
  message: string,
): Promise<{ status: string; message: string }> => {
  try {
    await sendErrorMessage(client, message);
    return { status: 'success', message: 'Message sent successfully' };
  } catch (error: any) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    const errorDetails = error?.response
      ? error.response.data
      : { to: getFallbackNumber(), text: errorMessage };
    throw new Error(`Error sending message: ${JSON.stringify(errorDetails)}`);
  }
};
