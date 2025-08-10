import { cleanAndFormatPhoneNumber } from "./cleanAndFormatPhoneNumber";
import { fetchUserData } from "./userDataService";
import { BaseMessageRequestBody } from "../types/types";

/**
 * Recipient formatting and processing utilities
 * Consolidated from mediaHelpers, recipientProcessor, and formatting utilities
 */

/**
 * Helper function to format recipient (phone or group)
 * @param recipient Phone number or group ID
 * @returns Formatted WhatsApp recipient ID
 */
export function formatRecipient(recipient: string): string {
  if (recipient.includes("@g.us")) {
    // It's a group ID, return as-is
    return recipient;
  } else {
    // It's a phone number, format for WhatsApp
    const { cleanedPhoneNumber } = cleanAndFormatPhoneNumber(recipient);
    const whatsappNumber = cleanedPhoneNumber.startsWith("+")
      ? cleanedPhoneNumber.slice(1)
      : cleanedPhoneNumber;
    return `${whatsappNumber.trim()}@c.us`;
  }
}

/**
 * Separate phone numbers and group IDs from a list of recipients
 * Enhanced version from recipientProcessor
 * @param recipients Array of phone numbers and/or group IDs
 * @returns Object with separated phoneNumbers and groups arrays
 */
export function separateRecipients(recipients: string[]): {
  phoneNumbers: string[];
  groups: string[];
} {
  const phoneNumbers: string[] = [];
  const groups: string[] = [];

  recipients.forEach((recipient) => {
    if (recipient.includes("@g.us")) {
      groups.push(recipient);
    } else {
      phoneNumbers.push(recipient);
    }
  });

  // eslint-disable-next-line no-console
  console.log(
    `📋 [FORMATTER] Processing ${groups.length} groups and ` +
      `${phoneNumbers.length} phone numbers`
  );

  return { phoneNumbers, groups };
}

/**
 * Format all recipients in an array
 * @param recipients Array of phone numbers and/or group IDs
 * @returns Array of formatted WhatsApp recipient IDs
 */
export function formatRecipients(recipients: string[]): string[] {
  return recipients.map((recipient) => formatRecipient(recipient));
}

/**
 * Validate if a recipient is a valid format
 * @param recipient Phone number or group ID
 * @returns boolean indicating if recipient format is valid
 */
export function isValidRecipient(recipient: string): boolean {
  // Group ID validation
  if (recipient.includes("@g.us")) {
    return /^[0-9]+-[0-9]+@g\.us$/.test(recipient);
  }

  // Phone number validation (basic)
  const phoneRegex = /^[+]?[1-9]\d{6,14}$/;
  return phoneRegex.test(recipient.replace(/\s+/g, ""));
}

/**
 * Format phone number for WhatsApp (without @c.us suffix)
 * @param phoneNumber Raw phone number
 * @returns Formatted phone number for WhatsApp
 */
export function formatPhoneForWhatsApp(phoneNumber: string): string {
  const { cleanedPhoneNumber } = cleanAndFormatPhoneNumber(phoneNumber);
  const whatsappNumber = cleanedPhoneNumber.startsWith("+")
    ? cleanedPhoneNumber.slice(1)
    : cleanedPhoneNumber;
  return whatsappNumber.trim();
}

/**
 * RecipientProcessor class - handles complex recipient processing
 * Moved from recipientProcessor.ts for consolidation
 */
export class RecipientProcessor {
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
