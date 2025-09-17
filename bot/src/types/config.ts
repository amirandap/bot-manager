/**
 * =================
 * CONFIGURATION TYPES
 * =================
 * 
 * All configuration-related types centralized
 */

// =================
// BOT CONFIGURATION
// =================

export interface BotConfig {
  BOT_ID: string;
  BOT_NAME: string;
  BOT_PORT: number;
}

// =================
// PUPPETEER CONFIGURATION
// =================

export interface PuppeteerJsonConfig {
  general: {
    headless: boolean;
    defaultViewport: null;
    ignoreHTTPSErrors: boolean;
    devtools: boolean;
  };
  browser: {
    forceSystemChromium: boolean;
    comment: string;
  };
  args: {
    base: string[];
    performance: string[];
    stability: string[];
    privacy: string[];
    automation: string[];
    linux: string[];
    whatsapp_optimized: string[];
  };
  environments: {
    development: {
      additionalArgs: string[];
      enableLogging: boolean;
    };
    production: {
      additionalArgs: string[];
      enableLogging: boolean;
    };
  };
}

export interface PuppeteerConfiguration {
  executablePath?: string;
  headless: boolean;
  args: string[];
  defaultViewport: null;
  ignoreHTTPSErrors?: boolean;
  devtools?: boolean;
}

export interface ChromiumValidationResult {
  isValid: boolean;
  logs: string[];
  usingBundled: boolean;
}

export interface ConfigurationOptions {
  customChromiumPath?: string;
  headless?: boolean;
}