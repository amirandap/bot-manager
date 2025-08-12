/**
 * Browser Utilities
 * Centralized functions for browser/Chrome management
 */

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execSync } from "child_process";
import { botLogger } from "./loggerWrapper";
import { puppeteerConfig } from "../config/PuppeteerConfig";
import { 
  markStepSuccess, 
  markStepFailure, 
  STARTUP_STEPS 
} from "./pm2Utils";

/**
 * Validate Chrome installation and environment
 */
export async function validateBrowserEnvironment(): Promise<boolean> {
  try {
    botLogger.startupHeader("🔍 CHROME EXECUTABLE VALIDATION");

    const result = puppeteerConfig.validate();

    if (!result.isValid) {
      botLogger.error("Chrome validation failed:");
      result.logs.forEach(log => {
        if (log.includes("❌")) {
          botLogger.error(`   ${log}`);
        } else if (log.includes("⚠️")) {
          botLogger.warn(`   ${log}`);
        } else {
          botLogger.info(`   ${log}`);
        }
      });

      const error = new Error("Chrome executable validation failed");
      markStepFailure(STARTUP_STEPS.VALIDATION, error, { 
        chrome_validation: false,
        chrome_issues: result.logs.filter(log => log.includes("❌"))
      });
      
      return false;
    }

    // Log success details
    result.logs.forEach(log => {
      if (log.includes("✅")) {
        botLogger.success(`   ${log}`);
      } else {
        botLogger.info(`   ${log}`);
      }
    });

    botLogger.success("Chrome validation completed successfully");
    return true;

  } catch (error) {
    botLogger.error(`Chrome validation error: ${error}`);
    markStepFailure(STARTUP_STEPS.VALIDATION, error as Error, { 
      chrome_validation_error: true 
    });
    return false;
  }
}

/**
 * Clean Chrome session directory to resolve SingletonLock conflicts
 */
export async function cleanChromeSession(sessionPath: string): Promise<boolean> {
  try {
    const fs = await import('fs');
    const path = await import('path');

    botLogger.info(`Cleaning Chrome session directory: ${sessionPath}`, "🧹");

    // Check if session directory exists
    if (!fs.existsSync(sessionPath)) {
      botLogger.info("Session directory does not exist, nothing to clean");
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
          botLogger.info(`Removed lock file: ${path.basename(lockFile)}`, "🗑️");
        }
      } catch (error) {
        botLogger.warn(`Could not remove ${lockFile}: ${error}`);
      }
    }

    if (cleanedFiles > 0) {
      botLogger.success(`Successfully cleaned ${cleanedFiles} Chrome lock file(s)`);
    } else {
      botLogger.info("No Chrome lock files found to clean");
    }

    return true;

  } catch (error) {
    botLogger.error(`Error cleaning Chrome session: ${error}`);
    return false;
  }
}

/**
 * Get system information for debugging
 */
export function getSystemInfo(): void {
  try {
    const systemInfo = puppeteerConfig.getSystemInfo();
    
    botLogger.info("System Information:", "💻");
    botLogger.info(`   Platform: ${systemInfo.platform} ${systemInfo.arch}`, "💻");
    botLogger.info(`   Node.js: ${systemInfo.nodeVersion}`, "💚");
    botLogger.info(`   Memory: ${systemInfo.availableMemory}`, "🧠");
    
  } catch (error) {
    botLogger.warn(`Could not get system information: ${error}`);
  }
}

/**
 * Validate environment before browser startup
 */
export async function validateEnvironmentForBrowser(): Promise<boolean> {
  try {
    botLogger.info("Validating environment for browser startup...", "🔍");
    
    const validation = await puppeteerConfig.validateEnvironment();
    
    if (!validation.isValid) {
      botLogger.warn("Environment validation issues found:");
      validation.issues.forEach(issue => botLogger.warn(`  - ${issue}`));
      validation.recommendations.forEach(rec => botLogger.info(`  💡 ${rec}`, "💡"));
      
      // Don't fail startup for environment warnings, just log them
      botLogger.info("Proceeding with browser startup despite environment warnings...");
    } else {
      botLogger.success("Environment validation passed");
    }
    
    return true;
    
  } catch (error) {
    botLogger.error(`Environment validation failed: ${error}`);
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
