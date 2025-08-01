/**
 * Simple logger utility to centralize logging
 * This can be expanded to use a proper logging library if needed
 */

// eslint-disable-next-line @typescript-eslint/no-var-requires
const env = require("./env.js");

// Configuration to control log levels
const LOG_CONFIG = {
  // Initialize once from environment
  debugEnabled: env.isEnvEnabled("DEBUG"),
};

// eslint-disable-next-line
export const logger = {
  info: (message: string): void => {
    // eslint-disable-next-line no-console
    console.log(message);
  },
  warn: (message: string): void => {
    // eslint-disable-next-line no-console
    console.warn(message);
  },
  error: (message: string): void => {
    // eslint-disable-next-line no-console
    console.error(message);
  },
  debug: (message: string): void => {
    if (LOG_CONFIG.debugEnabled) {
      // eslint-disable-next-line no-console
      console.debug(message);
    }
  },
};

export default logger;
