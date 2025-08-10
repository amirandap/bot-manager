import * as fs from "fs";
import { Logger } from "../services/Logger";

export interface ChromeValidationResult {
  isValid: boolean;
  chromePath: string;
  alternativePaths?: string[];
  error?: string;
}

export class ChromeValidator {
  private logger: Logger;
  private commonChromePaths = [
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/snap/bin/chromium",
    "/opt/google/chrome/chrome",
  ];

  public constructor(logger: Logger) {
    this.logger = logger;
  }

  public validate(chromePath: string): ChromeValidationResult {
    this.logger.chromeCheck(chromePath);

    if (!fs.existsSync(chromePath)) {
      this.logger.chromeNotFound(chromePath);
      const alternativePaths = this.findAlternatives();

      if (alternativePaths.length > 0) {
        this.logger.chromeAlternatives();
        alternativePaths.forEach((p) => this.logger.chromeFound(p));
        this.logger.info(
          "Set CHROME_PATH environment variable to use one of these",
          "💡"
        );
      } else {
        this.logger.info("No Chrome/Chromium installations found", "❌");
        this.logger.info("Please install Google Chrome or Chromium", "💡");
      }

      return {
        isValid: false,
        chromePath,
        alternativePaths,
        error: "Chrome executable not found",
      };
    }

    // Test if the executable is actually executable
    try {
      fs.accessSync(chromePath, fs.constants.X_OK);
      this.logger.chromeSuccess(chromePath);

      return {
        isValid: true,
        chromePath,
      };
    } catch (error) {
      this.logger.chromeNotExecutable(chromePath, error);

      return {
        isValid: false,
        chromePath,
        error: `Chrome executable found but not executable: ${error}`,
      };
    }
  }

  private findAlternatives(): string[] {
    return this.commonChromePaths.filter((p) => fs.existsSync(p));
  }

  public getBrowserArgs(): string[] {
    return [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--disable-features=TranslateUI,VizDisplayCompositor",
      "--disable-web-security",
      "--disable-features=VizDisplayCompositor",
      "--disable-extensions",
      "--disable-plugins",
      "--disable-sync",
      "--disable-translate",
      "--hide-scrollbars",
      "--mute-audio",
      "--disable-client-side-phishing-detection",
      "--disable-component-update",
      "--disable-hang-monitor",
      "--disable-prompt-on-repost",
      "--ignore-certificate-errors",
      "--ignore-ssl-errors",
      "--ignore-certificate-errors-spki-list",
      "--disable-infobars",
      "--disable-blink-features=AutomationControlled",
      "--disable-notifications",
      "--disable-desktop-notifications",
      "--disable-permissions-api",
      "--autoplay-policy=no-user-gesture-required",
      "--memory-pressure-off",
    ];
  }
}
