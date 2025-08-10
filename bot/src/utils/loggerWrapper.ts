/**
 * Logger Wrapper for Bot Components
 *
 * This wrapper provides a consistent logging interface across all components,
 * replacing direct console statements with structured logging.
 */

import { Logger } from "../services/Logger";

// Lazy-loaded logger instance to avoid circular dependencies
let logger: Logger | null = null;

function getLogger(): Logger {
  if (!logger) {
    try {
      logger = Logger.getInstance();
    } catch (error) {
      // Logger not initialized yet, fall back to console
      return null as any;
    }
  }
  return logger;
}

export const botLogger = {
  info: (message: string, emoji?: string) => {
    const loggerInstance = getLogger();
    if (loggerInstance) {
      loggerInstance.info(message, emoji);
    } else {
      // Fall back to console if logger not ready
      const consoleMessage = emoji ? `${emoji} ${message}` : message;
      // eslint-disable-next-line no-console
      console.log(consoleMessage);
    }
  },

  error: (message: string) => {
    const loggerInstance = getLogger();
    if (loggerInstance) {
      loggerInstance.error(message);
    } else {
      // Fall back to console if logger not ready
      // eslint-disable-next-line no-console
      console.error(`❌ ${message}`);
    }
  },

  warn: (message: string) => {
    const loggerInstance = getLogger();
    if (loggerInstance) {
      loggerInstance.warn(message);
    } else {
      // Fall back to console if logger not ready
      // eslint-disable-next-line no-console
      console.warn(`⚠️ ${message}`);
    }
  },

  // Specific methods for common bot operations with emojis
  requestReceived: (endpoint: string, requestId: string) => {
    botLogger.info(`${endpoint} request ${requestId} received`, "📥");
  },

  requestCompleted: (endpoint: string, requestId: string) => {
    botLogger.info(`${endpoint} request ${requestId} completed`, "✅");
  },

  requestFailed: (endpoint: string, requestId: string) => {
    botLogger.error(`${endpoint} request ${requestId} failed`);
  },

  messageProcessing: (action: string, recipient: string) => {
    botLogger.info(`${action}: ${recipient}`, "💬");
  },

  mediaProcessing: (mediaType: string, recipient: string) => {
    botLogger.info(`${mediaType} processing for: ${recipient}`, "📎");
  },

  groupOperation: (action: string, groupId: string) => {
    botLogger.info(`${action} group: ${groupId}`, "🏢");
  },

  phoneNumberProcessing: (action: string, phoneNumber: string) => {
    botLogger.info(`${action}: ${phoneNumber}`, "📱");
  },

  environmentInfo: (message: string) => {
    botLogger.info(message, "📁");
  },

  errorWithContext: (message: string, error: unknown) => {
    const errorMsg = error instanceof Error ? error.message : String(error);
    botLogger.error(`${message}: ${errorMsg}`);
  },
};

export default botLogger;
