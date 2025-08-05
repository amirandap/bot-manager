import { Client } from 'whatsapp-web.js';
import { 
  sendTextMessage, 
  sendDocumentMessage,
} from '../../helpers/mediaHelpers';
import { ErrorObject } from './types';

/**
 * Handles individual phone number message sending
 */
export default class PhoneMessageHandler {
  public static async sendToPhones(
    client: Client | null,
    phoneNumbers: string[],
    message: string,
    file?: Express.Multer.File,
  ): Promise<{ messagesSent: string[]; errors: ErrorObject[] }> {
    const messagesSent: string[] = [];
    const errors: ErrorObject[] = [];

    if (!client) {
      errors.push({
        phoneNumber: 'ALL',
        error: 'WhatsApp client not initialized',
        errorType: 'CLIENT_NOT_INITIALIZED',
        timestamp: new Date().toISOString(),
      });
      return { messagesSent, errors };
    }

    for (const number of phoneNumbers) {
      try {
        if (file) {
          // Use new document message sender
          const result = await sendDocumentMessage(
            client,
            [number],
            file,
            message,
          );
          
          if (result.messagesSent.length > 0) {
            messagesSent.push(...result.messagesSent);
          }
          
          if (result.errors.length > 0) {
            // Convert MediaResult errors to ErrorObject format
            const convertedErrors = result.errors.map(err => ({
              phoneNumber: err.recipient,
              error: err.error,
              errorType: err.errorType,
              timestamp: err.timestamp,
            }));
            errors.push(...convertedErrors);
          }
        } else {
          // Use new text message sender
          const result = await sendTextMessage(
            client,
            [number],
            message,
          );
          
          if (result.messagesSent.length > 0) {
            messagesSent.push(...result.messagesSent);
          }
          
          if (result.errors.length > 0) {
            // Convert MediaResult errors to ErrorObject format
            const convertedErrors = result.errors.map(err => ({
              phoneNumber: err.recipient,
              error: err.error,
              errorType: err.errorType,
              timestamp: err.timestamp,
            }));
            errors.push(...convertedErrors);
          }
        }
      } catch (error: unknown) {
        // Critical errors that couldn't be handled by the new message functions
        const errorMessage = error instanceof Error 
          ? error.message 
          : 'Unknown error';
        
        const errorDetails = {
          phoneNumber: number,
          error: errorMessage,
          errorType: 'CRITICAL_ERROR',
          timestamp: new Date().toISOString(),
        };
        
        errors.push(errorDetails);
      }
    }

    return { messagesSent, errors };
  }
}
