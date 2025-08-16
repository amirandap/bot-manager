/**
 * Browser Utilities
 * Centralized functions for browser/Chrome management
 */

import { logger } from "../services/LoggerService";
import { puppeteerConfig } from "../config/PuppeteerConfig";

/**
 * Clean Chrome session directory to resolve SingletonLock conflicts
 */
export async function cleanChromeSession(sessionPath: string): Promise<boolean> {
  try {
    const fs = await import('fs');
    const path = await import('path');

    logger.info(`Cleaning Chrome session directory: ${sessionPath}`, "🧹");

    // Check if session directory exists
    if (!fs.existsSync(sessionPath)) {
      logger.info("Session directory does not exist, nothing to clean");
      return true;
    }

    // Remove singleton lock files specifically
    const lockFiles = [
      path.join(sessionPath, 'SingletonLock'),
      path.join(sessionPath, 'Default', 'SingletonLock'),
      path.join(sessionPath, 'SingletonSocket'),
      path.join(sessionPath, 'Default', 'SingletonSocket'),
    ];

    let cleanedFiles = 0;
    for (const lockFile of lockFiles) {
      try {
        if (fs.existsSync(lockFile)) {
          fs.unlinkSync(lockFile);
          cleanedFiles++;
          logger.info(`Removed lock file: ${path.basename(lockFile)}`, "🗑️");
        }
      } catch (error) {
        logger.warn(`Could not remove ${lockFile}: ${error}`);
      }
    }

    if (cleanedFiles > 0) {
      logger.info(`Successfully cleaned ${cleanedFiles} Chrome lock file(s)`);
    } else {
      logger.info("No Chrome lock files found to clean");
    }

    return true;

  } catch (error) {
    logger.error(`Error cleaning Chrome session: ${error}`);
    return false;
  }
}

/**
 * Get system information for debugging
 */
export function getSystemInfo(): void {
  try {
    const systemInfo = puppeteerConfig.getSystemInfo();
    
    logger.info("System Information:", "💻");
    logger.info(`   Platform: ${systemInfo.platform} ${systemInfo.arch}`);
    logger.info(`   Node.js: ${systemInfo.nodeVersion}`, "💚");
    logger.info(`   Memory: ${systemInfo.availableMemory}`, "🧠");
    
  } catch (error) {
    logger.warn(`Could not get system information: ${error}`);
  }
}

/**
 * Validate environment before browser startup
 */
export async function validateEnvironmentForBrowser(): Promise<boolean> {
  try {
    logger.info("Validating environment for browser startup...", "🔍");
    
    const validation = await puppeteerConfig.validateEnvironment();
    
    if (!validation.isValid) {
      logger.warn("Environment validation issues found:");
      validation.issues.forEach(issue => logger.warn(`  - ${issue}`));
      validation.recommendations.forEach(rec => logger.info(`  💡 ${rec}`, "💡"));
      
      // Don't fail startup for environment warnings, just log them
      logger.info("Proceeding with browser startup despite environment warnings...");
    } else {
      logger.info("Environment validation passed");
    }
    
    return true;
    
  } catch (error) {
    logger.error(`Environment validation failed: ${error}`);
    return false;
  }
}

/**
 * Get optimized Puppeteer configuration
 */
export function getPuppeteerConfiguration(customChromePath?: string) {
  return puppeteerConfig.getConfiguration({
    customChromePath,
    isProduction: process.env.NODE_ENV === "production",
    headless: true,
  });
}
