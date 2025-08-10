import { botLogger } from '../utils/loggerWrapper';\n\nimport * as path from "path";
import * as fs from "fs";
import * as dotenv from "dotenv";
import { EnvironmentConfig } from "../types/types";

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
      botLogger.environmentInfo(`📁 Loaded environment variables from: ${envPath}`);
    } else {
      // Fallback to default dotenv behavior
      dotenv.config();
      console.log("📁 Using default .env file loading");
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

// Centralized environment exports
const envManager = EnvironmentManager.getInstance();
const config = envManager.getConfig();

// Export individual variables for direct import
export const {
  BOT_ID,
  BOT_NAME,
  BOT_PORT,
  BOT_TYPE,
  NODE_ENV,
  CHROME_PATH,
  DATA_ROOT,
  SESSION_PATH,
  QR_PATH,
  LOGS_PATH,
} = config;

// Export the config object for those who need the full configuration
export { config as ENV_CONFIG };

// Export the singleton instance for advanced usage
export { envManager as ENV_MANAGER };
