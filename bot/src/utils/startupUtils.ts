/**
 * Startup Utilities - Replaces StartupManager service class
 * 
 * Centralized startup functions following the new utility-based architecture
 * No more complex service classes - just simple, direct functions
 */

import { botLogger } from "./loggerWrapper";
import { EnvironmentManager } from "../config/EnvironmentManager";
import { puppeteerConfig } from "../config/PuppeteerConfig";
import { DirectoryManagerService } from "../services/DirectoryManagerService";

/**
 * Print all environment variables during startup
 */
export function printEnvironmentVariables(): void {
  botLogger.startupHeader("🔍 ENVIRONMENT VARIABLES VERIFICATION");

  const envManager = EnvironmentManager.getInstance();
  const config = envManager.getConfig();
  const processInfo = envManager.getProcessInfo();

  // Print main configuration
  botLogger.environmentVar("BOT_ID", config.BOT_ID, "EnvironmentManager");
  botLogger.environmentVar("BOT_NAME", config.BOT_NAME, envManager.getEnvSource("BOT_NAME"));
  botLogger.environmentVar("BOT_PORT", config.BOT_PORT, envManager.getEnvSource("BOT_PORT"));
  botLogger.environmentVar("BOT_TYPE", config.BOT_TYPE, envManager.getEnvSource("BOT_TYPE"));
  botLogger.environmentVar("NODE_ENV", config.NODE_ENV, envManager.getEnvSource("NODE_ENV"));
  botLogger.environmentVar("CHROME_PATH", config.CHROME_PATH, envManager.getEnvSource("CHROME_PATH"));

  // Print process info
  botLogger.environmentVar("PWD", processInfo.PWD as string, "system");
  botLogger.environmentVar("PID", processInfo.PID, "system");

  // Print PM2 variables if running under PM2
  if (envManager.isPM2()) {
    botLogger.info("📊 PM2 Environment Variables:");
    const pm2Vars = envManager.getPM2Variables();
    Object.entries(pm2Vars).forEach(([key, value]) => {
      botLogger.info(`   ${key}: ${value}`, "📊");
    });
  }

  // Print file paths
  botLogger.info("📁 File Paths:");
  botLogger.filePath("   DATA_ROOT", config.DATA_ROOT);
  botLogger.filePath("   SESSION_PATH", config.SESSION_PATH);
  botLogger.filePath("   QR_PATH", config.QR_PATH);
  botLogger.filePath("   LOGS_PATH", config.LOGS_PATH);
}

/**
 * Validate Chrome executable
 */
export function validateChrome(): boolean {
  botLogger.startupHeader("🔍 CHROME EXECUTABLE VALIDATION");

  const envManager = EnvironmentManager.getInstance();
  const config = envManager.getConfig();
  const result = puppeteerConfig.validate(config.CHROME_PATH);

  if (!result.isValid) {
    botLogger.error("Chrome validation failed. Cannot proceed.");
    
    // Log all validation details
    result.logs.forEach(log => {
      botLogger.info(log);
    });
    
    if (result.error) {
      botLogger.error(result.error);
    }
    
    if (result.alternativePaths && result.alternativePaths.length > 0) {
      botLogger.info("💡 Alternative Chrome paths found:");
      result.alternativePaths.forEach(path => {
        botLogger.info(`   ✅ ${path}`);
      });
    }
    
    return false;
  }

  // Log success details
  result.logs.forEach(log => {
    botLogger.info(log);
  });

  return true;
}

/**
 * Create required directories - delegates to DirectoryManagerService
 */
export function createStartupDirectories(): void {
  botLogger.startupHeader("📁 DIRECTORY CREATION");
  
  const directoryManager = new DirectoryManagerService();
  directoryManager.ensureDirectoriesExist();
}

/**
 * Complete startup initialization - replaces StartupManager.initialize()
 */
export async function initializeStartup(): Promise<boolean> {
  try {
    // Step 1: Print environment variables
    printEnvironmentVariables();

    // Step 2: Validate Chrome
    if (!validateChrome()) {
      return false;
    }

    // Step 3: Create directories
    createStartupDirectories();

    botLogger.success("All pre-flight checks passed. Ready to start bot.");
    return true;
  } catch (error) {
    botLogger.error(`Startup failed: ${error}`);
    return false;
  }
}

/**
 * Get configuration - replaces StartupManager.getConfig()
 */
export function getStartupConfig() {
  const envManager = EnvironmentManager.getInstance();
  return envManager.getConfig();
}
