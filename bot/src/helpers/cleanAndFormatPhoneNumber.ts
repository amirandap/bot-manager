import { getFallbackNumber } from "../utils/fallbackUtils";

interface PhoneNumberResult {
  cleanedPhoneNumber: string;
  isValid: boolean;
}

interface CountryConfig {
  code: string;
  name: string;
  pattern: RegExp;
  formatter: (number: string) => string;
}

const PHONE_CONSTRAINTS = {
  MIN_LENGTH: 10,
  MAX_LENGTH: 15,
  COUNTRY_CODE_PREFIX: '+',
} as const;

const REGEX_PATTERNS = {
  NON_NUMERIC: /[^\d+]/g,
  ARGENTINA_MOBILE: /^\+541/,
  DOMINICAN_STANDARD: /^(\+?1)?(809|829|849)\d{7}$/,
  DOMINICAN_EXTENDED: /^(\+?1)?(809|829|849)\d{7,10}$/,
  DOMINICAN_FULL: /^(\+?1)(809|829|849)\d{7,10}$/,
  INTERNATIONAL: /^\d{10,15}$/,
} as const;

const COUNTRY_CONFIGS: CountryConfig[] = [
  {
    code: 'AR',
    name: 'Argentina',
    pattern: REGEX_PATTERNS.ARGENTINA_MOBILE,
    formatter: (number: string) => number.replace('+54', '+549'),
  },
];

const DOMINICAN_PATTERNS = [
  {
    name: 'standard',
    pattern: REGEX_PATTERNS.DOMINICAN_STANDARD,
    handler: (number: string): string => formatDominicanNumber(number),
  },
  {
    name: 'extended',
    pattern: REGEX_PATTERNS.DOMINICAN_EXTENDED,
    handler: (number: string): string => formatDominicanNumber(number),
  },
  {
    name: 'full',
    pattern: REGEX_PATTERNS.DOMINICAN_FULL,
    handler: (number: string): string => ensureCountryCodePrefix(number),
  },
];

function sanitizePhoneNumber(phoneNumber: string): string {
  return phoneNumber.replace(REGEX_PATTERNS.NON_NUMERIC, '');
}

function formatDominicanNumber(number: string): string {
  if (number.startsWith('+1')) {
    return number;
  }
  
  return number.startsWith('1') ? `+${number}` : `+1${number}`;
}

function ensureCountryCodePrefix(number: string): string {
  return number.startsWith('+') ? number : `+${number}`;
}

function applyCountrySpecificFormatting(number: string): string {
  for (const config of COUNTRY_CONFIGS) {
    if (config.pattern.test(number)) {
      const formatted = config.formatter(number);
      console.log(`🇦🇷 ${config.name} number detected: "${formatted}"`);
      return formatted;
    }
  }

  for (const domPattern of DOMINICAN_PATTERNS) {
    if (domPattern.pattern.test(number)) {
      const formatted = domPattern.handler(number);
      console.log(`🇩🇴 Dominican number (${domPattern.name}) detected: "${formatted}"`);
      return formatted;
    }
  }

  if (REGEX_PATTERNS.INTERNATIONAL.test(number) && !number.startsWith('+')) {
    const formatted = ensureCountryCodePrefix(number);
    console.log(`🌍 International number detected, adding +: "${formatted}"`);
    return formatted;
  }

  return number;
}

function validatePhoneNumber(phoneNumber: string): boolean {
  const hasCountryCode = phoneNumber.startsWith(PHONE_CONSTRAINTS.COUNTRY_CODE_PREFIX);
  const isValidLength = phoneNumber.length >= PHONE_CONSTRAINTS.MIN_LENGTH && 
                       phoneNumber.length <= PHONE_CONSTRAINTS.MAX_LENGTH;
  
  return hasCountryCode && isValidLength;
}

function createResult(phoneNumber: string, isValid: boolean): PhoneNumberResult {
  if (isValid) {
    return { cleanedPhoneNumber: phoneNumber, isValid: true };
  }

  const fallbackNumber = getFallbackNumber();
  console.log(`❌ Using fallback number: "${fallbackNumber}"`);
  return { cleanedPhoneNumber: fallbackNumber, isValid: false };
}

/**
 * Cleans and formats a phone number according to international standards
 * 
 * @param phoneNumber - The raw phone number to process
 * @returns Object containing the cleaned phone number and validation status
 */
export function cleanAndFormatPhoneNumber(phoneNumber: string): PhoneNumberResult {
  console.log(`🔍 Processing phone number: "${phoneNumber}"`);

  const cleaned = sanitizePhoneNumber(phoneNumber);
  console.log(`🧹 Cleaned number: "${cleaned}"`);

  const formatted = applyCountrySpecificFormatting(cleaned);
  console.log(`📞 Final formatted number: "${formatted}"`);

  const isValid = validatePhoneNumber(formatted);
  console.log(`✅ Number validation: ${isValid ? "VALID" : "INVALID"}`);

  return createResult(formatted, isValid);
}

export type { PhoneNumberResult };
