import { Client } from "whatsapp-web.js";
import { ErrorObject } from "./types";
import { shouldSendFallback } from "../../utils/errorHandler";

/**
 * Handles group message sending
 */
export default class GroupMessageHandler {
  static async sendToGroups(
    client: Client | null,
    groups: string[],
    message: string,
    file?: Express.Multer.File
  ): Promise<{ messagesSent: string[]; errors: ErrorObject[] }> {
    const messagesSent: string[] = [];
    const errors: ErrorObject[] = [];

    for (const groupId of groups) {
      try {
        console.log(`🏢 [BOT] Sending to group: ${groupId}`);
        console.log(`🔍 [BOT] Message content: "${message}"`);
        console.log(`📁 [BOT] Has file attachment: ${!!file}`);
        
        let sendResult;
        if (file) {
          console.log(`📎 [BOT] Sending file to group: ${file.originalname} (${file.mimetype})`);
          sendResult = await client?.sendMessage(
            groupId,
            { data: file.buffer.toString("base64"), mimetype: file.mimetype },
            { caption: message }
          );
        } else {
          console.log(`💬 [BOT] Sending text message to group`);
          sendResult = await client?.sendMessage(groupId, message);
        }
        
        console.log(`🔍 [BOT] Send result:`, sendResult);
        messagesSent.push(groupId);
        console.log(`✅ [BOT] Group message sent successfully to: ${groupId}`);
      } catch (error: unknown) {
        const reason = error instanceof Error ? error.message : "Unknown error";
        const errorStack = error instanceof Error ? error.stack : "No stack trace";
        
        // Use standardized error validation to determine if fallback should be sent
        const sendFallback = shouldSendFallback(error, 'GROUP_MESSAGE', groupId);
        
        if (!sendFallback) {
          // Post-send error - message was likely delivered successfully
          messagesSent.push(groupId);
          console.log(`✅ [BOT] Treating as successful send despite post-send error`);
        } else {
          // Critical error - actual delivery failure
          console.error(`❌ [BOT] Critical error sending message to group ${groupId}:`);
          console.error(`   Error Type: ${typeof error}`);
          console.error(`   Error Message: ${reason}`);
          console.error(`   Error Stack: ${errorStack}`);
          console.error(`   Full Error Object:`, error);
          
          errors.push({
            phoneNumber: groupId,
            error: reason,
            errorType: "GROUP_SEND_ERROR",
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    return { messagesSent, errors };
  }
}
