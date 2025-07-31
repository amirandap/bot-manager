import { Client } from "whatsapp-web.js";
import { formatMessage, sendFileAndMessage, sendMessage } from "../../helpers/helpers";
import { ErrorObject } from "./types";

/**
 * Handles individual phone number message sending
 */
export default class PhoneMessageHandler {
  static async sendToPhones(
    client: Client | null,
    phoneNumbers: string[],
    message: string,
    file?: Express.Multer.File
  ): Promise<{ messagesSent: string[]; errors: ErrorObject[] }> {
    const messagesSent: string[] = [];
    const errors: ErrorObject[] = [];

    for (const number of phoneNumbers) {
      try {
        console.log(number, "NUMBER");
        
        const { phoneNumber, formattedMessage } = formatMessage(message, {
          full_name: "",
          celular: number,
          user_id: 0,
          username: "",
          nickname: "",
          email: "",
          user_discord_id: "",
          youtube_id: "",
          individualID: 0,
          individual_id: 0,
          SubmissionId: 0,
          instagram: "",
        });

        if (file) {
          const result = await sendFileAndMessage(
            client,
            phoneNumber,
            { data: file.buffer.toString("base64"), mimetype: file.mimetype },
            formattedMessage
          );
          
          // Check if file was sent successfully (even with warnings)
          if (result.status === "success") {
            if (result.warning) {
              console.warn(`⚠️ [BOT_ROUTE] File sent with warning to ${phoneNumber}: ${result.warning}`);
            }
            messagesSent.push(phoneNumber);
          } else {
            throw new Error(`File send failed: ${result.message || 'Unknown error'}`);
          }
        } else {
          const result = await sendMessage(client, phoneNumber, formattedMessage);
          
          // Check if message was sent successfully (even with warnings)
          if (result.status === "success") {
            if (result.warning) {
              console.warn(`⚠️ [BOT_ROUTE] Message sent with warning to ${phoneNumber}: ${result.warning}`);
            }
            messagesSent.push(phoneNumber);
          } else {
            throw new Error(`Message send failed: ${result.message || 'Unknown error'}`);
          }
        }
      } catch (error: unknown) {
        console.error(`❌ [BOT_ROUTE] Error sending message to ${number}:`, error);
        
        let errorType = "UNKNOWN_ERROR";
        let errorMessage = error instanceof Error ? error.message : "Unknown error";
        
        // Parse structured error from helper
        if (errorMessage.startsWith("BOT_SEND_ERROR:")) {
          try {
            const errorData = JSON.parse(errorMessage.replace("BOT_SEND_ERROR: ", ""));
            errorType = errorData.errorType;
            errorMessage = errorData.originalError;
          } catch (parseError) {
            console.error(`❌ [BOT_ROUTE] Failed to parse error data:`, parseError);
          }
        }
        
        const errorDetails = {
          phoneNumber: number,
          error: errorMessage,
          errorType,
          timestamp: new Date().toISOString()
        };
        
        errors.push(errorDetails);
        console.error(`🔥 [BOT_ROUTE] Detailed error for ${number}:`, errorDetails);
      }
    }

    return { messagesSent, errors };
  }
}
