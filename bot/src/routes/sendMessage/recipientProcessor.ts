import { fetchUserData } from "../../helpers/helpers";
import { SendMessageRequestBody } from "./types";

/**
 * Processes and normalizes recipients from various sources
 */
export default class RecipientProcessor {
  static async processRecipients(body: SendMessageRequestBody): Promise<{
    groups: string[];
    phoneNumbers: string[];
  }> {
    const { discorduserid, phoneNumber, to, group_id } = body;
    const userData = discorduserid ? await fetchUserData(discorduserid) : null;
    
    // New unified recipient handling logic
    const targetNumber = phoneNumber || to;
    let allRecipients: string[] = [];
    
    // Collect all recipients from different sources
    if (typeof targetNumber === "string") {
      allRecipients.push(targetNumber);
    } else if (Array.isArray(targetNumber)) {
      allRecipients.push(...targetNumber);
    }
    
    if (group_id) {
      allRecipients.push(group_id);
    }
    
    if (discorduserid && userData?.celular) {
      allRecipients.push(userData.celular);
    }
    
    // Remove duplicates
    allRecipients = [...new Set(allRecipients)];
    
    // Separate groups and phone numbers
    const groups = allRecipients.filter(recipient => recipient.includes('@g.us'));
    const phoneNumbers = allRecipients.filter(recipient => !recipient.includes('@g.us'));
    
    console.log(`📋 [BOT] Processing ${groups.length} groups and ${phoneNumbers.length} phone numbers`);
    
    return { groups, phoneNumbers };
  }
}
