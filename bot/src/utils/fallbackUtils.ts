/* eslint-disable no-console */
import { DEFAULT_FALLBACK_PHONE_NUMBER } from "../constants/numbers";

// Mutable fallback number that can be changed at runtime
let runtimeFallbackNumber: string | null = null;

/**
 * Basic phone number cleaning (avoiding circular dependency)
 */
function basicCleanPhoneNumber(phoneNumber: string): string {
  let cleaned = phoneNumber.replace(/[^\d+]/g, "");

  // Ensure it starts with + for international format
  if (!cleaned.startsWith("+") && cleaned.length >= 10) {
    cleaned = `+${cleaned}`;
  }

  return cleaned;
}

/**
 * Sets a new fallback number at runtime
 * @param newNumber - The new fallback number
 */
export function setFallbackNumber(newNumber: string): void {
  const cleanedNumber = basicCleanPhoneNumber(newNumber);
  console.log(
    `📞 Updating fallback number from "${getFallbackNumber()}" to "${cleanedNumber}"`
  );
  runtimeFallbackNumber = cleanedNumber;
}

/**
 * Gets the current fallback number, with runtime override taking precedence
 * Also applies cleaning/formatting to ensure it's always valid
 * @returns The properly formatted fallback number
 */
export function getFallbackNumber(): string {
  const rawNumber = runtimeFallbackNumber || DEFAULT_FALLBACK_PHONE_NUMBER;
  const cleaned = basicCleanPhoneNumber(rawNumber);

  // Log if we had to format the fallback number
  if (cleaned !== rawNumber) {
    console.log(
      `🔧 Fallback number formatted from "${rawNumber}" to "${cleaned}"`
    );
  }

  return cleaned;
}

/**
 * Resets the fallback number to the default from environment
 */
export function resetFallbackNumber(): void {
  console.log(
    `🔄 Resetting fallback number to default: "${DEFAULT_FALLBACK_PHONE_NUMBER}"`
  );
  runtimeFallbackNumber = null;
}
