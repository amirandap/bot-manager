import { Client } from "whatsapp-web.js";
import { ErrorObject } from "./types";

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
        
        if (file) {
          await client?.sendMessage(
            groupId,
            { data: file.buffer.toString("base64"), mimetype: file.mimetype },
            { caption: message }
          );
        } else {
          await client?.sendMessage(groupId, message);
        }
        
        messagesSent.push(groupId);
        console.log(`✅ [BOT] Group message sent successfully to: ${groupId}`);
      } catch (error: unknown) {
        const reason = error instanceof Error ? error.message : "Unknown error";
        errors.push({
          phoneNumber: groupId,
          error: reason,
          errorType: "GROUP_SEND_ERROR",
          timestamp: new Date().toISOString()
        });
        console.error(`❌ [BOT] Error sending message to group ${groupId}:`, error);
      }
    }

    return { messagesSent, errors };
  }
}
