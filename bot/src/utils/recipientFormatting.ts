import { 
  cleanAndFormatPhoneNumber,
} from '../helpers/cleanAndFormatPhoneNumber';

/**
 * Recipient formatting utilities
 * Consolidated from mediaHelpers and recipientProcessor
 */

/**
 * Helper function to format recipient (phone or group)
 * @param recipient Phone number or group ID
 * @returns Formatted WhatsApp recipient ID
 */
export function formatRecipient(recipient: string): string {
  if (recipient.includes('@g.us')) {
    // It's a group ID, return as-is
    return recipient;
  } else {
    // It's a phone number, format for WhatsApp
    const { cleanedPhoneNumber } = cleanAndFormatPhoneNumber(recipient);
    const whatsappNumber = cleanedPhoneNumber.startsWith('+')
      ? cleanedPhoneNumber.slice(1)
      : cleanedPhoneNumber;
    return `${whatsappNumber.trim()}@c.us`;
  }
}

/**
 * Separate phone numbers and group IDs from a list of recipients
 * Enhanced version from recipientProcessor
 * @param recipients Array of phone numbers and/or group IDs
 * @returns Object with separated phoneNumbers and groupIds arrays
 */
export function separateRecipientsType(recipients: string[]): {
  phoneNumbers: string[];
  groupIds: string[];
} {
  const phoneNumbers: string[] = [];
  const groupIds: string[] = [];

  recipients.forEach(recipient => {
    if (recipient.includes('@g.us')) {
      groupIds.push(recipient);
    } else {
      phoneNumbers.push(recipient);
    }
  });

  return { phoneNumbers, groupIds };
}

/**
 * Format all recipients in an array
 * @param recipients Array of phone numbers and/or group IDs
 * @returns Array of formatted WhatsApp recipient IDs
 */
export function formatRecipients(recipients: string[]): string[] {
  return recipients.map(recipient => formatRecipient(recipient));
}

/**
 * Validate if a recipient is a valid format
 * @param recipient Phone number or group ID
 * @returns boolean indicating if recipient format is valid
 */
export function isValidRecipient(recipient: string): boolean {
  // Group ID validation
  if (recipient.includes('@g.us')) {
    return /^[0-9]+-[0-9]+@g\.us$/.test(recipient);
  }
  
  // Phone number validation (basic)
  const phoneRegex = /^[+]?[1-9]\d{6,14}$/;
  return phoneRegex.test(recipient.replace(/\s+/g, ''));
}
