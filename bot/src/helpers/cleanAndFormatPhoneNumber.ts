/* eslint-disable no-console */

import { getFallbackNumber } from "../utils/fallbackUtils";

/* eslint-disable max-len */
export function cleanAndFormatPhoneNumber(phoneNumber: string): {
  cleanedPhoneNumber: string;
  isValid: boolean;
} {
  console.log(`🔍 Processing phone number: "${phoneNumber}"`);

  // Clean the phone number by removing all non-numeric characters except for the plus sign
  let cleaned = phoneNumber.replace(/[^\d+]/g, "");
  console.log(`🧹 Cleaned number: "${cleaned}"`);

  // Handle special case for Argentina
  let finalNumber = cleaned.startsWith("+541")
    ? cleaned.replace("+54", "+549")
    : cleaned;

  // Handle Dominican Republic numbers - More comprehensive detection
  // Pattern 1: Standard Dominican format 809/829/849 + 7 digits
  if (/^(\+?1)?(809|829|849)\d{7}$/.test(finalNumber)) {
    if (!finalNumber.startsWith("+1")) {
      finalNumber = finalNumber.startsWith("1")
        ? `+${finalNumber}`
        : `+1${finalNumber}`;
    }
    console.log(`🇩🇴 Dominican number (standard) detected: "${finalNumber}"`);
  }
  // Pattern 2: Extended Dominican format like 8296459554 (10 digits starting with 829)
  else if (/^(\+?1)?(809|829|849)\d{7,10}$/.test(finalNumber)) {
    if (!finalNumber.startsWith("+1")) {
      finalNumber = finalNumber.startsWith("1")
        ? `+${finalNumber}`
        : `+1${finalNumber}`;
    }
    console.log(`🇩🇴 Dominican number (extended) detected: "${finalNumber}"`);
  }
  // Pattern 3: Full format like 18296459554 (11+ digits starting with 1829)
  else if (/^(\+?1)(809|829|849)\d{7,10}$/.test(finalNumber)) {
    if (!finalNumber.startsWith("+")) {
      finalNumber = `+${finalNumber}`;
    }
    console.log(`🇩🇴 Dominican number (full format) detected: "${finalNumber}"`);
  }
  // If number doesn't start with + but looks like a full international number, add +
  else if (/^\d{10,15}$/.test(finalNumber) && !finalNumber.startsWith("+")) {
    // For numbers that look like they might be missing the +
    finalNumber = `+${finalNumber}`;
    console.log(`🌍 International number detected, adding +: "${finalNumber}"`);
  }

  console.log(`📞 Final formatted number: "${finalNumber}"`);

  // Validate the cleaned phone number
  const isValid =
    finalNumber.startsWith("+") &&
    finalNumber.length >= 10 &&
    finalNumber.length <= 15;

  console.log(`✅ Number validation: ${isValid ? "VALID" : "INVALID"}`);

  if (isValid) {
    return { cleanedPhoneNumber: finalNumber, isValid };
  } else {
    const fallback = getFallbackNumber();
    console.log(`❌ Using fallback number: "${fallback}"`);
    return { cleanedPhoneNumber: fallback, isValid: false };
  }
}
