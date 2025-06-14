/* eslint-disable no-console */

import { fallbackNumber } from '../routes/changeFallbackNumberRoute';

/* eslint-disable max-len */
export function cleanAndFormatPhoneNumber(phoneNumber: string): { cleanedPhoneNumber: string, isValid: boolean } {
  // Clean the phone number by removing all non-numeric characters except for the plus sign
  const cleaned = phoneNumber.replace(/[^\d+]/g, '');

  const finalNumber = cleaned.startsWith('+541') ? cleaned.replace('+54', '+549') : cleaned;
  // Validate the cleaned phone number
  const isValid = finalNumber.startsWith('+') && finalNumber.length > 4 && finalNumber.length <= 15;

  if (isValid) {
    return { cleanedPhoneNumber: finalNumber, isValid };
  } else {
    return { cleanedPhoneNumber: fallbackNumber, isValid: false };
  }
}
