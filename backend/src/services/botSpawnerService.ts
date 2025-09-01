import fs from "fs";
import path from "path";
import pm2 from "pm2";
import dotenv from "dotenv";
import { exec } from "child_process";
import { promisify } from "util";
import { ConfigService } from "./configService";
import { BotConfigTemplateService } from "./BotConfigTemplateService";
import { Bot } from "../types";

const execAsync = promisify(exec);

export class BotSpawnerService {
  private configService: ConfigService;
  private templateService: BotConfigTemplateService;
  private botDirectory: string;
  private dataDirectory: string;

  constructor() {
    this.configService = ConfigService.getInstance();
    this.templateService = BotConfigTemplateService.getInstance();
    this.botDirectory = path.join(__dirname, "../../../bot");
    this.dataDirectory = path.join(__dirname, "../../../data");
  }

  private async killProcessOnPort(port: number): Promise<void> {
    console.log(`🔍 Checking for processes on port ${port}...`);

    try {
      // First, try to find processes using the port
      const { stdout } = await execAsync(`lsof -ti:${port}`);
      const pids = stdout
        .trim()
        .split("\n")
        .filter((pid) => pid);

      if (pids.length === 0) {
        console.log(`✅ Port ${port} is free`);
        return;
      }

      console.log(
        `🎯 Found ${pids.length} process(es) using port ${port}: ${pids.join(
          ", "
        )}`
      );

      // Kill each process
      for (const pid of pids) {
        try {
          console.log(`💀 Killing process ${pid} on port ${port}...`);
          await execAsync(`kill -9 ${pid}`);
          console.log(`✅ Process ${pid} killed successfully`);
        } catch (error) {
          console.log(
            `⚠️  Could not kill process ${pid}: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
      }

      // Wait a moment for processes to fully terminate
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Verify port is now free
      try {
        const { stdout: checkStdout } = await execAsync(`lsof -ti:${port}`);
        const remainingPids = checkStdout
          .trim()
          .split("\n")
          .filter((pid) => pid);

        if (remainingPids.length > 0) {
          console.log(
            `⚠️  Warning: ${
              remainingPids.length
            } process(es) still using port ${port}: ${remainingPids.join(", ")}`
          );
        } else {
          console.log(`✅ Port ${port} is now free`);
        }
      } catch (error) {
        // If lsof fails, it means no processes are using the port
        console.log(`✅ Port ${port} confirmed free`);
      }
    } catch (error) {
      // If lsof command fails, it typically means no processes are using the port
      if (error instanceof Error && error.message.includes("lsof")) {
        console.log(
          `✅ No processes found on port ${port} (lsof returned empty)`
        );
      } else {
        console.log(
          `⚠️  Error checking port ${port}: ${
            error instanceof Error ? error.message : "Unknown error"
          }`
        );
      }
    }
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

  /**
   * Creates a bot record in the JSON configuration without spawning the process.
   * This allows for immediate response to the frontend while spawning happens asynchronously.
   */
  async createBotRecord(
    botConfig: Omit<Bot, "id" | "createdAt" | "updatedAt" | "status" | "statusMessage">
  ): Promise<Bot> {
    const botId = `whatsapp-bot-${Date.now()}`;
    const pm2ServiceId = `wabot-${botConfig.apiPort}`;

    console.log(`📝 Creating bot record for: ${botConfig.name} (${botId})`);

    const newBot: Bot = {
      ...botConfig,
      id: botId,
      type: botConfig.type || "whatsapp",
      pm2ServiceId: pm2ServiceId,
      isExternal: false,
      status: "spawning",
      statusMessage: "Bot record created, spawning process...",
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // Add to configuration immediately
    const addedBot = this.configService.addBot(newBot);
    console.log(`✅ Bot record created: ${addedBot.id} - ${addedBot.name}`);

    return addedBot;
  }

  /**
   * Spawns the actual bot process asynchronously.
   * Updates the bot status throughout the process.
   */
  async spawnBotProcess(botId: string): Promise<void> {
    console.log(`🚀 Starting spawn process for bot: ${botId}`);

    try {
      // Get bot configuration
      const bot = this.configService.getBotById(botId);
      if (!bot) {
        throw new Error(`Bot not found: ${botId}`);
      }

      // Update status to indicate spawning started
      this.updateBotStatus(botId, "spawning", "Validating bot directory...");

      // 1. Validate bot directory
      await this.validateBotDirectory();

      // Update status
      this.updateBotStatus(botId, "spawning", "Creating data directories...");

      // 2. Create data directories
      await this.createBotDataDirectories(botId);

      // Update status
      this.updateBotStatus(botId, "spawning", "Starting PM2 process...");

      // 3. Start bot with PM2
      await this.startBotWithPM2(botId, bot);

      // Update status to online
      this.updateBotStatus(botId, "online", "Bot spawned successfully");

      console.log(`✅ Bot ${botId} spawned successfully`);

    } catch (error) {
      console.error(`❌ Failed to spawn bot ${botId}:`, error);
      
      // Update status to error
      const errorMessage = error instanceof Error ? error.message : "Unknown spawn error";
      this.updateBotStatus(botId, "error", errorMessage);

      // Attempt cleanup
      try {
        await this.cleanupFailedBot(botId);
      } catch (cleanupError) {
        console.error(`❌ Cleanup failed for bot ${botId}:`, cleanupError);
      }

      throw error;
    }
  }

  /**
   * Updates the bot status and status message in the configuration.
   */
  updateBotStatus(botId: string, status: "spawning" | "online" | "error" | "stopped" | "unknown", statusMessage?: string): void {
    const updates: Partial<Bot> = {
      status: status,
      statusMessage: statusMessage,
      updatedAt: new Date().toISOString(),
    };

    const updatedBot = this.configService.updateBot(botId, updates);
    if (updatedBot) {
      console.log(`📊 Bot ${botId} status updated: ${status}${statusMessage ? ` - ${statusMessage}` : ''}`);
    } else {
      console.warn(`⚠️ Cannot update status for non-existent bot: ${botId}`);
    }
  }

  /**
   * Cleans up a failed bot creation attempt.
   */
  private async cleanupFailedBot(botId: string): Promise<void> {
    console.log(`🧹 Cleaning up failed bot: ${botId}`);

    try {
      const bot = this.configService.getBotById(botId);
      if (!bot) return;

      // Try to stop and delete PM2 service
      if (bot.pm2ServiceId) {
        try {
          await this.stopPM2Service(bot.pm2ServiceId);
          await this.deletePM2Service(bot.pm2ServiceId);
        } catch (pm2Error) {
          console.warn(`⚠️ PM2 cleanup warning:`, pm2Error);
        }
      }

      // Kill any processes on the port
      await this.killProcessOnPort(bot.apiPort);

      // Keep the bot record but update status to error
      // Don't delete the record so user can see what failed
      console.log(`✅ Cleanup completed for failed bot: ${botId}`);

    } catch (error) {
      console.error(`❌ Cleanup failed:`, error);
    }
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
      const step1Start = Date.now();
      await this.validateBotDirectory();
      console.log(`✅ STEP 1 completed in ${Date.now() - step1Start}ms`);

      // 2. Crear directorios centrales para este bot
      console.log(`📋 STEP 2: Creating data directories...`);
      const step2Start = Date.now();
      await this.createBotDataDirectories(botId);
      console.log(`✅ STEP 2 completed in ${Date.now() - step2Start}ms`);

      // 3. Iniciar bot con PM2 usando variables de entorno
      console.log(`📋 STEP 3: Starting bot with PM2...`);
      const step3Start = Date.now();
      await this.startBotWithPM2(botId, botConfig);
      console.log(`✅ STEP 3 completed in ${Date.now() - step3Start}ms`);

      // 4. Agregar a configuración central (config/bots.json)
      console.log(`📋 STEP 4: Adding bot to configuration...`);
      const step4Start = Date.now();
      const newBot = await this.addBotToConfig(botConfig, botId);
      console.log(`✅ STEP 4 completed in ${Date.now() - step4Start}ms`);

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
      console.log(`📛 Bot Name: ${botConfig.name}`);
      console.log(`🔌 Port: ${botConfig.apiPort}`);
      console.log(`⏰ Failure Time: ${new Date().toISOString()}`);
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
      const cleanupStart = Date.now();
      try {
        // First try to stop and delete PM2 service
        const pm2ServiceId = `wabot-${botConfig.apiPort}`;
        console.log(`🛑 Cleaning up PM2 service: ${pm2ServiceId}`);
        await this.stopPM2Service(pm2ServiceId).catch((err) => {
          console.log(
            `⚠️  Could not stop PM2 service during cleanup: ${err.message}`
          );
        });
        await this.deletePM2Service(pm2ServiceId).catch((err) => {
          console.log(
            `⚠️  Could not delete PM2 service during cleanup: ${err.message}`
          );
        });

        // Then kill any processes on the port
        await this.killProcessOnPort(botConfig.apiPort);

        // Finally, remove bot from config and delete data
        await this.deleteBot(botId);
        console.log(
          `✅ Cleanup completed in ${Date.now() - cleanupStart}ms for ${botId}`
        );
      } catch (cleanupError) {
        console.log(
          `⚠️  Cleanup failed in ${Date.now() - cleanupStart}ms: ${
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
    console.log(`🚀 Starting bot ${botId} with PM2 using template configuration...`);

    // Step 1: Compile bot to JavaScript for better performance and memory usage
    console.log(`🔨 Compiling bot TypeScript to JavaScript...`);
    await this.compileBotProject();

    // Step 2: Kill any process using the target port
    await this.killProcessOnPort(botConfig.apiPort);

    const pm2ServiceId = `wabot-${botConfig.apiPort}`;

    // Step 3: Get PM2 configuration from template service
    console.log(`📋 Loading PM2 configuration from template...`);
    const pm2Config = this.templateService.getPM2Config(botId, botConfig);
    
    // Log the configuration being used
    const template = this.templateService.loadTemplate();
    console.log(`✅ Template configuration loaded:`);
    console.log(`   - Memory limit: ${template.pm2Config.memory.maxMemoryRestart}`);
    console.log(`   - Node args: ${template.pm2Config.nodeArgs.join(' ')}`);
    console.log(`   - Max restarts: ${template.pm2Config.memory.maxRestarts}`);
    console.log(`   - Min uptime: ${template.pm2Config.memory.minUptime}ms`);
    console.log(`   - Restart delay: ${template.pm2Config.timeouts.restartDelay}ms`);

    return new Promise((resolve, reject) => {
      pm2.connect(async (err) => {
        if (err) {
          console.error("Failed to connect to PM2:", err);
          reject(err);
          return;
        }

        try {
          // First, ensure any existing process is removed
          await new Promise((resolve, reject) => {
            pm2.delete(pm2ServiceId, (err) => {
              if (err && !err.message.includes("unknown process")) {
                console.warn(`Warning cleaning up old process: ${err.message}`);
              }
              resolve(true);
            });
          });

          // Start the new process with template configuration
          pm2.start(pm2Config, async (startErr) => {
            if (startErr) {
              console.error(`Failed to start PM2 process:`, startErr);
              pm2.disconnect();
              reject(startErr);
              return;
            }

            // Verify the process started correctly
            try {
              const status = await this.verifyPM2ProcessCreation(
                pm2ServiceId,
                botConfig.apiPort
              );
              if (status.success) {
                console.log(
                  `✅ PM2 process ${pm2ServiceId} started successfully`
                );
                pm2.disconnect();
                resolve();
              } else {
                throw new Error(`Process verification failed: ${status.error}`);
              }
            } catch (verifyError) {
              pm2.disconnect();
              reject(verifyError);
            }
          });
        } catch (error) {
          pm2.disconnect();
          reject(error);
        }
      });
    });
  }

  private async verifyPM2ProcessCreation(
    pm2ServiceId: string,
    expectedPort: number,
    maxRetries: number = 10,
    delayMs: number = 2000
  ): Promise<{
    success: boolean;
    pid?: number;
    status?: string;
    cpu?: number;
    memory?: number;
    restarts?: number;
    error?: string;
  }> {
    console.log(
      `🔍 Verifying PM2 process ${pm2ServiceId} (max ${maxRetries} attempts)...`
    );

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await new Promise<void>((resolve, reject) => {
          pm2.connect((err) => {
            if (err) reject(err);
            else resolve();
          });
        });

        const list = await new Promise<any[]>((resolve, reject) => {
          pm2.list((err, processList) => {
            if (err) reject(err);
            else resolve(processList);
          });
        });

        const process = list.find((p) => p.name === pm2ServiceId);

        if (process) {
          const status = process.pm2_env?.status || "unknown";
          console.log(`📊 Process status: ${status}`);

          if (status === "online") {
            const result = {
              success: true,
              pid: process.pid,
              status: status,
              cpu: process.monit?.cpu,
              memory: process.monit?.memory,
              restarts: process.pm2_env?.restart_time || 0,
            };

            pm2.disconnect();
            return result;
          }
        }

        console.log(
          `⏳ Attempt ${attempt}: Process not ready, waiting ${delayMs}ms...`
        );
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      } catch (error) {
        console.error(`❌ Attempt ${attempt} failed:`, error);
      } finally {
        pm2.disconnect();
      }
    }

    throw new Error(
      `Failed to verify PM2 process creation after ${maxRetries} attempts`
    );
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

    // Lista de nombres posibles para el servicio PM2
    const possibleNames = [
      bot.pm2ServiceId,
      botId,
      `wabot-${botId}`,
      `whatsapp-${botId}`,
      `bot-${botId}`,
      `discord-${botId}`
    ].filter(Boolean); // Remove null/undefined values

    // Si tenemos el puerto, agregarlo también
    if (bot.apiPort) {
      possibleNames.push(`wabot-${bot.apiPort}`);
    }

    console.log(`🎯 Trying to stop PM2 services: ${possibleNames.join(', ')}`);

    return new Promise((resolve) => {
      pm2.connect(async (err) => {
        if (err) {
          console.error(`❌ Failed to connect to PM2:`, err);
          resolve(false);
          return;
        }

        let stoppedAny = false;

        // Intentar detener cada posible nombre
        for (const serviceName of possibleNames) {
          if (!serviceName) continue; // Skip null/undefined values
          
          try {
            await new Promise<void>((resolveStop) => {
              pm2.stop(serviceName, (stopErr) => {
                if (!stopErr) {
                  console.log(`✅ Stopped PM2 service: ${serviceName}`);
                  stoppedAny = true;
                } else {
                  console.warn(`⚠️  Could not stop ${serviceName}: ${stopErr.message}`);
                }
                resolveStop();
              });
            });
          } catch (stopError) {
            console.warn(`⚠️  Error stopping ${serviceName}:`, stopError);
          }
        }

        pm2.disconnect();

        if (stoppedAny) {
          console.log(`✅ Successfully stopped bot: ${botId}`);
          resolve(true);
        } else {
          console.warn(`⚠️  No PM2 service found to stop for bot: ${botId}`);
          resolve(false);
        }
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

        // First, check if the process exists
        pm2.describe(pm2ServiceId, (describeErr, processDescription) => {
          if (
            describeErr ||
            !processDescription ||
            processDescription.length === 0
          ) {
            console.log(
              `⚠️  Process ${pm2ServiceId} not found in PM2. Auto-creating...`
            );
            pm2.disconnect();

            // Process doesn't exist, create it automatically
            this.startBotWithPM2(botId, bot)
              .then(() => {
                console.log(
                  `✅ Bot ${botId} (PM2: ${pm2ServiceId}) created and started successfully`
                );
                resolve(true);
              })
              .catch((createError) => {
                console.error(
                  `❌ Failed to auto-create bot ${botId}:`,
                  createError
                );
                resolve(false);
              });
          } else {
            // Process exists, restart it
            pm2.restart(pm2ServiceId, (restartErr) => {
              pm2.disconnect();

              if (restartErr) {
                console.error(
                  `❌ Error starting bot ${botId} (PM2: ${pm2ServiceId}):`,
                  restartErr
                );
                resolve(false);
              } else {
                console.log(
                  `✅ Bot ${botId} (PM2: ${pm2ServiceId}) started successfully`
                );
                resolve(true);
              }
            });
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

      // 2. Eliminar de PM2 (intentar diferentes nombres posibles)
      await new Promise<void>((resolve) => {
        pm2.connect(async (err) => {
          if (err) {
            console.warn(`⚠️  Warning connecting to PM2: ${err.message}`);
            resolve();
            return;
          }

          // Lista de nombres posibles para el servicio PM2
          const possibleNames = [
            botId,
            `wabot-${botId}`,
            `whatsapp-${botId}`,
            `bot-${botId}`,
            `discord-${botId}`
          ];

          // Intentar eliminar cada posible nombre
          let deletedAny = false;
          for (const name of possibleNames) {
            if (!name) continue; // Skip null/undefined values
            
            try {
              await new Promise<void>((resolveDelete) => {
                pm2.delete(name, (deleteErr) => {
                  if (!deleteErr) {
                    console.log(`✅ Bot service ${name} removed from PM2`);
                    deletedAny = true;
                  }
                  resolveDelete();
                });
              });
            } catch (deleteError) {
              // Continue trying other names
            }
          }

          // Si no se eliminó ningún servicio, buscar por port
          if (!deletedAny) {
            try {
              const bot = this.configService.getBotById(botId);
              if (bot && bot.apiPort) {
                await new Promise<void>((resolveDelete) => {
                  pm2.delete(`wabot-${bot.apiPort}`, (deleteErr) => {
                    if (!deleteErr) {
                      console.log(`✅ Bot service wabot-${bot.apiPort} removed from PM2`);
                      deletedAny = true;
                    }
                    resolveDelete();
                  });
                });
              }
            } catch (portDeleteError) {
              console.warn(`⚠️  Could not delete by port: ${portDeleteError}`);
            }
          }

          pm2.disconnect();
          
          if (!deletedAny) {
            console.warn(`⚠️  No PM2 service found for bot ${botId}`);
          }
          
          resolve();
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

  async restartPM2Service(pm2ServiceId: string): Promise<any> {
    console.log(`🔄 Restarting PM2 service: ${pm2ServiceId}`);

    return new Promise((resolve, reject) => {
      pm2.connect((err) => {
        if (err) {
          console.error("❌ Failed to connect to PM2:", err);
          reject(new Error(`PM2 connection failed: ${err.message}`));
          return;
        }

        pm2.restart(pm2ServiceId, (err, proc) => {
          pm2.disconnect();

          if (err) {
            console.error(
              `❌ Failed to restart PM2 service ${pm2ServiceId}:`,
              err
            );
            reject(new Error(`Failed to restart PM2 service: ${err.message}`));
          } else {
            console.log(
              `✅ PM2 service ${pm2ServiceId} restarted successfully`
            );
            resolve(proc);
          }
        });
      });
    });
  }

  async stopPM2Service(pm2ServiceId: string): Promise<any> {
    console.log(`🛑 Stopping PM2 service: ${pm2ServiceId}`);

    return new Promise((resolve, reject) => {
      pm2.connect((err) => {
        if (err) {
          console.error("❌ Failed to connect to PM2:", err);
          reject(new Error(`PM2 connection failed: ${err.message}`));
          return;
        }

        pm2.stop(pm2ServiceId, (err, proc) => {
          pm2.disconnect();

          if (err) {
            console.error(
              `❌ Failed to stop PM2 service ${pm2ServiceId}:`,
              err
            );
            reject(new Error(`Failed to stop PM2 service: ${err.message}`));
          } else {
            console.log(`✅ PM2 service ${pm2ServiceId} stopped successfully`);
            resolve(proc);
          }
        });
      });
    });
  }

  async deletePM2Service(pm2ServiceId: string): Promise<any> {
    console.log(`🗑️ Deleting PM2 service: ${pm2ServiceId}`);

    return new Promise((resolve, reject) => {
      pm2.connect((err) => {
        if (err) {
          console.error("❌ Failed to connect to PM2:", err);
          reject(new Error(`PM2 connection failed: ${err.message}`));
          return;
        }

        pm2.delete(pm2ServiceId, (err, proc) => {
          pm2.disconnect();

          if (err) {
            console.error(
              `❌ Failed to delete PM2 service ${pm2ServiceId}:`,
              err
            );
            reject(new Error(`Failed to delete PM2 service: ${err.message}`));
          } else {
            console.log(`✅ PM2 service ${pm2ServiceId} deleted successfully`);
            resolve(proc);
          }
        });
      });
    });
  }

  async recreatePM2Service(
    bot: Bot
  ): Promise<{ pm2ServiceId: string; result: any }> {
    console.log(`🔧 Recreating PM2 service for bot: ${bot.id}`);

    if (bot.isExternal) {
      throw new Error("Cannot recreate PM2 service for external bot");
    }

    const pm2ServiceId = `wabot-${bot.apiPort}`;

    // Try to stop and delete existing service (ignore errors)
    try {
      await this.stopPM2Service(pm2ServiceId);
      await this.deletePM2Service(pm2ServiceId);
    } catch (error) {
      console.log(
        `ℹ️ No existing PM2 service to remove or error during cleanup: ${error}`
      );
    }

    // Start new service using existing method
    await this.startBotWithPM2(bot.id, bot);

    return {
      pm2ServiceId,
      result: { message: `PM2 service ${pm2ServiceId} recreated successfully` },
    };
  }

  async getPM2ServiceStatus(pm2ServiceId: string): Promise<{
    status: "online" | "stopped" | "errored" | "unknown";
    pid?: number;
    cpu?: number;
    memory?: number;
    restarts?: number;
    uptime?: number;
    lastRestart?: string;
  }> {
    console.log(`📊 Getting PM2 status for service: ${pm2ServiceId}`);

    return new Promise((resolve, reject) => {
      pm2.connect((err) => {
        if (err) {
          console.error("❌ Failed to connect to PM2:", err);
          reject(new Error(`PM2 connection failed: ${err.message}`));
          return;
        }

        pm2.describe(pm2ServiceId, (err, processDescriptionList) => {
          pm2.disconnect();

          if (err) {
            console.error(
              `❌ Failed to describe PM2 service ${pm2ServiceId}:`,
              err
            );
            resolve({ status: "unknown" });
            return;
          }

          if (!processDescriptionList || processDescriptionList.length === 0) {
            console.log(`ℹ️ PM2 service ${pm2ServiceId} not found`);
            resolve({ status: "unknown" });
            return;
          }

          const process = processDescriptionList[0];
          const pm2Process = process.pm2_env;
          const monit = process.monit;

          console.log(`✅ PM2 service ${pm2ServiceId} status retrieved`);

          resolve({
            status:
              pm2Process?.status === "online"
                ? "online"
                : pm2Process?.status === "stopped"
                ? "stopped"
                : pm2Process?.status === "errored"
                ? "errored"
                : "unknown",
            pid: process.pid || undefined,
            cpu: monit?.cpu || undefined,
            memory: monit?.memory
              ? Math.round(monit.memory / (1024 * 1024))
              : undefined, // Convert to MB
            restarts: pm2Process?.restart_time || undefined,
            uptime: pm2Process?.pm_uptime || undefined,
            lastRestart: pm2Process?.restart_time
              ? new Date(pm2Process.restart_time).toISOString()
              : undefined,
          });
        });
      });
    });
  }

  /**
   * Compiles the bot TypeScript project to JavaScript for better performance
   */
  private async compileBotProject(): Promise<void> {
    try {
      console.log(`🔨 Running npm run build in bot directory...`);
      
      const { stdout, stderr } = await execAsync('npm run build', {
        cwd: this.botDirectory,
        timeout: 60000 // 60 second timeout
      });

      if (stderr && !stderr.includes('npm WARN')) {
        console.warn(`⚠️  Build warnings: ${stderr}`);
      }
      
      console.log(`✅ Bot project compiled successfully`);
      if (stdout) {
        console.log(`Build output: ${stdout.substring(0, 200)}...`);
      }
    } catch (error: any) {
      console.error(`❌ Bot compilation failed:`, error.message);
      if (error.stdout) console.error(`Stdout: ${error.stdout}`);
      if (error.stderr) console.error(`Stderr: ${error.stderr}`);
      throw new Error(`Bot compilation failed: ${error.message}`);
    }
  }

  /**
   * Update bot template configuration dynamically
   */
  public updateBotTemplate(configPath: string, value: any): boolean {
    console.log(`🔧 Updating bot template configuration: ${configPath} = ${value}`);
    return this.templateService.updateConfig(configPath, value);
  }

  /**
   * Reload bot template configuration
   */
  public reloadBotTemplate(): void {
    console.log(`🔄 Reloading bot template configuration...`);
    this.templateService.reloadTemplate();
  }

  /**
   * Get current bot template configuration
   */
  public getBotTemplate() {
    return this.templateService.loadTemplate();
  }

  /**
   * Update memory configuration for all bots
   */
  public async updateMemoryConfig(maxMemoryRestart: string, nodeMaxOldSpace: number): Promise<boolean> {
    try {
      // Update template configuration
      this.templateService.updateConfig('pm2Config.memory.maxMemoryRestart', maxMemoryRestart);
      this.templateService.updateConfig('pm2Config.nodeArgs.0', `--max-old-space-size=${nodeMaxOldSpace}`);
      
      console.log(`✅ Updated memory configuration:`);
      console.log(`   - PM2 memory restart: ${maxMemoryRestart}`);
      console.log(`   - Node max old space: ${nodeMaxOldSpace}MB`);
      
      return true;
    } catch (error) {
      console.error(`❌ Failed to update memory configuration:`, error);
      return false;
    }
  }

  /**
   * Apply template configuration to existing bots (restart required)
   */
  public async applyTemplateToExistingBots(): Promise<{success: boolean, restartedBots: string[]}> {
    const restartedBots: string[] = [];
    
    try {
      const bots = this.configService.getAllBots();
      
      for (const bot of bots) {
        if (bot.pm2ServiceId && !bot.isExternal) {
          console.log(`🔄 Applying new template to bot ${bot.id} (${bot.pm2ServiceId})...`);
          
          try {
            // Stop the current PM2 service
            await this.stopPM2Service(bot.pm2ServiceId);
            
            // Recreate with new template configuration
            const result = await this.recreatePM2Service(bot);
            
            if (result.pm2ServiceId) {
              restartedBots.push(bot.id);
              console.log(`✅ Template applied to bot ${bot.id} with new config`);
            }
          } catch (error) {
            console.error(`❌ Failed to apply template to bot ${bot.id}:`, error);
          }
        } else if (bot.isExternal) {
          console.log(`⚠️  Skipping external bot ${bot.id}`);
        }
      }
      
      return { success: true, restartedBots };
    } catch (error) {
      console.error(`❌ Failed to apply template to existing bots:`, error);
      return { success: false, restartedBots };
    }
  }
}
