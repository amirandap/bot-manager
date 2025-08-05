import { cleanAndFormatPhoneNumber } from '../helpers/cleanAndFormatPhoneNumber';

/**
 * Utility for formatting WhatsApp recipients (phone numbers and group IDs)
 * Consolidated from mediaHelpers and recipientProcessor
 */

/**
 * Helper function to format recipient (phone or group) for WhatsApp
 * @param recipient Raw phone number or group ID
 * @returns Properly formatted WhatsApp ID
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
 * Separate groups from phone numbers in a recipient list
 * @param recipients Array of mixed recipients
 * @returns Object with separated groups and phoneNumbers arrays
 */
export function separateRecipients(recipients: string[]): {
  groups: string[];
  phoneNumbers: string[];
} {
  const groups = recipients.filter(recipient => recipient.includes('@g.us'));
  const phoneNumbers = recipients.filter(
    recipient => !recipient.includes('@g.us'),
  );
  
  // eslint-disable-next-line no-console
  console.log(
    `📋 [FORMATTER] Processing ${groups.length} groups and ` +
    `${phoneNumbers.length} phone numbers`,
  );
  
  return { groups, phoneNumbers };
}

/**
 * Format phone number for WhatsApp (without @c.us suffix)
 * @param phoneNumber Raw phone number
 * @returns Formatted phone number for WhatsApp
 */
export function formatPhoneForWhatsApp(phoneNumber: string): string {
  const { cleanedPhoneNumber } = cleanAndFormatPhoneNumber(phoneNumber);
  const whatsappNumber = cleanedPhoneNumber.startsWith('+')
    ? cleanedPhoneNumber.slice(1)
    : cleanedPhoneNumber;
  return whatsappNumber.trim();
}
