import fs from "fs";
import path from "path";
import { Bot, BotConfig } from "../types";

export class ConfigService {
  private static instance: ConfigService;
  private configPath: string;
  private fallbackApiHost: string = "";

  private constructor() {
    this.configPath = path.join(__dirname, "../../../config/bots.json");
  }

  public static getInstance(): ConfigService {
    if (!ConfigService.instance) {
      ConfigService.instance = new ConfigService();
    }
    return ConfigService.instance;
  }

  public loadConfig(): BotConfig {
    try {
      console.log("Loading config from:", this.configPath);

      if (!fs.existsSync(this.configPath)) {
        console.error("Config file does not exist:", this.configPath);
        return { bots: [] };
      }

      const configData = fs.readFileSync(this.configPath, "utf8");
      console.log("Config data loaded:", configData.substring(0, 100) + "...");

      const config: BotConfig = JSON.parse(configData);

      // Apply fallback apiHost if empty, with smart defaults
      config.bots = config.bots.map((bot) => ({
        ...bot,
        apiHost: bot.apiHost || this.getSmartFallbackHost(),
      }));

      console.log("Loaded", config.bots.length, "bots");
      return config;
    } catch (error) {
      console.error("Error loading config:", error);
      return { bots: [] };
    }
  }

  public saveConfig(config: BotConfig): void {
    try {
      const configDir = path.dirname(this.configPath);
      if (!fs.existsSync(configDir)) {
        fs.mkdirSync(configDir, { recursive: true });
      }
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2));
    } catch (error) {
      console.error("Error saving config:", error);
      throw new Error("Failed to save configuration");
    }
  }

  public getAllBots(): Bot[] {
    return this.loadConfig().bots;
  }

  public getBotsByType(type: "whatsapp" | "discord"): Bot[] {
    return this.getAllBots().filter((bot) => bot.type === type && bot.enabled);
  }

  public getBotById(id: string): Bot | undefined {
    const allBots = this.getAllBots();
    const bot = allBots.find((bot) => bot.id === id);

    if (!bot) {
      console.warn(
        `⚠️ Bot with ID '${id}' not found. Available bots:`,
        allBots.map((b) => ({
          id: b.id,
          name: b.name,
          apiHost: b.apiHost,
          apiPort: b.apiPort,
        }))
      );
    } else {
      console.log(
        `✅ Found bot '${bot.name}' (${bot.id}) at ${bot.apiHost}:${bot.apiPort}`
      );
    }

    return bot;
  }

  public addBot(bot: Omit<Bot, "id" | "createdAt" | "updatedAt">): Bot {
    const config = this.loadConfig();
    const newBot: Bot = {
      ...bot,
      id: `${bot.type}-bot-${Date.now()}`,
      apiHost: bot.apiHost || this.fallbackApiHost,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    config.bots.push(newBot);
    this.saveConfig(config);
    return newBot;
  }

  public updateBot(
    id: string,
    updates: Partial<Omit<Bot, "id" | "createdAt">>
  ): Bot | null {
    const config = this.loadConfig();
    const botIndex = config.bots.findIndex((bot) => bot.id === id);

    if (botIndex === -1) {
      return null;
    }

    config.bots[botIndex] = {
      ...config.bots[botIndex],
      ...updates,
      apiHost:
        updates.apiHost ||
        config.bots[botIndex].apiHost ||
        this.fallbackApiHost,
      updatedAt: new Date().toISOString(),
    };

    this.saveConfig(config);
    return config.bots[botIndex];
  }

  public deleteBot(id: string): boolean {
    const config = this.loadConfig();
    const initialLength = config.bots.length;
    config.bots = config.bots.filter((bot) => bot.id !== id);

    if (config.bots.length < initialLength) {
      this.saveConfig(config);
      return true;
    }
    return false;
  }

  public setFallbackApiHost(host: string): void {
    this.fallbackApiHost = host;
  }

  public getFallbackApiHost(): string {
    return this.fallbackApiHost;
  }

  /**
   * Get smart fallback host with intelligent defaults
   * Priority: 1) Environment variable, 2) Smart defaults based on environment
   */
  private getSmartFallbackHost(): string {
    // If explicitly set via environment, use it
    if (this.fallbackApiHost && this.fallbackApiHost.trim() !== "") {
      return this.fallbackApiHost;
    }

    // Smart defaults based on environment
    const nodeEnv = process.env.NODE_ENV;
    const serverHost = process.env.SERVER_HOST;

    if (nodeEnv === "production") {
      // In production, prefer 0.0.0.0 for nginx compatibility
      return serverHost === "0.0.0.0" ? "0.0.0.0" : "localhost";
    } else {
      // In development, use localhost
      return "localhost";
    }
  }

  public updateBotWithRealData(
    id: string,
    realPhoneNumber?: string,
    realPushName?: string
  ): Bot | null {
    const config = this.loadConfig();
    const botIndex = config.bots.findIndex((bot) => bot.id === id);

    if (botIndex === -1) {
      return null;
    }

    const updates: Partial<Bot> = {
      updatedAt: new Date().toISOString(),
    };

    // Only update if we have real data that's different from stored data
    if (
      realPhoneNumber &&
      realPhoneNumber !== config.bots[botIndex].phoneNumber
    ) {
      updates.phoneNumber = realPhoneNumber;
      console.log(
        `ConfigService: Updating phone number for bot ${id}: ${realPhoneNumber}`
      );
    }

    if (realPushName && realPushName !== config.bots[botIndex].pushName) {
      updates.pushName = realPushName;
      console.log(
        `ConfigService: Updating push name for bot ${id}: ${realPushName}`
      );
    }

    // Only save if there are actual updates
    if (Object.keys(updates).length > 1) {
      // More than just updatedAt
      config.bots[botIndex] = {
        ...config.bots[botIndex],
        ...updates,
      };
      this.saveConfig(config);
      console.log(`ConfigService: Updated bot ${id} with real data`);
    }

    return config.bots[botIndex];
  }
}
