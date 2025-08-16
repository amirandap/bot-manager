import { PhoneNumberValidation, CountryConfig } from "../types";
 
import { logger } from "../services/LoggerService";

// Move fallback number to avoid circular dependency
const DEFAULT_FALLBACK_NUMBER = "+18095551234";

const PHONE_CONSTRAINTS = {
  MIN_LENGTH: 10,
  MAX_LENGTH: 15,
  COUNTRY_CODE_PREFIX: "+",
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
    code: "AR",
    name: "Argentina",
    pattern: REGEX_PATTERNS.ARGENTINA_MOBILE,
    formatter: (number: string) => number.replace("+54", "+549"),
  },
];

const DOMINICAN_PATTERNS = [
  {
    name: "standard",
    pattern: REGEX_PATTERNS.DOMINICAN_STANDARD,
    handler: (number: string): string => formatDominicanNumber(number),
  },
  {
    name: "extended",
    pattern: REGEX_PATTERNS.DOMINICAN_EXTENDED,
    handler: (number: string): string => formatDominicanNumber(number),
  },
  {
    name: "full",
    pattern: REGEX_PATTERNS.DOMINICAN_FULL,
    handler: (number: string): string => ensureCountryCodePrefix(number),
  },
];

function sanitizePhoneNumber(phoneNumber: string): string {
  return phoneNumber.replace(REGEX_PATTERNS.NON_NUMERIC, "");
}

function formatDominicanNumber(number: string): string {
  if (number.startsWith("+1")) {
    return number;
  }

  return number.startsWith("1") ? `+${number}` : `+1${number}`;
}

function ensureCountryCodePrefix(number: string): string {
  return number.startsWith("+") ? number : `+${number}`;
}

function applyCountrySpecificFormatting(number: string): string {
  for (const config of COUNTRY_CONFIGS) {
    if (config.pattern.test(number)) {
      const formatted = config.formatter(number);
      logger.logProcessing('phone', 
        `${config.name} number detected`, formatted);
      return formatted;
    }
  }

  for (const domPattern of DOMINICAN_PATTERNS) {
    if (domPattern.pattern.test(number)) {
      const formatted = domPattern.handler(number);
      logger.logProcessing('phone', 
        `Dominican number (${domPattern.name}) detected`,
        formatted
      );
      return formatted;
    }
  }

  if (REGEX_PATTERNS.INTERNATIONAL.test(number) && !number.startsWith("+")) {
    const formatted = ensureCountryCodePrefix(number);
    logger.logProcessing('phone', "International number detected, adding +", formatted
    );
    return formatted;
  }

  return number;
}

function validatePhoneNumber(phoneNumber: string): boolean {
  const hasCountryCode = phoneNumber.startsWith(
    PHONE_CONSTRAINTS.COUNTRY_CODE_PREFIX
  );
  const isValidLength =
    phoneNumber.length >= PHONE_CONSTRAINTS.MIN_LENGTH &&
    phoneNumber.length <= PHONE_CONSTRAINTS.MAX_LENGTH;

  return hasCountryCode && isValidLength;
}

function createResult(
  phoneNumber: string,
  isValid: boolean
): PhoneNumberValidation {
  if (isValid) {
    return { cleanedPhoneNumber: phoneNumber, isValid: true };
  }

  // Use local fallback to avoid circular dependency
  const fallbackNumber = DEFAULT_FALLBACK_NUMBER;
  return { cleanedPhoneNumber: fallbackNumber, isValid: false };
}

export function cleanAndFormatPhoneNumber(
  phoneNumber: string
): PhoneNumberValidation {
  logger.logProcessing('phone', "Processing phone number", phoneNumber);

  const cleaned = sanitizePhoneNumber(phoneNumber);
  logger.logProcessing('phone', "Cleaned number", cleaned);

  const formatted = applyCountrySpecificFormatting(cleaned);
  logger.logProcessing('phone', "Final formatted number", formatted);

  const isValid = validatePhoneNumber(formatted);
  logger.logProcessing('phone',
    `Number validation: ${isValid ? "VALID" : "INVALID"}`,
    formatted
  );

  return createResult(formatted, isValid);
}

// Remove the duplicate type export since it's now in types.ts
