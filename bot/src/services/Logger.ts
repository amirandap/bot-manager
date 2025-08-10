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

export class Logger {
  private static instance: Logger;
  private config: LoggerConfig;

  private constructor(config: LoggerConfig) {
    this.config = config;
    this.ensureLogDirectory();
  }

  public static getInstance(config?: LoggerConfig): Logger {
    if (!Logger.instance) {
      if (!config) {
        throw new Error("Logger must be initialized with config on first use");
      }
      Logger.instance = new Logger(config);
    }
    return Logger.instance;
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

  // Public logging methods
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

  public success(message: string, filename?: string): void {
    this.info(message, "✅", filename);
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

  public lifecycle(message: string): void {
    this.info(message, "🔄", "lifecycle.log");
  }

  // Special methods for startup logging
  public startupHeader(title: string): void {
    const separator = "=".repeat(60);
    this.info(`\n${separator}`);
    this.info(title);
    this.info(separator);
  }

  public environmentVar(
    name: string,
    value: string | number,
    source: string
  ): void {
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
