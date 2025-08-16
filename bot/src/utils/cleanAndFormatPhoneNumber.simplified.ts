import { PhoneNumberValidation } from "../types";
import { logger } from "../services/LoggerService";

// Simplified constants
const DEFAULT_FALLBACK_NUMBER = "+18296459554"; // From env config
const MIN_LENGTH = 10;
const MAX_LENGTH = 15;

/**
 * Clean and format phone number for WhatsApp
 * Simplified version focusing on the most common use cases
 */
export function cleanAndFormatPhoneNumber(phoneNumber: string): PhoneNumberValidation {
  // Step 1: Clean the number
  const cleaned = phoneNumber.replace(/[^\d+]/g, "");
  
  // Step 2: Handle empty or too short numbers
  if (!cleaned || cleaned.length < MIN_LENGTH) {
    logger.logProcessing('phone', "Invalid number - too short", phoneNumber);
    return { cleanedPhoneNumber: DEFAULT_FALLBACK_NUMBER, isValid: false };
  }
  
  // Step 3: Format the number
  let formatted = cleaned;
  
  // Add + if missing and looks like international number
  if (!formatted.startsWith("+") && formatted.length >= MIN_LENGTH) {
    // Dominican Republic numbers (809, 829, 849)
    if (/^1?(809|829|849)/.test(formatted)) {
      formatted = formatted.startsWith("1") ? `+${formatted}` : `+1${formatted}`;
    }
    // Other international numbers
    else if (formatted.length >= MIN_LENGTH) {
      formatted = `+${formatted}`;
    }
  }
  
  // Step 4: Validate final format
  const isValid = formatted.startsWith("+") && 
                  formatted.length >= MIN_LENGTH && 
                  formatted.length <= MAX_LENGTH;
  
  if (!isValid) {
    logger.logProcessing('phone', "Invalid number format", phoneNumber);
    return { cleanedPhoneNumber: DEFAULT_FALLBACK_NUMBER, isValid: false };
  }
  
  logger.logProcessing('phone', "Number formatted successfully", formatted);
  return { cleanedPhoneNumber: formatted, isValid: true };
}
