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
  // Unified request logging
  public logRequest(endpoint: string, requestId: string, status: 'received' | 'completed' | 'failed'): void {
    const emojis = { received: "📥", completed: "✅", failed: "❌" };
    const messages = { 
      received: "received", 
      completed: "completed", 
      failed: "failed" 
    };
    
    if (status === 'failed') {
      this.error(`${endpoint} request ${requestId} ${messages[status]}`);
    } else {
      this.info(`${endpoint} request ${requestId} ${messages[status]}`, emojis[status]);
    }
  }

  // Unified processing logging
  public logProcessing(type: 'message' | 'media' | 'group' | 'phone', action: string, target: string): void {
    const emojis = { message: "💬", media: "📎", group: "🏢", phone: "📱" };
    this.info(`${action}: ${target}`, emojis[type]);
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

  // Unified Chrome validation logging
  public logChrome(action: 'check' | 'found' | 'notFound' | 'notExecutable' | 'success' | 'alternatives', pathValue?: string, error?: unknown): void {
    switch (action) {
      case 'check':
        this.info(`Checking Chrome executable at: ${pathValue}`, "🔍");
        break;
      case 'found':
        this.info(`Found: ${pathValue}`, "   ");
        break;
      case 'notFound':
        this.error(`Chrome executable not found at: ${pathValue}`);
        break;
      case 'notExecutable':
        this.error(`Chrome executable found but not executable: ${pathValue}`);
        this.error(`   Error: ${error}`);
        break;
      case 'success':
        this.success(`Chrome executable validated successfully: ${pathValue}`);
        break;
      case 'alternatives':
        this.info("Available alternatives:", "💡");
        break;
    }
  }

  // Unified directory operations
  public logDirectory(action: 'created' | 'exists', pathValue: string): void {
    const messages = { created: "Created directory", exists: "Directory exists" };
    const emoji = action === 'created' ? "📁" : "✅";
    this.info(`${messages[action]}: ${pathValue}`, emoji);
  }
}

// Create unified logger instance for direct usage - eliminates wrapper overhead
const unifiedLoggerInstance = UnifiedLogger.getInstance();

// Export directly for maximum efficiency
export const botLogger = unifiedLoggerInstance;

// Export the class for advanced usage (with config)
export { UnifiedLogger };

// Export Logger class for backward compatibility
export const Logger = UnifiedLogger;

export default unifiedLoggerInstance;
