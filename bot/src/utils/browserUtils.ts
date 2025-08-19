/**
 * Browser Utilities - Chromium Optimized
 * Centralized functions for Chromium/browser management with whatsapp-web.js
 */

import * as os from 'os';
import { puppeteerConfig } from "../config/PuppeteerConfig";

// Mock logger for now since the service might not be available
const logger = {
  info: (msg: string, prefix?: string) => console.log(`${prefix || ''} ${msg}`),
  warn: (msg: string) => console.warn(`⚠️ ${msg}`),
  error: (msg: string) => console.error(`❌ ${msg}`)
};

/**
 * Clean Chromium session directory to resolve SingletonLock conflicts
 */
export async function cleanChromiumSession(sessionPath: string): Promise<boolean> {
  try {
    const fs = await import('fs');
    const path = await import('path');

    logger.info(`Cleaning Chromium session directory: ${sessionPath}`, "🧹");

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
      logger.info(`Successfully cleaned ${cleanedFiles} Chromium lock file(s)`);
    } else {
      logger.info("No Chromium lock files found to clean");
    }

    return true;

  } catch (error) {
    logger.error(`Error cleaning Chromium session: ${error}`);
    return false;
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use cleanChromiumSession instead
 */
export const cleanChromeSession = cleanChromiumSession;

/**
 * Get system information for debugging
 */
export function getSystemInfo(): void {
  try {
    logger.info("System Information:", "💻");
    logger.info(`   Platform: ${process.platform} ${process.arch}`);
    logger.info(`   Node.js: ${process.version}`, "💚");
    logger.info(`   Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB used / ${Math.round(os.totalmem() / 1024 / 1024)}MB total`, "🧠");
    
    // Check if using bundled or system Chromium
    const validation = puppeteerConfig.validateChromium();
    if (validation.usingBundled) {
      logger.info(`   Browser: Puppeteer's bundled Chromium (recommended)`, "🔧");
    } else {
      const chromiumPath = puppeteerConfig.findChromiumPath();
      logger.info(`   Browser: System Chromium at ${chromiumPath}`, "🔧");
    }
    
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
    
    const validation = puppeteerConfig.validateChromium();
    
    // Log Chromium status
    if (validation.usingBundled) {
      logger.info("Browser: Puppeteer's bundled Chromium (recommended)", "🔧");
    } else {
      const chromiumPath = puppeteerConfig.findChromiumPath();
      logger.info(`Browser: System Chromium at ${chromiumPath}`, "🔧");
    }
    
    // Log validation results
    validation.logs.forEach(log => logger.info(log));
    
    if (!validation.isValid) {
      logger.warn("Chromium validation failed, but this may be expected for bundled Chromium");
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
export function getPuppeteerConfiguration(customChromiumPath?: string) {
  return puppeteerConfig.getConfiguration({
    customChromiumPath,
    headless: true,
  });
}
