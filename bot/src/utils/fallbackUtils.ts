/* eslint-disable no-console */
import { DEFAULT_FALLBACK_PHONE_NUMBER } from "../constants/numbers";
import { cleanAndFormatPhoneNumber } from "./cleanAndFormatPhoneNumber";

// Mutable fallback number that can be changed at runtime
let runtimeFallbackNumber: string | null = null;

/**
 * Sets a new fallback number at runtime
 * @param newNumber - The new fallback number
 */
export function setFallbackNumber(newNumber: string): void {
  const { cleanedPhoneNumber } = cleanAndFormatPhoneNumber(newNumber);
  console.log(
    `📞 Updating fallback number from "${getFallbackNumber()}" to "${cleanedPhoneNumber}"`
  );
  runtimeFallbackNumber = cleanedPhoneNumber;
}

/**
 * Gets the current fallback number, with runtime override taking precedence
 * Also applies cleaning/formatting to ensure it's always valid
 * @returns The properly formatted fallback number
 */
export function getFallbackNumber(): string {
  const rawNumber = runtimeFallbackNumber || DEFAULT_FALLBACK_PHONE_NUMBER;
  const { cleanedPhoneNumber } = cleanAndFormatPhoneNumber(rawNumber);

  // Log if we had to format the fallback number
  if (cleanedPhoneNumber !== rawNumber) {
    console.log(
      `🔧 Fallback number formatted from "${rawNumber}" to "${cleanedPhoneNumber}"`
    );
  }

  return cleanedPhoneNumber;
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
