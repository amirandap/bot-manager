/**
 * Puppeteer Configuration Manager
 *
 * Handles OS-specific Chrome paths, Chrome validation, and Puppeteer arguments for optimal
 * browser initialization across different operating systems (macOS, Linux, Windows).
 * Consolidated Chrome validation - single source of truth for all Chrome-related operations.
 */
import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { logger } from "../services/LoggerService";
export interface PuppeteerConfiguration {
  executablePath?: string;
  args: string[];
  headless: boolean;
  defaultViewport?: {
    width: number;
    height: number;
  } | null;
  ignoreDefaultArgs?: string[];
}

export interface ChromeValidationResult {
  isValid: boolean;
  path?: string;
  error?: string;
  alternativePaths?: string[];
  logs: string[];
}

export class PuppeteerConfigManager {
  private static instance: PuppeteerConfigManager;
  private currentOS: string;
  private validatedChromePath: string | null = null; // Cache validated Chrome path
  // Remove logger dependency - use logger directly

  private constructor() {
    this.currentOS = os.platform();
  }

  public static getInstance(): PuppeteerConfigManager {
    if (!PuppeteerConfigManager.instance) {
      PuppeteerConfigManager.instance = new PuppeteerConfigManager();
    }
    return PuppeteerConfigManager.instance;
  }

  /**
   * Get the comprehensive Chrome installation paths for each OS
   * Includes all known Chrome/Chromium installation locations
   */
  private getDefaultChromePaths(): string[] {
    switch (this.currentOS) {
      case "darwin": // macOS
        return [
          "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
          "/opt/homebrew/bin/google-chrome",
          "/usr/local/bin/google-chrome",
          "/Applications/Chromium.app/Contents/MacOS/Chromium",
          "/opt/homebrew/bin/chromium",
          "/usr/local/bin/chromium",
        ];

      case "linux":
        return [
          // Chromium paths (preferred for bots - more stable)
          "/snap/bin/chromium",
          "/usr/bin/chromium-browser", 
          "/usr/bin/chromium",
          // Chrome paths (fallback)
          "/usr/bin/google-chrome-stable",
          "/usr/bin/google-chrome",
          "/opt/google/chrome/google-chrome",
          "/opt/google/chrome/chrome",
          "/usr/local/bin/google-chrome",
          "/usr/local/bin/chromium",
        ];

      case "win32": // Windows
        return [
          "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
          "C:\\Users\\%USERNAME%\\AppData\\Local\\Google\\Chrome\\Application\\chrome.exe",
          process.env.LOCALAPPDATA +
            "\\Google\\Chrome\\Application\\chrome.exe",
          process.env.PROGRAMFILES +
            "\\Google\\Chrome\\Application\\chrome.exe",
          process.env["PROGRAMFILES(X86)"] +
            "\\Google\\Chrome\\Application\\chrome.exe",
        ].filter(Boolean);

      default:
        logger.warn(`Unsupported OS detected: ${this.currentOS}`);
        return [];
    }
  }

  /**
   * Comprehensive Chrome validation with detailed logging and alternative suggestions
   */
  public validateChrome(chromePath?: string): ChromeValidationResult {
    const logs: string[] = [];
    const result: ChromeValidationResult = {
      isValid: false,
      logs,
    };

    // If no path provided, try to find one
    if (!chromePath) {
      logs.push(
        "No Chrome path provided, attempting to find Chrome installation..."
      );
      const foundPath = this.findChromePath();
      if (!foundPath) {
        result.error = "No Chrome installation found in default locations";
        result.alternativePaths = this.getDefaultChromePaths();
        logs.push("❌ No valid Chrome installation found");
        logs.push(
          "💡 Please install Google Chrome or set CHROME_PATH environment variable"
        );
        return result;
      }
      chromePath = foundPath;
    }

    try {
      // Check if file exists
      if (!fs.existsSync(chromePath)) {
        result.error = `Chrome executable not found at: ${chromePath}`;
        result.alternativePaths = this.getDefaultChromePaths().filter((path) =>
          fs.existsSync(path)
        );
        logs.push(`❌ File not found: ${chromePath}`);

        if (result.alternativePaths.length > 0) {
          logs.push("💡 Found alternative Chrome installations:");
          result.alternativePaths.forEach((altPath) => {
            logs.push(`   ✅ ${altPath}`);
          });
        }
        return result;
      }

      // Check if file is executable
      try {
        fs.accessSync(chromePath, fs.constants.F_OK | fs.constants.X_OK);
        result.isValid = true;
        result.path = chromePath;
        logs.push(`✅ Chrome validation successful: ${chromePath}`);

        // Log additional info about the Chrome installation
        const stats = fs.statSync(chromePath);
        logs.push(`📄 File size: ${Math.round(stats.size / 1024 / 1024)}MB`);
        logs.push(`📅 Modified: ${stats.mtime.toISOString()}`);

        return result;
      } catch {
        result.error = `Chrome executable is not accessible or not executable: ${chromePath}`;
        logs.push(`❌ Access denied or not executable: ${chromePath}`);
        logs.push(`💡 Try: chmod +x "${chromePath}"`);
        return result;
      }
    } catch (error) {
      result.error = `Unexpected error during Chrome validation: ${error}`;
      logs.push(`❌ Validation error: ${error}`);
      return result;
    }
  }

  /**
   * Find a valid Chrome executable path with comprehensive validation
   * Now uses cached result to avoid re-validation
   */
  public findChromePath(customPath?: string): string | undefined {
    // Return cached path if available and no custom path requested
    if (!customPath && this.validatedChromePath) {
      return this.validatedChromePath;
    }

    // If custom path is provided, validate it first
    if (customPath) {
      const result = this.validateChrome(customPath);
      if (result.isValid) {
        this.validatedChromePath = customPath; // Cache the result
        return customPath;
      } else {
        logger.warn(`Custom Chrome path invalid: ${customPath}`);
        // If custom path failed but alternatives were found, use the first one
        if (result.alternativePaths && result.alternativePaths.length > 0) {
          const altPath = result.alternativePaths[0];
          const altResult = this.validateChrome(altPath);
          if (altResult.isValid) {
            logger.info(`Using alternative Chrome path: ${altPath}`);
            this.validatedChromePath = altPath; // Cache the result
            return altPath;
          }
        }
      }
    }

    // Try default paths for the current OS
    const defaultPaths = this.getDefaultChromePaths();

    for (const chromePath of defaultPaths) {
      const result = this.validateChrome(chromePath);
      if (result.isValid) {
        this.validatedChromePath = chromePath; // Cache the result
        return chromePath;
      }
    }

    logger.warn("No valid Chrome installation found in default locations");
    return undefined;
  }

  /**
   * Chrome validation method with the same interface as ChromeValidator
   * This provides compatibility for existing code that expects ChromeValidator interface
   */
  public validate(chromePath?: string): ChromeValidationResult {
    return this.validateChrome(chromePath);
  }

  /**
   * Get dedicated user profile directory for the bot
   */
  private getBotProfileDir(): string {
    const botId = process.env.BOT_ID || 'whatsapp-bot-default';
    
    // Create a dedicated profile directory for this bot instance
    const profileDir = path.join(os.homedir(), '.whatsapp-bot-profiles', botId);
    
    // Ensure directory exists
    if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true });
      logger.info(`Created dedicated Chrome profile: ${profileDir}`);
    }
    
    return profileDir;
  }

  /**
   * Get OS-specific Puppeteer arguments with dedicated profile
   */
  private getOSSpecificArgs(): string[] {
    const profileDir = this.getBotProfileDir();
    
    const baseArgs = [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--disable-gpu",
      "--disable-web-security",
      "--disable-features=VizDisplayCompositor",
      "--no-default-browser-check",
      "--disable-background-timer-throttling",
      "--disable-renderer-backgrounding",
      "--disable-backgrounding-occluded-windows",
      // Dedicated profile to avoid singleton conflicts
      `--user-data-dir=${profileDir}`,
      "--disable-session-crashed-bubble",
      "--disable-infobars",
      "--no-first-run",
      "--disable-default-apps",
    ];

    switch (this.currentOS) {
      case "darwin": // macOS - Optimizado para evitar singleton errors
        return [
          ...baseArgs,
          "--disable-background-timer-throttling",
          "--disable-renderer-backgrounding",
          "--disable-backgrounding-occluded-windows",
          "--disable-ipc-flooding-protection", // Helps with macOS
          "--disable-blink-features=AutomationControlled", // Avoid detection
          "--disable-component-extensions-with-background-pages",
          "--disable-sync", // Avoid sync conflicts
          "--disable-login-animations",
          "--disable-modal-animations",
          "--disable-background-networking",
          "--force-prefers-reduced-motion", // Better performance on macOS
          "--disable-client-side-phishing-detection",
          "--disable-popup-blocking",
          "--disable-prompt-on-repost",
          "--disable-hang-monitor",
          "--disable-domain-reliability",
          "--disable-breakpad", // Crash reporting can cause issues
        ];

      case "linux":
        return [
          ...baseArgs,
          "--no-zygote",
          // Enhanced memory and performance optimization for Chromium
          "--memory-pressure-off",
          "--max_old_space_size=512",
          "--optimize-for-size",
          "--enable-precise-memory-info",
          // Disable resource-intensive features for better stability
          "--disable-software-rasterizer",
          "--disable-threaded-animation",
          "--disable-threaded-scrolling",
          "--disable-in-process-stack-traces", 
          "--disable-histogram-customizer",
          "--disable-gl-extensions",
          "--disable-d3d11",
          "--disable-accelerated-mjpeg-decode",
          "--disable-accelerated-video-decode",
          "--disable-accelerated-video-encode",
          "--disable-gpu-memory-buffer-video-frames",
          "--disable-rtc-smoothness-algorithm",
          "--disable-2d-canvas-clip-aa",
          "--disable-3d-apis",
          "--disable-accelerated-2d-canvas",
          "--disable-accelerated-jpeg-decoding",
          "--disable-app-list-dismiss-on-blur",
          // Chromium-specific optimizations
          "--disable-extensions-http-throttling",
          "--disable-component-extensions-with-background-pages",
          "--disable-ipc-flooding-protection",
          "--disable-dev-tools",
          "--disable-plugins",
          "--disable-features=TranslateUI,VizDisplayCompositor",
          "--disable-blink-features=AutomationControlled",
          // Stability improvements for long-running sessions
          "--disable-hang-monitor",
          "--disable-domain-reliability",
          "--disable-client-side-phishing-detection",
          "--disable-sync",
          "--disable-background-networking",
          "--disable-default-apps",
          "--disable-component-update",
          // Process management
          "--disable-renderer-backgrounding",
          "--disable-background-timer-throttling",
          "--disable-backgrounding-occluded-windows",
          // Session and crash prevention
          "--disable-breakpad",
          "--disable-crash-reporter",
          "--disable-logging",
          "--silent",
          // Network optimizations
          "--aggressive-cache-discard",
          "--enable-tcp-fast-open",
        ];

      case "win32": // Windows
        return [
          ...baseArgs,
          "--disable-background-timer-throttling",
          "--disable-renderer-backgrounding",
          "--disable-backgrounding-occluded-windows",
        ];

      default:
        return baseArgs;
    }
  }

  /**
   * Get environment-specific arguments (development vs production)
   */
  private getEnvironmentArgs(isProduction: boolean = false): string[] {
    const productionArgs = [
      "--disable-logging",
      "--disable-extensions",
      "--mute-audio",
      "--disable-default-apps",
    ];

    const developmentArgs = [
      "--enable-logging",
      "--log-level=0", // INFO level
    ];

    return isProduction ? productionArgs : developmentArgs;
  }

  /**
   * Clean up browser session files and locks
   */
  public cleanupBrowserSession(sessionPath: string): boolean {
    try {
      const lockFiles = ["SingletonLock", "SingletonSocket", "SingletonCookie"];

      let cleaned = false;

      // Check session directories
      if (fs.existsSync(sessionPath)) {
        const sessionDirs = fs
          .readdirSync(sessionPath)
          .filter(
            (dir) =>
              dir.startsWith("session-") &&
              fs.statSync(`${sessionPath}/${dir}`).isDirectory()
          );

        for (const sessionDir of sessionDirs) {
          for (const lockFile of lockFiles) {
            // Check in Default directory
            const defaultLockPath = `${sessionPath}/${sessionDir}/Default/${lockFile}`;
            if (fs.existsSync(defaultLockPath)) {
              fs.unlinkSync(defaultLockPath);
              logger.info(`Removed lock file: ${defaultLockPath}`);
              cleaned = true;
            }

            // Check in session root
            const rootLockPath = `${sessionPath}/${sessionDir}/${lockFile}`;
            if (fs.existsSync(rootLockPath)) {
              fs.unlinkSync(rootLockPath);
              logger.info(`Removed root lock file: ${rootLockPath}`);
              cleaned = true;
            }
          }
        }
      }

      return cleaned;
    } catch (error) {
      logger.warn(`Failed to cleanup browser session: ${error}`);
      return false;
    }
  }

  public getConfiguration(options?: {
    customChromePath?: string;
    isProduction?: boolean;
    headless?: boolean;
  }): PuppeteerConfiguration {
    const {
      customChromePath,
      isProduction = process.env.NODE_ENV === "production",
      headless = true,
    } = options || {};

    // Use cached Chrome path or find/validate new one
    const chromePath = this.findChromePath(customChromePath);
    const osArgs = this.getOSSpecificArgs();
    const envArgs = this.getEnvironmentArgs(isProduction);

    const config: PuppeteerConfiguration = {
      headless,
      args: [...osArgs, ...envArgs],
      defaultViewport: null, // Use default browser size
    };

    // Only set executablePath if we found a valid Chrome installation
    if (chromePath) {
      config.executablePath = chromePath;
    } else {
      logger.warn(
        "Using system default Chrome (may cause issues if not installed)"
      );
    }

    // Only log configuration details in development or when debugging
    if (process.env.NODE_ENV === "development" || process.env.DEBUG) {
      logger.info(`Puppeteer config for ${this.currentOS}:`);
      logger.info(`  - Chrome path: ${chromePath || "system default"}`);
      logger.info(`  - Headless: ${headless}`);
      logger.info(`  - Args count: ${config.args.length}`);

      if (process.env.NODE_ENV === "development") {
        logger.info(`  - Full args: ${config.args.join(" ")}`);
      }
    }

    return config;
  }

  /**
   * Get system information for debugging
   */
  public getSystemInfo(): {
    platform: string;
    arch: string;
    nodeVersion: string;
    availableMemory: string;
    chromePath?: string;
  } {
    const totalMem = os.totalmem();
    const freeMem = os.freemem();

    return {
      platform: this.currentOS,
      arch: os.arch(),
      nodeVersion: process.version,
      availableMemory: `${Math.round(
        freeMem / 1024 / 1024
      )}MB free / ${Math.round(totalMem / 1024 / 1024)}MB total`,
      chromePath: this.findChromePath(),
    };
  }

  /**
   * Validate the current environment for WhatsApp Web
   */
  public async validateEnvironment(): Promise<{
    isValid: boolean;
    issues: string[];
    recommendations: string[];
  }> {
    const issues: string[] = [];
    const recommendations: string[] = [];

    // Check Chrome availability
    const chromePath = this.findChromePath();
    if (!chromePath) {
      issues.push("No valid Chrome installation found");
      recommendations.push(
        "Install Google Chrome or set CHROME_PATH environment variable"
      );
    }

    // Check memory
    const freeMem = os.freemem();
    const freeMemMB = Math.round(freeMem / 1024 / 1024);
    if (freeMemMB < 512) {
      issues.push(`Low available memory: ${freeMemMB}MB`);
      recommendations.push(
        "Ensure at least 512MB of free memory for stable operation"
      );
    }

    // Check disk space (where temp files are stored)
    const tmpDir = os.tmpdir();
    try {
      fs.accessSync(tmpDir, fs.constants.F_OK | fs.constants.W_OK);
      // Temp directory is accessible and writable
    } catch {
      issues.push("Cannot access temporary directory");
      recommendations.push("Ensure temp directory is accessible and writable");
    }

    // OS-specific checks
    if (this.currentOS === "linux") {
      // Check for display server (important for Linux servers)
      if (!process.env.DISPLAY && !process.env.WAYLAND_DISPLAY) {
        recommendations.push(
          "Consider setting up a virtual display for headless operation"
        );
      }
    }

    return {
      isValid: issues.length === 0,
      issues,
      recommendations,
    };
  }
}

// Export singleton instance
export const puppeteerConfig = PuppeteerConfigManager.getInstance();
