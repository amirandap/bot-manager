import fs from "fs";
import path from "path";
import pm2 from "pm2";
import dotenv from "dotenv";
import { ConfigService } from "./configService";
import { Bot } from "../types";

export class BotSpawnerService {
  private configService: ConfigService;
  private botDirectory: string;
  private dataDirectory: string;

  constructor() {
    this.configService = ConfigService.getInstance();
    this.botDirectory = path.join(__dirname, "../../../bot");
    this.dataDirectory = path.join(__dirname, "../../../data");
  }

  private loadBotEnvironmentDefaults(): Record<string, string> {
    const botEnvPath = path.join(this.botDirectory, ".env");
    const botEnvDefaults: Record<string, string> = {};

    console.log(`📦 Loading bot environment defaults...`);
    console.log(`   - Looking for: ${botEnvPath}`);

    if (fs.existsSync(botEnvPath)) {
      try {
        const envConfig = dotenv.parse(fs.readFileSync(botEnvPath));
        Object.assign(botEnvDefaults, envConfig);
        console.log(
          `   ✅ Loaded ${
            Object.keys(envConfig).length
          } environment variables from ${botEnvPath}`
        );
        console.log(
          `   📋 Loaded variables: ${Object.keys(envConfig).join(", ")}`
        );
      } catch (error) {
        console.log(
          `   ⚠️  Error parsing bot .env file: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    } else {
      console.log(
        `   ⚠️  Bot .env file not found at ${botEnvPath}, using system defaults only`
      );
    }

    return botEnvDefaults;
  }

  async createNewWhatsAppBot(
    botConfig: Omit<Bot, "id" | "createdAt" | "updatedAt">
  ): Promise<Bot> {
    const botId = `whatsapp-bot-${Date.now()}`;

    console.log("\n=".repeat(60));
    console.log(`🚀 STARTING BOT CREATION PROCESS`);
    console.log("=".repeat(60));
    console.log(`🤖 Bot ID: ${botId}`);
    console.log(`📛 Bot Name: ${botConfig.name}`);
    console.log(`🔌 Port: ${botConfig.apiPort}`);
    console.log(`🌐 Host: ${botConfig.apiHost}`);
    console.log(`📱 Type: ${botConfig.type}`);
    console.log(`🏷️  Push Name: ${botConfig.pushName || "Not set"}`);
    console.log(`📞 Phone: ${botConfig.phoneNumber || "Not set"}`);
    console.log(`⚙️  Enabled: ${botConfig.enabled}`);
    console.log("-".repeat(60));

    try {
      // 1. Validar que el bot directory existe y tiene package.json
      console.log(`📋 STEP 1: Validating bot directory...`);
      await this.validateBotDirectory();

      // 2. Crear directorios centrales para este bot
      console.log(`📋 STEP 2: Creating data directories...`);
      await this.createBotDataDirectories(botId);

      // 3. Iniciar bot con PM2 usando variables de entorno
      console.log(`📋 STEP 3: Starting bot with PM2...`);
      await this.startBotWithPM2(botId, botConfig);

      // 4. Agregar a configuración central (config/bots.json)
      console.log(`📋 STEP 4: Adding bot to configuration...`);
      const newBot = await this.addBotToConfig(botConfig, botId);

      console.log("\n" + "=".repeat(60));
      console.log(`✅ BOT CREATION COMPLETED SUCCESSFULLY`);
      console.log("=".repeat(60));
      console.log(`🆔 Bot ID: ${botId}`);
      console.log(`🌐 Bot URL: ${botConfig.apiHost}:${botConfig.apiPort}`);
      console.log(
        `📊 Status URL: ${botConfig.apiHost}:${botConfig.apiPort}/status`
      );
      console.log(
        `📱 QR Code URL: ${botConfig.apiHost}:${botConfig.apiPort}/qr-code`
      );
      console.log(`📄 Updated config/bots.json with new bot`);
      console.log("=".repeat(60) + "\n");

      return newBot;
    } catch (error) {
      console.log("\n" + "❌".repeat(20));
      console.log(`❌ BOT CREATION FAILED`);
      console.log("❌".repeat(20));
      console.log(`🆔 Bot ID: ${botId}`);
      console.log(
        `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`
      );
      if (error instanceof Error && error.stack) {
        console.log(`📋 Stack trace:`);
        console.log(error.stack);
      }
      console.log("❌".repeat(20) + "\n");

      // Attempt cleanup if bot was partially created
      console.log(`🧹 Attempting to cleanup partially created bot...`);
      try {
        await this.stopBot(botId);
        await this.deleteBot(botId);
        console.log(`✅ Cleanup completed for ${botId}`);
      } catch (cleanupError) {
        console.log(
          `⚠️  Cleanup failed: ${
            cleanupError instanceof Error
              ? cleanupError.message
              : "Unknown cleanup error"
          }`
        );
      }

      throw new Error(
        `Failed to create new WhatsApp bot: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private async validateBotDirectory(): Promise<void> {
    const packageJsonPath = path.join(this.botDirectory, "package.json");
    const scriptPath = path.join(this.botDirectory, "src/index.ts");

    console.log(`📁 Validating bot directory structure...`);
    console.log(`   - Bot directory: ${this.botDirectory}`);

    if (!fs.existsSync(this.botDirectory)) {
      throw new Error(`Bot directory not found: ${this.botDirectory}`);
    }
    console.log(`   ✅ Bot directory exists`);

    if (!fs.existsSync(packageJsonPath)) {
      throw new Error(`Bot package.json not found: ${packageJsonPath}`);
    }
    console.log(`   ✅ package.json found`);

    if (!fs.existsSync(scriptPath)) {
      throw new Error(`Bot script not found: ${scriptPath}`);
    }
    console.log(`   ✅ index.ts found`);

    // Check if ts-node is available
    try {
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
      console.log(`   📋 Bot package info:`);
      console.log(`      - Name: ${packageJson.name || "Unknown"}`);
      console.log(`      - Version: ${packageJson.version || "Unknown"}`);
    } catch (error) {
      console.log(
        `   ⚠️  Could not parse package.json: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }

    console.log(`✅ Bot directory validation completed`);
  }

  private async createBotDataDirectories(botId: string): Promise<void> {
    console.log(`📁 Creating data directories for bot: ${botId}`);
    console.log(`   - Base data directory: ${this.dataDirectory}`);

    const directories = [
      path.join(this.dataDirectory, "sessions", botId),
      path.join(this.dataDirectory, "qr-codes"),
      path.join(this.dataDirectory, "logs", botId),
    ];

    directories.forEach((dir) => {
      if (!fs.existsSync(dir)) {
        try {
          fs.mkdirSync(dir, { recursive: true });
          console.log(`   ✅ Created: ${path.relative(process.cwd(), dir)}`);
        } catch (error) {
          throw new Error(
            `Failed to create directory ${dir}: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      } else {
        console.log(
          `   📁 Already exists: ${path.relative(process.cwd(), dir)}`
        );
      }
    });

    // Check directory permissions
    directories.forEach((dir) => {
      try {
        fs.accessSync(dir, fs.constants.W_OK);
        console.log(
          `   ✅ Write access confirmed: ${path.relative(process.cwd(), dir)}`
        );
      } catch (error) {
        throw new Error(
          `No write access to directory ${dir}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    });

    console.log(`✅ Data directories setup completed`);
  }

  private async startBotWithPM2(botId: string, botConfig: any): Promise<void> {
    console.log(`🚀 Starting bot ${botId} with PM2...`);

    // Load bot environment defaults from bot folder .env
    const botEnvDefaults = this.loadBotEnvironmentDefaults();

    // Prepare environment variables
    const botEnv = {
      // Start with bot folder defaults
      ...botEnvDefaults,
      // Override with system environment
      ...process.env,
      // Override with bot-specific configuration
      BOT_ID: botId,
      BOT_NAME: botConfig.name,
      BOT_PORT: botConfig.apiPort.toString(),
      BOT_TYPE: botConfig.type,
      BASE_URL: `${botConfig.apiHost}:${botConfig.apiPort}`,
      PORT: botConfig.apiPort.toString(),
      NODE_ENV: "production",
    };

    console.log(`📦 PM2 Configuration:`);
    console.log(`   - Script: ${path.join(this.botDirectory, "src/index.ts")}`);
    console.log(`   - Interpreter: ts-node`);
    console.log(`   - Working Directory: ${this.botDirectory}`);
    console.log(`   - Process Name: wabot-${botConfig.apiPort}`);
    console.log(`📋 Environment Variables:`);
    console.log(`   - BOT_ID: ${botEnv.BOT_ID}`);
    console.log(`   - BOT_NAME: ${botEnv.BOT_NAME}`);
    console.log(`   - BOT_PORT: ${botEnv.BOT_PORT}`);
    console.log(`   - BOT_TYPE: ${botEnv.BOT_TYPE}`);
    console.log(`   - BASE_URL: ${botEnv.BASE_URL}`);
    console.log(`   - NODE_ENV: ${botEnv.NODE_ENV}`);

    return new Promise((resolve, reject) => {
      console.log(`🔌 Connecting to PM2...`);
      pm2.connect((err) => {
        if (err) {
          console.error("❌ Failed to connect to PM2:", err);
          reject(new Error(`PM2 connection failed: ${err.message}`));
          return;
        }
        console.log(`✅ Connected to PM2 successfully`);

        const pm2ServiceId = `wabot-${botConfig.apiPort}`;
        const pm2Config = {
          name: pm2ServiceId,
          script: path.join(this.botDirectory, "src/index.ts"),
          interpreter: "ts-node",
          interpreter_args: "--files -r tsconfig-paths/register",
          cwd: this.botDirectory,
          env: botEnv,
        };

        console.log(`📄 Starting PM2 process with name: ${pm2ServiceId}...`);
        pm2.start(pm2Config, (err, proc) => {
          console.log(`🔌 Disconnecting from PM2...`);
          pm2.disconnect(); // Always disconnect after operation

          if (err) {
            console.error(`❌ PM2 start failed for ${botId}:`);
            console.error(`   Error: ${err.message}`);
            if (err.message.includes("already exists")) {
              console.error(
                `   💡 Suggestion: Process name conflict. Try stopping the existing process first.`
              );
            } else if (err.message.includes("ENOENT")) {
              console.error(
                `   💡 Suggestion: Check if the script file exists and ts-node is installed.`
              );
            } else if (err.message.includes("port")) {
              console.error(
                `   💡 Suggestion: Port ${botConfig.apiPort} might be in use.`
              );
            }
            reject(new Error(`PM2 start failed: ${err.message}`));
          } else {
            console.log(`✅ Bot ${botId} started with PM2 successfully`);
            console.log(`📄 PM2 process created successfully`);
            if (proc && Array.isArray(proc) && proc.length > 0) {
              console.log(`📊 Process details:`);
              console.log(`   - PID: ${(proc[0] as any).pid || "Unknown"}`);
              console.log(
                `   - Status: ${(proc[0] as any).pm2_env?.status || "Unknown"}`
              );
              console.log(
                `   - CPU: ${(proc[0] as any).monit?.cpu || "Unknown"}%`
              );
              console.log(
                `   - Memory: ${
                  (proc[0] as any).monit?.memory
                    ? Math.round((proc[0] as any).monit.memory / 1024 / 1024)
                    : "Unknown"
                }MB`
              );
            }
            resolve();
          }
        });
      });
    });
  }

  private async addBotToConfig(botConfig: any, botId: string): Promise<Bot> {
    // Generate PM2 service name using the predictable format: wabot-$portnumber
    const pm2ServiceId = `wabot-${botConfig.apiPort}`;

    const newBot: Bot = {
      ...botConfig,
      id: botId,
      type: botConfig.type || "whatsapp", // Ensure type is always set with fallback
      pm2ServiceId: pm2ServiceId,
      isExternal: false, // This is a system-spawned bot
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Usar ConfigService para agregar al JSON y guardar automáticamente
    const addedBot = this.configService.addBot(newBot);

    console.log(`📝 Bot added to config/bots.json:`);
    console.log(`   - ID: ${addedBot.id}`);
    console.log(`   - Name: ${addedBot.name}`);
    console.log(`   - Port: ${addedBot.apiPort}`);
    console.log(`   - PM2 Service: ${addedBot.pm2ServiceId}`);
    console.log(`   - External: ${addedBot.isExternal ? "Yes" : "No"}`);

    return addedBot;
  }

  async stopBot(botId: string): Promise<boolean> {
    console.log(`🛑 Stopping bot: ${botId}`);

    // Get bot config to find the PM2 service ID
    const bot = this.configService.getBotById(botId);
    if (!bot) {
      console.error(`❌ Bot not found: ${botId}`);
      return false;
    }

    if (bot.isExternal) {
      console.log(`⚠️  Bot ${botId} is external - cannot stop via PM2`);
      return false;
    }

    const pm2ServiceId = bot.pm2ServiceId;
    if (!pm2ServiceId) {
      console.error(`❌ No PM2 service ID found for bot: ${botId}`);
      return false;
    }

    console.log(`🎯 Using PM2 service: ${pm2ServiceId}`);

    return new Promise((resolve) => {
      pm2.connect((err) => {
        if (err) {
          console.error(`❌ Failed to connect to PM2:`, err);
          resolve(false);
          return;
        }

        pm2.stop(pm2ServiceId, (err) => {
          pm2.disconnect();

          if (err) {
            console.error(
              `❌ Error stopping bot ${botId} (PM2: ${pm2ServiceId}):`,
              err
            );
            resolve(false);
          } else {
            console.log(
              `✅ Bot ${botId} (PM2: ${pm2ServiceId}) stopped successfully`
            );
            resolve(true);
          }
        });
      });
    });
  }

  async startBot(botId: string): Promise<boolean> {
    console.log(`🚀 Starting bot: ${botId}`);

    // Get bot config to find the PM2 service ID
    const bot = this.configService.getBotById(botId);
    if (!bot) {
      console.error(`❌ Bot not found: ${botId}`);
      return false;
    }

    if (bot.isExternal) {
      console.log(`⚠️  Bot ${botId} is external - cannot start via PM2`);
      return false;
    }

    const pm2ServiceId = bot.pm2ServiceId;
    if (!pm2ServiceId) {
      console.error(`❌ No PM2 service ID found for bot: ${botId}`);
      return false;
    }

    console.log(`🎯 Using PM2 service: ${pm2ServiceId}`);

    return new Promise((resolve) => {
      pm2.connect((err) => {
        if (err) {
          console.error(`❌ Failed to connect to PM2:`, err);
          resolve(false);
          return;
        }

        pm2.restart(pm2ServiceId, (err) => {
          pm2.disconnect();

          if (err) {
            console.error(
              `❌ Error starting bot ${botId} (PM2: ${pm2ServiceId}):`,
              err
            );
            resolve(false);
          } else {
            console.log(
              `✅ Bot ${botId} (PM2: ${pm2ServiceId}) started successfully`
            );
            resolve(true);
          }
        });
      });
    });
  }

  async restartBot(botId: string): Promise<boolean> {
    console.log(`🔄 Restarting bot: ${botId}`);

    // Get bot config to find the PM2 service ID
    const bot = this.configService.getBotById(botId);
    if (!bot) {
      console.error(`❌ Bot not found: ${botId}`);
      return false;
    }

    if (bot.isExternal) {
      console.log(`⚠️  Bot ${botId} is external - cannot restart via PM2`);
      return false;
    }

    const pm2ServiceId = bot.pm2ServiceId;
    if (!pm2ServiceId) {
      console.error(`❌ No PM2 service ID found for bot: ${botId}`);
      return false;
    }

    console.log(`🎯 Using PM2 service: ${pm2ServiceId}`);

    return new Promise((resolve) => {
      pm2.connect((err) => {
        if (err) {
          console.error(`❌ Failed to connect to PM2:`, err);
          resolve(false);
          return;
        }

        pm2.restart(pm2ServiceId, (err) => {
          pm2.disconnect();

          if (err) {
            console.error(
              `❌ Error restarting bot ${botId} (PM2: ${pm2ServiceId}):`,
              err
            );
            resolve(false);
          } else {
            console.log(
              `✅ Bot ${botId} (PM2: ${pm2ServiceId}) restarted successfully`
            );
            resolve(true);
          }
        });
      });
    });
  }

  async deleteBot(botId: string): Promise<boolean> {
    try {
      console.log(`🗑️  Deleting bot: ${botId}`);

      // 1. Detener bot en PM2
      await this.stopBot(botId);

      // 2. Eliminar de PM2
      await new Promise<void>((resolve) => {
        pm2.connect((err) => {
          if (err) {
            console.warn(`⚠️  Warning connecting to PM2: ${err.message}`);
            resolve();
            return;
          }

          pm2.delete(botId, (err) => {
            pm2.disconnect();

            if (err) {
              console.warn(`⚠️  Warning deleting from PM2: ${err.message}`);
            } else {
              console.log(`✅ Bot ${botId} removed from PM2`);
            }
            resolve();
          });
        });
      });

      // 3. Eliminar datos del bot (sessions, logs, qr)
      const botDataPaths = [
        path.join(this.dataDirectory, "sessions", botId),
        path.join(this.dataDirectory, "logs", botId),
      ];

      botDataPaths.forEach((dir) => {
        if (fs.existsSync(dir)) {
          fs.rmSync(dir, { recursive: true, force: true });
          console.log(
            `✅ Removed data directory: ${path.relative(process.cwd(), dir)}`
          );
        }
      });

      // 4. Eliminar QR code
      const qrPath = path.join(this.dataDirectory, "qr-codes", `${botId}.png`);
      if (fs.existsSync(qrPath)) {
        fs.unlinkSync(qrPath);
        console.log(
          `✅ Removed QR code: ${path.relative(process.cwd(), qrPath)}`
        );
      }

      // 5. Eliminar de config/bots.json
      const deleted = this.configService.deleteBot(botId);
      if (deleted) {
        console.log(`✅ Bot ${botId} removed from config/bots.json`);
      } else {
        console.warn(`⚠️  Bot ${botId} not found in config/bots.json`);
      }

      console.log(`🎉 Bot ${botId} completely deleted`);
      return true;
    } catch (error) {
      console.error(`❌ Error deleting bot ${botId}:`, error);
      return false;
    }
  }

  async listActiveBots(): Promise<{ pm2Bots: any[]; configBots: Bot[] }> {
    try {
      // 1. Obtener bots de PM2
      const pm2Bots = await new Promise<any[]>((resolve) => {
        pm2.connect((err) => {
          if (err) {
            console.warn("⚠️  Could not connect to PM2:", err.message);
            resolve([]);
            return;
          }

          pm2.list((err, processDescriptionList) => {
            pm2.disconnect();

            if (err) {
              console.warn("⚠️  Could not get PM2 list:", err.message);
              resolve([]);
            } else {
              resolve(processDescriptionList || []);
            }
          });
        });
      });

      // 2. Obtener bots de config
      const configBots = this.configService.getAllBots();

      return { pm2Bots, configBots };
    } catch (error) {
      console.error("❌ Error listing active bots:", error);
      return { pm2Bots: [], configBots: [] };
    }
  }

  async syncBotsWithPM2(): Promise<{
    synchronized: string[];
    orphaned: string[];
    missing: string[];
  }> {
    const { pm2Bots, configBots } = await this.listActiveBots();

    const pm2BotNames = pm2Bots.map((bot) => bot.name);
    const configBotIds = configBots.map((bot) => bot.id);

    const synchronized = configBotIds.filter((id) => pm2BotNames.includes(id));
    const orphaned = pm2BotNames.filter((name) => !configBotIds.includes(name));
    const missing = configBotIds.filter((id) => !pm2BotNames.includes(id));

    console.log(`📊 Bot synchronization status:`);
    console.log(`   ✅ Synchronized: ${synchronized.length} bots`);
    console.log(`   🔍 Orphaned PM2 processes: ${orphaned.length} bots`);
    console.log(`   ❓ Missing from PM2: ${missing.length} bots`);

    return { synchronized, orphaned, missing };
  }
}
