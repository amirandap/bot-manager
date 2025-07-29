import fs from "fs";
import path from "path";
import pm2 from "pm2";
import dotenv from "dotenv";
import { exec } from "child_process";
import { promisify } from "util";
import { ConfigService } from "./configService";
import { Bot } from "../types";

const execAsync = promisify(exec);

export class BotSpawnerService {
  private configService: ConfigService;
  private botDirectory: string;
  private dataDirectory: string;

  constructor() {
    this.configService = ConfigService.getInstance();
    this.botDirectory = path.join(__dirname, "../../../bot");
    this.dataDirectory = path.join(__dirname, "../../../data");
  }

  private async killProcessOnPort(port: number): Promise<void> {
    console.log(`🔍 Checking for processes on port ${port}...`);
    
    try {
      // First, try to find processes using the port
      const { stdout } = await execAsync(`lsof -ti:${port}`);
      const pids = stdout.trim().split('\n').filter(pid => pid);
      
      if (pids.length === 0) {
        console.log(`✅ Port ${port} is free`);
        return;
      }

      console.log(`🎯 Found ${pids.length} process(es) using port ${port}: ${pids.join(', ')}`);
      
      // Kill each process
      for (const pid of pids) {
        try {
          console.log(`💀 Killing process ${pid} on port ${port}...`);
          await execAsync(`kill -9 ${pid}`);
          console.log(`✅ Process ${pid} killed successfully`);
        } catch (error) {
          console.log(`⚠️  Could not kill process ${pid}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      // Wait a moment for processes to fully terminate
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Verify port is now free
      try {
        const { stdout: checkStdout } = await execAsync(`lsof -ti:${port}`);
        const remainingPids = checkStdout.trim().split('\n').filter(pid => pid);
        
        if (remainingPids.length > 0) {
          console.log(`⚠️  Warning: ${remainingPids.length} process(es) still using port ${port}: ${remainingPids.join(', ')}`);
        } else {
          console.log(`✅ Port ${port} is now free`);
        }
      } catch (error) {
        // If lsof fails, it means no processes are using the port
        console.log(`✅ Port ${port} confirmed free`);
      }
      
    } catch (error) {
      // If lsof command fails, it typically means no processes are using the port
      if (error instanceof Error && error.message.includes('lsof')) {
        console.log(`✅ No processes found on port ${port} (lsof returned empty)`);
      } else {
        console.log(`⚠️  Error checking port ${port}: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
        await this.stopPM2Service(pm2ServiceId).catch(err => {
          console.log(`⚠️  Could not stop PM2 service during cleanup: ${err.message}`);
        });
        await this.deletePM2Service(pm2ServiceId).catch(err => {
          console.log(`⚠️  Could not delete PM2 service during cleanup: ${err.message}`);
        });

        // Then kill any processes on the port
        await this.killProcessOnPort(botConfig.apiPort);
        
        // Finally, remove bot from config and delete data
        await this.deleteBot(botId);
        console.log(`✅ Cleanup completed in ${Date.now() - cleanupStart}ms for ${botId}`);
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
    console.log(`🚀 Starting bot ${botId} with PM2...`);

    // Step 1: Kill any process using the target port
    await this.killProcessOnPort(botConfig.apiPort);

    // Load bot environment defaults from bot folder .env
    const botEnvDefaults = this.loadBotEnvironmentDefaults();

    // Determine the correct Chrome executable path based on the operating system
    let chromeExecutablePath;

    if (process.env.CHROME_PATH) {
      chromeExecutablePath = process.env.CHROME_PATH;
    } else if (process.platform === "darwin") {
      // macOS
      chromeExecutablePath =
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    } else if (process.platform === "linux") {
      // Linux
      chromeExecutablePath = "/snap/bin/chromium";
    } else if (process.platform === "win32") {
      // Windows
      chromeExecutablePath =
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    } else {
      // Default fallback
      chromeExecutablePath = "/snap/bin/chromium";
    }

    // Create isolated environment for bot (no system env pollution)
    const botEnv = {
      // Essential system variables only (with fallbacks)
      HOME: process.env.HOME || "/tmp",
      USER: process.env.USER || "botuser",
      PATH: process.env.PATH || "/usr/local/bin:/usr/bin:/bin",
      
      // Bot-specific configuration (hardcoded, no system env conflicts)
      BOT_ID: botId,
      BOT_NAME: botConfig.name,
      BOT_PORT: botConfig.apiPort.toString(),
      PORT: botConfig.apiPort.toString(),
      BOT_TYPE: botConfig.type || "whatsapp",
      BASE_URL: `${botConfig.apiHost}:${botConfig.apiPort}`,
      NODE_ENV: "production",
      CHROME_PATH: chromeExecutablePath,
      
      // Bot environment defaults (from bot/.env) - ensure all values are strings
      ...Object.fromEntries(
        Object.entries(botEnvDefaults).map(([key, value]) => [key, String(value)])
      ),
    };        console.log(`📦 PM2 Configuration:`);
        console.log(`   - Script: ${path.join(this.botDirectory, "src/index.ts")}`);
        console.log(`   - Interpreter: ${path.join(this.botDirectory, "node_modules/.bin/ts-node")}`);
        console.log(`   - Working Directory: ${this.botDirectory}`);
        console.log(`   - Process Name: wabot-${botConfig.apiPort}`);
        console.log(`📋 Environment Variables:`);
        console.log(`   - BOT_ID: ${botEnv.BOT_ID}`);
        console.log(`   - BOT_NAME: ${botEnv.BOT_NAME}`);
        console.log(`   - BOT_PORT: ${botEnv.BOT_PORT}`);
        console.log(`   - PORT: ${botEnv.PORT} (for bot compatibility)`);
        console.log(`   - BOT_TYPE: ${botEnv.BOT_TYPE}`);
        console.log(`   - BASE_URL: ${botEnv.BASE_URL}`);
        console.log(`   - NODE_ENV: ${botEnv.NODE_ENV}`);
        console.log(`   - CHROME_PATH: ${botEnv.CHROME_PATH}`);

        // Check if ts-node exists
        const tsNodePath = path.join(this.botDirectory, "node_modules/.bin/ts-node");
        if (!fs.existsSync(tsNodePath)) {
          console.error(`❌ ts-node not found at: ${tsNodePath}`);
          console.log(`💡 Trying to install ts-node in bot directory...`);
          // You might want to run npm install here
        } else {
          console.log(`✅ ts-node found at: ${tsNodePath}`);
        }

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
          interpreter: path.join(this.botDirectory, "node_modules/.bin/ts-node"),
          interpreter_args: "--files -r tsconfig-paths/register",
          cwd: this.botDirectory,
          env: botEnv,
          // Use fixed log paths instead of environment variables
          error_file: path.join("/home/linuxuser/bot-manager/logs", `${pm2ServiceId}-error.log`),
          out_file: path.join("/home/linuxuser/bot-manager/logs", `${pm2ServiceId}-out.log`),
          log_file: path.join("/home/linuxuser/bot-manager/logs", `${pm2ServiceId}.log`),
          autorestart: true,
          max_restarts: 10,
          min_uptime: 10000, // 10 seconds in milliseconds
        };

        console.log(`📄 Starting PM2 process with name: ${pm2ServiceId}...`);
        console.log(`📋 PM2 Configuration Details:`);
        console.log(`   - Process Name: ${pm2ServiceId}`);
        console.log(`   - Script Path: ${pm2Config.script}`);
        console.log(`   - Interpreter: ${pm2Config.interpreter}`);
        console.log(`   - Working Directory: ${pm2Config.cwd}`);
        console.log(`   - Error Log: ${pm2Config.error_file}`);
        console.log(`   - Output Log: ${pm2Config.out_file}`);
        console.log(`   - Combined Log: ${pm2Config.log_file}`);
        
        pm2.start(pm2Config, async (err, proc) => {
          if (err) {
            console.log(`🔌 Disconnecting from PM2 due to error...`);
            pm2.disconnect();
            
            console.error(`❌ PM2 start failed for ${botId}:`);
            console.error(`   Error: ${err.message}`);
            console.error(`   Full error object:`, err);
            if (err.message.includes("already exists")) {
              console.error(
                `   💡 Suggestion: Process name conflict. Try stopping the existing process first.`
              );
            } else if (err.message.includes("ENOENT")) {
              console.error(
                `   💡 Suggestion: Check if the script file exists and ts-node is installed.`
              );
              console.error(`   Script path: ${path.join(this.botDirectory, "src/index.ts")}`);
              console.error(`   ts-node path: ${path.join(this.botDirectory, "node_modules/.bin/ts-node")}`);
            } else if (err.message.includes("port")) {
              console.error(
                `   💡 Suggestion: Port ${botConfig.apiPort} might be in use.`
              );
            }
            reject(new Error(`PM2 start failed: ${err.message}`));
            return;
          }

          // Step 2: Verify the PM2 process was created successfully
          console.log(`🔍 Verifying PM2 process creation...`);
          try {
            const verificationResult = await this.verifyPM2ProcessCreation(pm2ServiceId, botConfig.apiPort);
            
            console.log(`� Disconnecting from PM2...`);
            pm2.disconnect();
            
            if (verificationResult.success) {
              console.log(`✅ Bot ${botId} started with PM2 successfully`);
              console.log(`📄 PM2 process verification completed`);
              console.log(`📊 Process details:`);
              console.log(`   - PM2 Service ID: ${pm2ServiceId}`);
              console.log(`   - PID: ${verificationResult.pid}`);
              console.log(`   - Status: ${verificationResult.status}`);
              console.log(`   - Port: ${botConfig.apiPort}`);
              console.log(`   - CPU: ${verificationResult.cpu}%`);
              console.log(`   - Memory: ${verificationResult.memory}MB`);
              console.log(`   - Restarts: ${verificationResult.restarts}`);
              resolve();
            } else {
              throw new Error(`PM2 process verification failed: ${verificationResult.error}`);
            }
          } catch (verificationError) {
            console.log(`🔌 Disconnecting from PM2 due to verification error...`);
            pm2.disconnect();
            
            console.error(`❌ PM2 process verification failed for ${botId}:`);
            console.error(`   Error: ${verificationError instanceof Error ? verificationError.message : 'Unknown verification error'}`);
            reject(new Error(`PM2 process verification failed: ${verificationError instanceof Error ? verificationError.message : 'Unknown verification error'}`));
          }
        });
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
    console.log(`🔍 Verifying PM2 process ${pm2ServiceId} creation (max ${maxRetries} attempts)...`);
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`   Attempt ${attempt}/${maxRetries}: Checking PM2 process status...`);
      
      try {
        // Check if PM2 process exists and is running
        const pm2Status = await this.getPM2ServiceStatus(pm2ServiceId);
        
        if (pm2Status.status === "online") {
          console.log(`   ✅ PM2 process is online (PID: ${pm2Status.pid})`);
          
          // Additional verification: check if the port is actually being used by our process
          try {
            const { stdout } = await execAsync(`lsof -ti:${expectedPort}`);
            const pids = stdout.trim().split('\n').filter(pid => pid);
            
            if (pids.includes(pm2Status.pid?.toString() || '')) {
              console.log(`   ✅ Process is correctly listening on port ${expectedPort}`);
              return {
                success: true,
                pid: pm2Status.pid,
                status: pm2Status.status,
                cpu: pm2Status.cpu,
                memory: pm2Status.memory,
                restarts: pm2Status.restarts
              };
            } else {
              console.log(`   ⚠️  Process exists but not listening on expected port ${expectedPort}`);
              console.log(`   🔍 Processes on port ${expectedPort}: ${pids.join(', ')}`);
            }
          } catch (portError) {
            console.log(`   ⚠️  Could not verify port usage: ${portError instanceof Error ? portError.message : 'Unknown error'}`);
          }
        } else {
          console.log(`   ⚠️  PM2 process status: ${pm2Status.status}`);
        }
        
        if (attempt < maxRetries) {
          console.log(`   ⏳ Waiting ${delayMs}ms before next attempt...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
        
      } catch (error) {
        console.log(`   ❌ Error during verification attempt ${attempt}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        
        if (attempt < maxRetries) {
          console.log(`   ⏳ Waiting ${delayMs}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delayMs));
        }
      }
    }
    
    return {
      success: false,
      error: `Failed to verify PM2 process creation after ${maxRetries} attempts`
    };
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
}
