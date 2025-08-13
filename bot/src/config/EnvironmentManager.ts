
import { botLogger } from "../utils";
import * as path from "path";
import * as fs from "fs";
import * as dotenv from "dotenv";
import { EnvironmentConfig } from "../types/types";
/**
 * Environment Manager - Multi-Instance Bot Configuration
 * 
 * This class manages environment variables for multiple bot instances.
 * Each bot instance can have different configurations:
 * 
 * - Development: Uses .env file with different BOT_ID, BOT_PORT, etc.
 * - Production: Uses PM2 ecosystem with environment-specific variables
 * 
 * The centralized exports at the bottom allow easy access to configuration
 * variables throughout the codebase without needing to call getConfig() 
 * repeatedly in every file.
 * 
 * Example usage in other files:
 * import { BOT_ID, BOT_PORT, SESSION_PATH } from "../config/EnvironmentManager";
 */
export class EnvironmentManager {
  private static instance: EnvironmentManager;
  private config: EnvironmentConfig;

  private constructor() {
    // Load environment variables first
    this.loadDotenv();
    this.config = this.loadEnvironmentConfig();
  }

  public static getInstance(): EnvironmentManager {
    if (!EnvironmentManager.instance) {
      EnvironmentManager.instance = new EnvironmentManager();
    }
    return EnvironmentManager.instance;
  }

  private loadDotenv(): void {
    // Try to load .env file from bot directory
    const envPath = path.join(__dirname, "../../.env");

    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath });
      botLogger.environmentInfo(`Loaded environment variables from: ${envPath}`);
    } else {
      // Fallback to default dotenv behavior
      dotenv.config();
      botLogger.environmentInfo("Using default .env file loading");
    }
  }

  private loadEnvironmentConfig(): EnvironmentConfig {
    // BOT_ID is required and must be provided via environment variables or PM2
    // eslint-disable-next-line node/no-process-env
    const BOT_ID = process.env.BOT_ID;

    if (!BOT_ID) {
      throw new Error(
        "BOT_ID environment variable is required. " +
          "Please set BOT_ID in your environment file or PM2 configuration."
      );
    }

    // eslint-disable-next-line node/no-process-env
    const BOT_NAME = process.env.BOT_NAME || `WhatsApp Bot ${BOT_ID}`;
    // eslint-disable-next-line node/no-process-env
    const BOT_PORT = parseInt(process.env.BOT_PORT || "3000");
    // eslint-disable-next-line node/no-process-env
    const BOT_TYPE = process.env.BOT_TYPE || "whatsapp";
    // eslint-disable-next-line node/no-process-env
    const NODE_ENV = process.env.NODE_ENV || "development";
    // eslint-disable-next-line node/no-process-env
    const CHROME_PATH =
      // eslint-disable-next-line node/no-process-env
      process.env.CHROME_PATH || "/usr/bin/google-chrome-stable";

    // Phone number configuration
    // eslint-disable-next-line node/no-process-env
    const DEFAULT_FALLBACK_PHONE_NUMBER = process.env.FALLBACKNUMBER || "+18298870174";

    // Centralized data paths
    const DATA_ROOT = path.join(__dirname, "../../../../data");
    const SESSION_PATH = path.join(DATA_ROOT, "sessions", BOT_ID);
    const QR_PATH = path.join(DATA_ROOT, "qr-codes");
    const LOGS_PATH = path.join(DATA_ROOT, "logs", BOT_ID);

    return {
      BOT_ID,
      BOT_NAME,
      BOT_PORT,
      BOT_TYPE,
      NODE_ENV,
      CHROME_PATH,
      DEFAULT_FALLBACK_PHONE_NUMBER,
      DATA_ROOT,
      SESSION_PATH,
      QR_PATH,
      LOGS_PATH,
    };
  }

  public getConfig(): EnvironmentConfig {
    return this.config;
  }

  public getEnvSource(envVar: string): string {
    // eslint-disable-next-line node/no-process-env
    const value = process.env[envVar];
    if (!value) return "default";

    // Check if running under PM2
    // eslint-disable-next-line node/no-process-env
    if (process.env.pm_id) return "PM2";

    // Check if .env file exists and contains this variable
    const envFilePath = path.join(process.cwd(), ".env");
    if (fs.existsSync(envFilePath)) {
      try {
        const envFileContent = fs.readFileSync(envFilePath, "utf-8");
        if (envFileContent.includes(`${envVar}=`)) {
          return ".env file";
        }
      } catch (error) {
        // Ignore file read errors
      }
    }

    return "system/shell";
  }

  public isPM2(): boolean {
    // eslint-disable-next-line node/no-process-env
    return !!process.env.pm_id;
  }

  public getPM2Variables(): Record<string, string> {
    if (!this.isPM2()) return {};

    return {
      // eslint-disable-next-line node/no-process-env
      PM2_ID: process.env.pm_id || "N/A",
      // eslint-disable-next-line node/no-process-env
      PM2_INSTANCE_ID: process.env.PM2_INSTANCE_ID || "N/A",
      // eslint-disable-next-line node/no-process-env
      PM2_JSON_PROCESSING: process.env.PM2_JSON_PROCESSING || "N/A",
    };
  }

  public getProcessInfo(): Record<string, string | number> {
    return {
      PWD: process.cwd(),
      PID: process.pid,
    };
  }
}

/**
 * ============================================================================
 * CENTRALIZED EXPORTS FOR MULTI-INSTANCE BOT DEPLOYMENT
 * ============================================================================
 * 
 * These exports allow each bot instance to access its specific configuration
 * easily throughout the codebase. This is essential for:
 * 
 * 1. Development: Multiple .env files with different BOT_ID/PORT combinations
 * 2. Production: PM2 ecosystem with per-instance environment variables
 * 3. Testing: Different configurations for different test scenarios
 * 
 * Usage examples:
 * - import { BOT_ID, BOT_PORT } from "../config/EnvironmentManager";
 * - import { SESSION_PATH, QR_PATH } from "../config/EnvironmentManager";
 * - import { ENV_CONFIG } from "../config/EnvironmentManager"; // Full config
 */

// Initialize singleton instance and get configuration
const envManager = EnvironmentManager.getInstance();
const config = envManager.getConfig();

// Core bot identification variables (change per instance)
export const {
  BOT_ID,                    // Unique identifier for this bot instance
  BOT_NAME,                  // Display name for this bot instance
  BOT_PORT,                  // HTTP port for this bot instance
  BOT_TYPE,                  // Type of bot (whatsapp, telegram, etc.)
} = config;

// Environment and runtime configuration
export const {
  NODE_ENV,                  // Environment (development, production, test)
  CHROME_PATH,               // Path to Chrome executable
} = config;

// Bot-specific configuration
export const {
  DEFAULT_FALLBACK_PHONE_NUMBER,  // Fallback phone number for errors
} = config;

// Instance-specific file paths (derived from BOT_ID)
export const {
  DATA_ROOT,                 // Root data directory
  SESSION_PATH,              // WhatsApp session storage path
  QR_PATH,                   // QR code storage path  
  LOGS_PATH,                 // Log files path
} = config;

// Alternative export formats for different usage patterns
export { config as ENV_CONFIG };        // Complete configuration object
export { envManager as ENV_MANAGER };   // Singleton instance for advanced usage
