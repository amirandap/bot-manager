/**
 * UNIFIED LOGGER - Consolidates Logger.ts and loggerWrapper.ts
 * 
 * Eliminates duplicate logging functionality by combining:
 * - Simple direct console logging (from original loggerWrapper)
 * - File logging capabilities (from Logger service)
 * - Configuration options (from Logger service)
 * - Bot-specific methods (from original loggerWrapper)
 * - Startup and validation methods (from Logger service)
 */

import * as fs from "fs";
import * as path from "path";

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LoggerConfig {
  logLevel: LogLevel;
  logToFile: boolean;
  logToConsole: boolean;
  logDirectory: string;
}

class UnifiedLogger {
  private static instance: UnifiedLogger;
  private config: LoggerConfig;

  private constructor(config?: LoggerConfig) {
    // Default config for simple usage
    this.config = config || {
      logLevel: LogLevel.INFO,
      logToFile: false,
      logToConsole: true,
      logDirectory: "./logs"
    };
    
    if (this.config.logToFile) {
      this.ensureLogDirectory();
    }
  }

  public static getInstance(config?: LoggerConfig): UnifiedLogger {
    if (!UnifiedLogger.instance) {
      UnifiedLogger.instance = new UnifiedLogger(config);
    }
    return UnifiedLogger.instance;
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.config.logDirectory)) {
      fs.mkdirSync(this.config.logDirectory, { recursive: true });
    }
  }

  private writeToFile(filename: string, message: string): void {
    if (!this.config.logToFile) return;

    try {
      const logFile = path.join(this.config.logDirectory, filename);
      const timestamp = new Date().toISOString();
      const formattedMessage = `${timestamp} - ${message}\n`;
      fs.appendFileSync(logFile, formattedMessage);
    } catch (error) {
      // Silent fail for logging errors to avoid recursion
    }
  }

  // ===== CORE LOGGING METHODS =====
  public info(message: string, emoji?: string, filename?: string): void {
    const consoleMessage = emoji ? `${emoji} ${message}` : message;

    if (this.config.logToConsole) {
      // eslint-disable-next-line no-console
      console.log(consoleMessage);
    }

    if (filename) {
      this.writeToFile(filename, message);
    }
  }

  public error(message: string, filename?: string): void {
    const consoleMessage = `❌ ${message}`;

    if (this.config.logToConsole) {
      // eslint-disable-next-line no-console
      console.error(consoleMessage);
    }

    if (filename) {
      this.writeToFile(filename, message);
    }
  }

  public warn(message: string, filename?: string): void {
    const consoleMessage = `⚠️ ${message}`;

    if (this.config.logToConsole) {
      // eslint-disable-next-line no-console
      console.warn(consoleMessage);
    }

    if (filename) {
      this.writeToFile(filename, message);
    }
  }

  public success(message: string, filename?: string): void {
    this.info(message, "✅", filename);
  }

  public lifecycle(message: string): void {
    this.info(message, "🔄", "lifecycle.log");
  }

  // ===== BOT-SPECIFIC METHODS =====
  public requestReceived(endpoint: string, requestId: string): void {
    this.info(`${endpoint} request ${requestId} received`, "📥");
  }

  public requestCompleted(endpoint: string, requestId: string): void {
    this.info(`${endpoint} request ${requestId} completed`, "✅");
  }

  public requestFailed(endpoint: string, requestId: string): void {
    this.error(`${endpoint} request ${requestId} failed`);
  }

  public messageProcessing(action: string, recipient: string): void {
    this.info(`${action}: ${recipient}`, "💬");
  }

  public mediaProcessing(mediaType: string, recipient: string): void {
    this.info(`${mediaType} processing for: ${recipient}`, "📎");
  }

  public groupOperation(action: string, groupId: string): void {
    this.info(`${action} group: ${groupId}`, "🏢");
  }

  public phoneNumberProcessing(action: string, phoneNumber: string): void {
    this.info(`${action}: ${phoneNumber}`, "📱");
  }

  public environmentInfo(message: string): void {
    this.info(message, "📁");
  }

  public errorWithContext(message: string, error: unknown): void {
    const errorMsg = error instanceof Error ? error.message : String(error);
    this.error(`${message}: ${errorMsg}`);
  }

  // ===== STARTUP & VALIDATION METHODS =====
  public startupHeader(title: string): void {
    const separator = "=".repeat(60);
    this.info(`\n${separator}`);
    this.info(title);
    this.info(separator);
  }

  public environmentVar(name: string, value: string | number, source: string): void {
    this.info(`${name}: ${value} (${source})`, "📋");
  }

  public filePath(name: string, pathValue: string): void {
    this.info(`${name}: ${pathValue}`, "📁");
  }

  // Chrome validation specific
  public chromeCheck(pathValue: string): void {
    this.info(`Checking Chrome executable at: ${pathValue}`, "🔍");
  }

  public chromeNotFound(pathValue: string): void {
    this.error(`Chrome executable not found at: ${pathValue}`);
  }

  public chromeAlternatives(): void {
    this.info("Available alternatives:", "💡");
  }

  public chromeFound(pathValue: string): void {
    this.info(`Found: ${pathValue}`, "   ");
  }

  public chromeSuccess(pathValue: string): void {
    this.success(`Chrome executable validated successfully: ${pathValue}`);
  }

  public chromeNotExecutable(pathValue: string, error: unknown): void {
    this.error(`Chrome executable found but not executable: ${pathValue}`);
    this.error(`   Error: ${error}`);
  }

  // Directory operations
  public directoryCreated(pathValue: string): void {
    this.info(`Created directory: ${pathValue}`, "📁");
  }

  public directoryExists(pathValue: string): void {
    this.info(`Directory exists: ${pathValue}`, "✅");
  }
}

// Create unified logger instance for simple usage (maintains backward compatibility)
const unifiedLoggerInstance = UnifiedLogger.getInstance();

export const botLogger = {
  // Core methods
  info: (message: string, emoji?: string) => unifiedLoggerInstance.info(message, emoji),
  error: (message: string) => unifiedLoggerInstance.error(message),
  warn: (message: string) => unifiedLoggerInstance.warn(message),
  success: (message: string) => unifiedLoggerInstance.success(message),
  lifecycle: (message: string) => unifiedLoggerInstance.lifecycle(message),

  // Bot-specific methods
  requestReceived: (endpoint: string, requestId: string) => unifiedLoggerInstance.requestReceived(endpoint, requestId),
  requestCompleted: (endpoint: string, requestId: string) => unifiedLoggerInstance.requestCompleted(endpoint, requestId),
  requestFailed: (endpoint: string, requestId: string) => unifiedLoggerInstance.requestFailed(endpoint, requestId),
  messageProcessing: (action: string, recipient: string) => unifiedLoggerInstance.messageProcessing(action, recipient),
  mediaProcessing: (mediaType: string, recipient: string) => unifiedLoggerInstance.mediaProcessing(mediaType, recipient),
  groupOperation: (action: string, groupId: string) => unifiedLoggerInstance.groupOperation(action, groupId),
  phoneNumberProcessing: (action: string, phoneNumber: string) => unifiedLoggerInstance.phoneNumberProcessing(action, phoneNumber),
  environmentInfo: (message: string) => unifiedLoggerInstance.environmentInfo(message),
  errorWithContext: (message: string, error: unknown) => unifiedLoggerInstance.errorWithContext(message, error),

  // Startup and validation methods
  startupHeader: (title: string) => unifiedLoggerInstance.startupHeader(title),
  environmentVar: (name: string, value: string | number, source: string) => unifiedLoggerInstance.environmentVar(name, value, source),
  filePath: (name: string, pathValue: string) => unifiedLoggerInstance.filePath(name, pathValue),
  chromeCheck: (pathValue: string) => unifiedLoggerInstance.chromeCheck(pathValue),
  chromeNotFound: (pathValue: string) => unifiedLoggerInstance.chromeNotFound(pathValue),
  chromeAlternatives: () => unifiedLoggerInstance.chromeAlternatives(),
  chromeFound: (pathValue: string) => unifiedLoggerInstance.chromeFound(pathValue),
  chromeSuccess: (pathValue: string) => unifiedLoggerInstance.chromeSuccess(pathValue),
  chromeNotExecutable: (pathValue: string, error: unknown) => unifiedLoggerInstance.chromeNotExecutable(pathValue, error),
  directoryCreated: (pathValue: string) => unifiedLoggerInstance.directoryCreated(pathValue),
  directoryExists: (pathValue: string) => unifiedLoggerInstance.directoryExists(pathValue),
};

// Export the class for advanced usage (with config)
export { UnifiedLogger };

// Export Logger class for backward compatibility
export const Logger = UnifiedLogger;

export default botLogger;
