/**
 * Puppeteer Configuration Manager - JSON Based
 *
 * Loads configuration from external JSON file for easy modification without rebuilds.
 * Optimized for whatsapp-web.js with Chromium support.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import {
  PuppeteerJsonConfig,
  PuppeteerConfiguration,
  ChromiumValidationResult,
  ConfigurationOptions
} from '../types/config';

export class PuppeteerConfig {
  private static instance: PuppeteerConfig;
  private config: PuppeteerJsonConfig;
  private configPath: string;
  private validatedChromiumPath?: string;
  private readonly currentOS: string;

  private constructor() {
    this.currentOS = os.platform();
    this.configPath = path.join(process.cwd(), '..', 'config', 'puppeteer.json');
    this.loadConfig();
  }

  public static getInstance(): PuppeteerConfig {
    if (!PuppeteerConfig.instance) {
      PuppeteerConfig.instance = new PuppeteerConfig();
    }
    return PuppeteerConfig.instance;
  }

  /**
   * Load configuration from JSON file
   */
  private loadConfig(): void {
    try {
      if (!fs.existsSync(this.configPath)) {
        throw new Error(`Puppeteer config file not found: ${this.configPath}`);
      }

      const configData = fs.readFileSync(this.configPath, 'utf8');
      this.config = JSON.parse(configData);
      console.log('✅ Puppeteer configuration loaded from JSON');
    } catch (error) {
      console.error('❌ Failed to load Puppeteer config:', error);
      // Fallback to basic config
      this.config = this.getDefaultConfig();
    }
  }

  /**
   * Get default configuration if JSON file fails to load
   */
  private getDefaultConfig(): PuppeteerJsonConfig {
    return {
      general: {
        headless: true,
        defaultViewport: null,
        ignoreHTTPSErrors: true,
        devtools: false
      },
      browser: {
        forceSystemChromium: false,
        comment: "Fallback configuration"
      },
      args: {
        base: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"],
        performance: ["--aggressive-cache-discard"],
        stability: ["--disable-crash-reporter"],
        privacy: ["--mute-audio"],
        automation: ["--disable-blink-features=AutomationControlled"],
        linux: ["--disable-gpu"],
        whatsapp_optimized: ["--silent"]
      },
      environments: {
        development: { additionalArgs: [], enableLogging: true },
        production: { additionalArgs: [], enableLogging: false }
      }
    };
  }

  /**
   * Build args array from JSON configuration
   */
  private buildArgsFromConfig(): string[] {
    const args: string[] = [];
    const argsConfig = this.config.args;

    // Add base args
    args.push(...argsConfig.base);
    args.push(...argsConfig.performance);
    args.push(...argsConfig.stability);
    args.push(...argsConfig.privacy);
    args.push(...argsConfig.automation);
    args.push(...argsConfig.whatsapp_optimized);

    // Add OS-specific args
    if (this.currentOS === 'linux') {
      args.push(...argsConfig.linux);
    }

    // Add environment-specific args
    const env = process.env.NODE_ENV === 'production' ? 'production' : 'development';
    args.push(...this.config.environments[env].additionalArgs);

    return args;
  }

  /**
   * Find system Chromium paths
   */
  private getChromiumPaths(): string[] {
    const chromiumPaths: { [key: string]: string[] } = {
      linux: [
        '/usr/bin/chromium-browser',
        '/usr/bin/chromium',
        '/snap/bin/chromium',
        '/usr/bin/google-chrome',
        '/usr/bin/google-chrome-stable'
      ],
      darwin: [
        '/Applications/Chromium.app/Contents/MacOS/Chromium',
        '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
      ],
      win32: [
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
      ]
    };

    return chromiumPaths[this.currentOS] || [];
  }

  /**
   * Validate Chromium installation
   */
  public validateChromium(chromiumPath?: string): ChromiumValidationResult {
    const logs: string[] = [];
    const result: ChromiumValidationResult = {
      isValid: false,
      logs,
      usingBundled: false,
    };

    // If no path provided and not forcing system Chromium, use bundled
    if (!chromiumPath && !this.config.browser.forceSystemChromium) {
      result.isValid = true;
      result.usingBundled = true;
      logs.push("✅ Using Puppeteer's bundled Chromium (recommended)");
      return result;
    }

    // Try to find system Chromium if path not provided
    if (!chromiumPath) {
      logs.push("Searching for system Chromium installation...");
      const foundPath = this.findChromiumPath();
      if (!foundPath) {
        result.isValid = true;
        result.usingBundled = true;
        logs.push("⚠️ No system Chromium found, using bundled Chromium");
        return result;
      }
      chromiumPath = foundPath;
    }

    // Validate the specific path
    try {
      if (fs.existsSync(chromiumPath) && fs.statSync(chromiumPath).isFile()) {
        const stats = fs.statSync(chromiumPath);
        result.isValid = true;
        result.usingBundled = false;
        logs.push(`✅ System Chromium validation successful: ${chromiumPath}`);
        logs.push(`📄 File size: ${Math.round(stats.size / (1024 * 1024))}MB`);
        logs.push(`📅 Modified: ${stats.mtime.toISOString()}`);
      } else {
        logs.push(`❌ Chromium path not found: ${chromiumPath}`);
      }
    } catch (error) {
      logs.push(`❌ Chromium validation error: ${error}`);
    }

    return result;
  }

  /**
   * Find valid Chromium executable path
   */
  public findChromiumPath(customPath?: string): string | undefined {
    if (!customPath && this.validatedChromiumPath) {
      return this.validatedChromiumPath;
    }

    if (customPath) {
      const result = this.validateChromium(customPath);
      if (result.isValid && !result.usingBundled) {
        this.validatedChromiumPath = customPath;
        return customPath;
      }
    }

    const chromiumPaths = this.getChromiumPaths();
    for (const chromiumPath of chromiumPaths) {
      const result = this.validateChromium(chromiumPath);
      if (result.isValid && !result.usingBundled) {
        this.validatedChromiumPath = chromiumPath;
        return chromiumPath;
      }
    }

    return undefined;
  }

  /**
   * Get the complete Puppeteer configuration
   */
  public getConfiguration(options?: ConfigurationOptions): PuppeteerConfiguration {
    const { customChromiumPath, headless } = options || {};

    // Determine if we should use system Chromium
    const shouldUseSystemChromium = this.config.browser.forceSystemChromium || 
                                   process.env.FORCE_SYSTEM_CHROMIUM === 'true';
    
    const chromiumPath = shouldUseSystemChromium 
      ? this.findChromiumPath(customChromiumPath)
      : undefined;

    const args = this.buildArgsFromConfig();

    const config: PuppeteerConfiguration = {
      headless: headless !== undefined ? headless : this.config.general.headless,
      args,
      defaultViewport: this.config.general.defaultViewport,
      ignoreHTTPSErrors: this.config.general.ignoreHTTPSErrors,
      devtools: this.config.general.devtools,
    };

    // Set executable path only if using system Chromium
    if (chromiumPath) {
      config.executablePath = chromiumPath;
      console.log(`🔧 Using system Chromium: ${chromiumPath}`);
    } else {
      console.log("🔧 Using Puppeteer's bundled Chromium (recommended)");
    }

    // Log configuration in development
    if (this.config.environments.development.enableLogging && 
        process.env.NODE_ENV !== 'production') {
      console.log(`⚙️ Puppeteer config for ${this.currentOS}:`);
      console.log(`  - Chromium: ${chromiumPath || 'bundled'}`);
      console.log(`  - Headless: ${config.headless}`);
      console.log(`  - Args count: ${config.args.length}`);
      console.log(`  - Args: ${config.args.join(' ')}`);
    }

    return config;
  }

  /**
   * Reload configuration from JSON file
   */
  public reloadConfig(): void {
    this.loadConfig();
    console.log('🔄 Puppeteer configuration reloaded');
  }

  /**
   * Get current configuration object (for debugging)
   */
  public getCurrentConfig(): PuppeteerJsonConfig {
    return this.config;
  }
}

// Export singleton instance
export const puppeteerConfig = PuppeteerConfig.getInstance();
