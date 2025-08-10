import { Logger, LogLevel } from "../services/Logger";
import { EnvironmentManager } from "../config/EnvironmentManager";
import { puppeteerConfig } from "../config/PuppeteerConfig";
import { DirectoryManagerService } from "./DirectoryManagerService";

export class StartupManager {
  private logger: Logger;
  private envManager: EnvironmentManager;
  private directoryManager: DirectoryManagerService;

  public constructor() {
    // Initialize logger first
    const envManager = EnvironmentManager.getInstance();
    const config = envManager.getConfig();

    this.logger = Logger.getInstance({
      logLevel: LogLevel.INFO,
      logToConsole: true,
      logToFile: true,
      logDirectory: config.LOGS_PATH,
    });

    this.envManager = envManager;
    // Set the logger instance for puppeteerConfig to use
    puppeteerConfig.setLogger(this.logger);
    this.directoryManager = new DirectoryManagerService(this.logger);
  }

  public async initialize(): Promise<boolean> {
    try {
      // Step 1: Print environment variables
      this.printEnvironmentVariables();

      // Step 2: Validate Chrome
      if (!this.validateChrome()) {
        return false;
      }

      // Step 3: Create directories
      this.createDirectories();

      this.logger.success("All pre-flight checks passed. Ready to start bot.");
      return true;
    } catch (error) {
      this.logger.error(`Startup failed: ${error}`);
      return false;
    }
  }

  private printEnvironmentVariables(): void {
    this.logger.startupHeader("🔍 ENVIRONMENT VARIABLES VERIFICATION");

    const config = this.envManager.getConfig();
    const processInfo = this.envManager.getProcessInfo();

    // Print main configuration
    this.logger.environmentVar("BOT_ID", config.BOT_ID, "EnvironmentManager");
    this.logger.environmentVar(
      "BOT_NAME",
      config.BOT_NAME,
      this.envManager.getEnvSource("BOT_NAME")
    );
    this.logger.environmentVar(
      "BOT_PORT",
      config.BOT_PORT,
      this.envManager.getEnvSource("BOT_PORT")
    );
    this.logger.environmentVar(
      "BOT_TYPE",
      config.BOT_TYPE,
      this.envManager.getEnvSource("BOT_TYPE")
    );
    this.logger.environmentVar(
      "NODE_ENV",
      config.NODE_ENV,
      this.envManager.getEnvSource("NODE_ENV")
    );
    this.logger.environmentVar(
      "CHROME_PATH",
      config.CHROME_PATH,
      this.envManager.getEnvSource("CHROME_PATH")
    );

    // Print process info
    this.logger.environmentVar("PWD", processInfo.PWD as string, "system");
    this.logger.environmentVar("PID", processInfo.PID, "system");

    // Print PM2 variables if running under PM2
    if (this.envManager.isPM2()) {
      this.logger.info("📊 PM2 Environment Variables:");
      const pm2Vars = this.envManager.getPM2Variables();
      Object.entries(pm2Vars).forEach(([key, value]) => {
        this.logger.info(`   ${key}: ${value}`, "📊");
      });
    }

    // Print file paths
    this.logger.info("📁 File Paths:");
    this.logger.filePath("   DATA_ROOT", config.DATA_ROOT);
    this.logger.filePath("   SESSION_PATH", config.SESSION_PATH);
    this.logger.filePath("   QR_PATH", config.QR_PATH);
    this.logger.filePath("   LOGS_PATH", config.LOGS_PATH);
  }

  private validateChrome(): boolean {
    this.logger.startupHeader("🔍 CHROME EXECUTABLE VALIDATION");

    const config = this.envManager.getConfig();
    const result = puppeteerConfig.validate(config.CHROME_PATH);

    if (!result.isValid) {
      this.logger.error("Chrome validation failed. Cannot proceed.");
      
      // Log all validation details
      result.logs.forEach(log => {
        this.logger.info(log);
      });
      
      if (result.error) {
        this.logger.error(result.error);
      }
      
      if (result.alternativePaths && result.alternativePaths.length > 0) {
        this.logger.info("💡 Alternative Chrome paths found:");
        result.alternativePaths.forEach(path => {
          this.logger.info(`   ✅ ${path}`);
        });
      }
      
      return false;
    }

    // Log success details
    result.logs.forEach(log => {
      this.logger.info(log);
    });

    return true;
  }

  private createDirectories(): void {
    this.logger.startupHeader("📁 DIRECTORY CREATION");

    const config = this.envManager.getConfig();
    const directories = [config.SESSION_PATH, config.QR_PATH, config.LOGS_PATH];

    this.directoryManager.ensureDirectories(directories);
  }

  public getConfig() {
    return this.envManager.getConfig();
  }

  public getLogger(): Logger {
    return this.logger;
  }

  /**
   * Get the PuppeteerConfigManager instance that handles Chrome validation
   * This replaces the old getChromeValidator method
   */
  public getPuppeteerConfig() {
    return puppeteerConfig;
  }
}
