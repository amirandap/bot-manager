import { fetchUserData } from "./UserDataService";
import { BaseMessageRequestBody } from "../types/types";
import { separateRecipients } from "../utils/recipientFormattingUtils";

/**
 * Recipient processing service - handles complex recipient processing logic
 * Contains stateful operations and business logic
 */
export class RecipientProcessorService {
  /**
   * Generic recipient processor for all message types
   * Processes and normalizes recipients from various sources
   */
  public static async processRecipients(body: BaseMessageRequestBody): Promise<{
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
    const uniqueRecipients = new Set(allRecipients);
    allRecipients = Array.from(uniqueRecipients);

    // Use consolidated function to separate recipients
    const { phoneNumbers, groups } = separateRecipients(allRecipients);

    return { groups, phoneNumbers };
  }

  /**
   * Simple recipient processor for basic to/recipients arrays
   * Uses the consolidated separateRecipients function
   */
  public static processSimpleRecipients(recipients: string | string[]): {
    groups: string[];
    phoneNumbers: string[];
  } {
    const allRecipients = Array.isArray(recipients) ? recipients : [recipients];

    // Use consolidated function to separate recipients
    const { phoneNumbers, groups } = separateRecipients(allRecipients);

    return { groups, phoneNumbers };
  }
}
