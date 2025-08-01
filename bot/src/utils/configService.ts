/**
 * ConfigService: Centralized configuration management for the bot
 *
 * This service provides a single source of truth for all configuration values,
 * handling environment variables from both .env files and PM2 ecosystem configs
 *
 * Note: This file intentionally uses process.env and console.log
 * because it's responsible for configuration management.
 */
/**
 * ConfigService: Centralized configuration management for the bot
 *
 * This service provides a single source of truth for all configuration values,
 * handling environment variables from both .env files and PM2 ecosystem configs
 */

import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { logger } from "./logger";
// eslint-disable-next-line @typescript-eslint/no-var-requires
const env = require("./env.js");

// Load .env file if it exists (for local development)
const envPath = path.resolve(__dirname, "../../../.env");
if (fs.existsSync(envPath)) {
  logger.info(`📄 Loading environment from ${envPath}`);
  dotenv.config({ path: envPath });
} else {
  logger.warn("⚠️ No .env file found, using process.env values");
  dotenv.config();
}

class ConfigService {
  private static instance: ConfigService;
  private config: Record<string, string | number | boolean | undefined> = {};

  private constructor() {
    // Initialize with environment variables
    this.loadEnvironmentVariables();

    // Generate BOT_ID if not provided
    if (!this.config.BOT_ID) {
      this.config.BOT_ID = `whatsapp-bot-${Date.now()}`;
      logger.info(`🆔 Generated BOT_ID: ${this.config.BOT_ID}`);
    }

    // Set defaults for required configuration
    this.setDefaults();
  }

  /**
   * Load environment variables in a controlled way
   */
  private loadEnvironmentVariables(): void {
    // Get all environment variables from our dedicated env utility
    const processEnv = env.getAllEnv();

    // Extract only the environment variables we need
    [
      "BOT_ID",
      "BOT_NAME",
      "BOT_PORT",
      "BOT_TYPE",
      "DATA_ROOT",
      "SESSION_FOLDER",
      "QR_FOLDER",
      "LOGS_FOLDER",
      "CHROME_PATH",
      "BASE_URL",
      "MANAGER_HOST",
      "MANAGER_PORT",
      "MEMORY_LIMIT_MB",
      "DEBUG",
    ].forEach((key) => {
      const value = processEnv[key];
      if (value !== undefined) {
        this.config[key] = value;
      }
    });
  }

  /**
   * Get the singleton instance of ConfigService
   */
  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  /**
   * Set default values for required configuration
   */
  private setDefaults(): void {
    // Bot configuration defaults
    this.setDefaultIfNotExists(
      "BOT_NAME",
      `WhatsApp Bot ${this.config.BOT_ID}`
    );
    this.setDefaultIfNotExists("BOT_PORT", "3000");
    this.setDefaultIfNotExists("BOT_TYPE", "whatsapp");

    // Path configuration
    const rootDir = path.resolve(__dirname, "../../..");
    this.setDefaultIfNotExists("DATA_ROOT", path.join(rootDir, "data"));
    this.setDefaultIfNotExists("SESSION_FOLDER", "sessions");
    this.setDefaultIfNotExists("QR_FOLDER", "qr-codes");
    this.setDefaultIfNotExists("LOGS_FOLDER", "logs");

    // Chrome configuration
    // Default to standard Chrome paths based on platform
    if (!this.config.CHROME_PATH) {
      if (process.platform === "darwin") {
        // macOS
        const macPaths = [
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          "/Applications/Chrome.app/Contents/MacOS/Chrome",
        ];
        for (const chromePath of macPaths) {
          if (fs.existsSync(chromePath)) {
            this.config.CHROME_PATH = chromePath;
            break;
          }
        }
      } else if (process.platform === "win32") {
        // Windows
        const winPaths = [
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
        ];
        for (const chromePath of winPaths) {
          if (fs.existsSync(chromePath)) {
            this.config.CHROME_PATH = chromePath;
            break;
          }
        }
      } else {
        // Linux and others
        this.config.CHROME_PATH = "/usr/bin/google-chrome-stable";
      }
    }

    // API and service configuration
    this.setDefaultIfNotExists(
      "BASE_URL",
      `http://localhost:${this.config.BOT_PORT}`
    );
    this.setDefaultIfNotExists("MANAGER_HOST", "localhost");
    this.setDefaultIfNotExists("MANAGER_PORT", "3001");

    // Memory management
    const defaultMemoryLimit = process.platform === "darwin" ? "2048" : "1024";
    this.setDefaultIfNotExists("MEMORY_LIMIT_MB", defaultMemoryLimit);
  }

  /**
   * Helper to set default value if not already set
   */
  private setDefaultIfNotExists(
    key: string,
    defaultValue: string | number | boolean
  ): void {
    if (this.config[key] === undefined) {
      this.config[key] = defaultValue;
    }
  }

  /**
   * Get a configuration value
   */
  public get<T>(key: string, defaultValue?: T): T {
    return (
      this.config[key] !== undefined ? this.config[key] : defaultValue
    ) as T;
  }

  /**
   * Get bot ID
   */
  public getBotId(): string {
    return this.get<string>("BOT_ID");
  }

  /**
   * Get bot name
   */
  public getBotName(): string {
    return this.get<string>("BOT_NAME");
  }

  /**
   * Get bot port
   */
  public getBotPort(): number {
    return parseInt(this.get<string>("BOT_PORT"));
  }

  /**
   * Get bot type
   */
  public getBotType(): string {
    return this.get<string>("BOT_TYPE");
  }

  /**
   * Get session path for this bot
   */
  public getSessionPath(): string {
    const dataRoot = this.get<string>("DATA_ROOT");
    const sessionsFolder = this.get<string>("SESSION_FOLDER");
    return path.join(dataRoot, sessionsFolder, this.getBotId());
  }

  /**
   * Get QR code path
   */
  public getQrPath(): string {
    const dataRoot = this.get<string>("DATA_ROOT");
    const qrFolder = this.get<string>("QR_FOLDER");
    return path.join(dataRoot, qrFolder);
  }

  /**
   * Get logs path for this bot
   */
  public getLogsPath(): string {
    const dataRoot = this.get<string>("DATA_ROOT");
    const logsFolder = this.get<string>("LOGS_FOLDER");
    return path.join(dataRoot, logsFolder, this.getBotId());
  }

  /**
   * Get Chrome executable path
   */
  public getChromePath(): string {
    return this.get<string>("CHROME_PATH");
  }

  /**
   * Get base URL for API endpoints
   */
  public getBaseUrl(): string {
    return this.get<string>("BASE_URL");
  }

  /**
   * Get bot manager host
   */
  public getManagerHost(): string {
    return this.get<string>("MANAGER_HOST");
  }

  /**
   * Get bot manager port
   */
  public getManagerPort(): string {
    return this.get<string>("MANAGER_PORT");
  }

  /**
   * Get memory limit in MB
   */
  public getMemoryLimitMB(): number {
    return parseInt(this.get<string>("MEMORY_LIMIT_MB"));
  }

  /**
   * Get all configuration
   */
  public getAll(): Record<string, string | number | boolean | undefined> {
    return { ...this.config };
  }
}

// Export the singleton instance
export const configService = ConfigService.getInstance();

export default configService;
