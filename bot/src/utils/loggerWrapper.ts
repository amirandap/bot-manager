/**
 * Logger Wrapper for Bot Components
 *
 * This wrapper provides a consistent logging interface across all components,
 * replacing direct console statements with structured logging.
 */

import { Logger } from "../services/Logger";

// Get logger instance with default config for bot operations
const logger = Logger.getInstance();

export const botLogger = {
  info: (message: string, emoji?: string) => {
    logger.info(message, emoji);
  },

  error: (message: string) => {
    logger.error(message);
  },

  warn: (message: string) => {
    logger.warn(message);
  },

  // Specific methods for common bot operations with emojis
  requestReceived: (endpoint: string, requestId: string) => {
    logger.info(`${endpoint} request ${requestId} received`, "📥");
  },

  requestCompleted: (endpoint: string, requestId: string) => {
    logger.info(`${endpoint} request ${requestId} completed`, "✅");
  },

  requestFailed: (endpoint: string, requestId: string) => {
    logger.error(`${endpoint} request ${requestId} failed`);
  },

  messageProcessing: (action: string, recipient: string) => {
    logger.info(`${action}: ${recipient}`, "💬");
  },

  mediaProcessing: (mediaType: string, recipient: string) => {
    logger.info(`${mediaType} processing for: ${recipient}`, "📎");
  },

  groupOperation: (action: string, groupId: string) => {
    logger.info(`${action} group: ${groupId}`, "🏢");
  },

  phoneNumberProcessing: (action: string, phoneNumber: string) => {
    logger.info(`${action}: ${phoneNumber}`, "📱");
  },

  environmentInfo: (message: string) => {
    logger.info(message, "📁");
  },

  errorWithContext: (message: string, error: unknown) => {
    const errorMsg = error instanceof Error ? error.message : String(error);
    logger.error(`${message}: ${errorMsg}`);
  },
};

export default botLogger;
