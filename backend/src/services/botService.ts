import axios from "axios";
import pm2 from "pm2";
import { Bot, BotStatus } from "../types";
import { ConfigService } from "./configService";
import { pm2MetricsService, PM2ProcessMetrics } from "./PM2MetricsService";

export class BotService {
  private configService: ConfigService;

  constructor() {
    this.configService = ConfigService.getInstance();
  }

  public async getAllBots(): Promise<Bot[]> {
    try {
      console.log("BotService: Getting all bots from config...");

      // First, let's see what the config service loads
      const config = this.configService.loadConfig();
      console.log(
        "BotService: Raw config loaded:",
        JSON.stringify(config, null, 2)
      );

      const bots = this.configService.getAllBots();
      console.log("BotService: Retrieved", bots.length, "bots");
      console.log("BotService: Bots data:", JSON.stringify(bots, null, 2));

      return bots;
    } catch (error) {
      console.error("BotService: Error in getAllBots:", error);
      throw error;
    }
  }

  public async getBotsByType(type: "whatsapp" | "discord"): Promise<Bot[]> {
    return this.configService.getBotsByType(type);
  }

  public async getDiscordBotStatus(): Promise<BotStatus[]> {
    const discordBots = this.configService.getBotsByType("discord");
    const statuses: BotStatus[] = [];

    for (const bot of discordBots) {
      try {
        const response = await axios.get(
          `${bot.apiHost}:${bot.apiPort}/health`,
          {
            timeout: 5000,
          }
        );

        statuses.push({
          id: bot.id,
          name: bot.name,
          type: bot.type,
          status: response.status === 200 ? "online" : "offline",
          lastSeen: new Date().toISOString(),
        });
      } catch (error) {
        statuses.push({
          id: bot.id,
          name: bot.name,
          type: bot.type,
          status: "offline",
        });
      }
    }

    return statuses;
  }

  public async getWhatsAppBotStatus(): Promise<BotStatus[]> {
    const whatsappBots = this.configService.getBotsByType("whatsapp");
    const statuses: BotStatus[] = [];

    for (const bot of whatsappBots) {
      console.log(`📊 Checking status for bot: ${bot.id}`);

      let botStatus: BotStatus = {
        id: bot.id,
        name: bot.name,
        type: bot.type,
        status: "offline",
        phoneNumber: bot.phoneNumber,
        pushName: bot.pushName,
        apiResponsive: false,
      };

      // Check if bot is external (not managed by our PM2)
      if (bot.isExternal) {
        console.log(`🌐 Bot ${bot.id} is external - skipping PM2 status check`);

        // For external bots, only check API connectivity
        try {
          const startTime = Date.now();
          const response = await axios.get(
            `${bot.apiHost}:${bot.apiPort}/status`,
            {
              timeout: 5000,
            }
          );
          const responseTime = Date.now() - startTime;

          const isConnected =
            response.data.connected === true ||
            response.data.status === "online";

          botStatus = {
            ...botStatus,
            status: isConnected ? "online" : "offline",
            lastSeen: new Date().toISOString(),
            apiResponsive: true,
            apiResponseTime: responseTime,
          };

          console.log(
            `✅ External bot ${
              bot.id
            }: API=responsive(${responseTime}ms), Status=${
              isConnected ? "online" : "offline"
            }`
          );
        } catch (error) {
          console.log(`❌ External bot ${bot.id}: API=unresponsive`);
          botStatus.status = "offline";
        }
      } else {
        // For internal bots, check both PM2 and API
        const pm2ProcessId = bot.pm2ServiceId || bot.id;
        console.log(
          `🔍 Using PM2 process ID: ${pm2ProcessId} for bot: ${bot.id}`
        );

        // Get PM2 process status
        const pm2Status = await this.getPM2ProcessStatus(pm2ProcessId);

        // Initialize status object with PM2 data
        botStatus = {
          ...botStatus,
          status: pm2Status.status,
          pm2: {
            pid: pm2Status.pid,
            cpu: pm2Status.cpu,
            memory: pm2Status.memory,
            restarts: pm2Status.restarts,
            uptime: pm2Status.uptime,
            lastRestart: pm2Status.lastRestart,
          },
        };

        // If PM2 says the process is online, try to check API connectivity
        if (pm2Status.status === "online") {
          try {
            const startTime = Date.now();
            const response = await axios.get(
              `${bot.apiHost}:${bot.apiPort}/status`,
              {
                timeout: 5000,
              }
            );
            const responseTime = Date.now() - startTime;

            // Extract real bot information from API
            const realPhoneNumber =
              response.data.client?.wid?.user ||
              response.data.client?.me?.user ||
              bot.phoneNumber;
            const realPushName = response.data.client?.pushname || bot.pushName;

            // Determine final status based on API response
            const isConnected =
              response.data.connected === true ||
              response.data.status === "online";

            botStatus = {
              ...botStatus,
              status: isConnected ? "online" : "offline",
              lastSeen: new Date().toISOString(),
              phoneNumber: realPhoneNumber,
              pushName: realPushName,
              apiResponsive: true,
              apiResponseTime: responseTime,
            };

            console.log(
              `✅ Bot ${bot.id}: PM2=${
                pm2Status.status
              }, API=responsive(${responseTime}ms), WhatsApp=${
                isConnected ? "connected" : "disconnected"
              }`
            );
          } catch (error) {
            // PM2 says online but API is not responsive
            botStatus = {
              ...botStatus,
              status: "errored", // Process running but API not working
              apiResponsive: false,
            };

            console.log(
              `⚠️  Bot ${bot.id}: PM2=${pm2Status.status}, API=unresponsive, Status=errored`
            );
          }
        } else {
          // PM2 process is not online
          console.log(
            `❌ Bot ${bot.id}: PM2=${pm2Status.status}, API=not checked`
          );
        }
      }

      statuses.push(botStatus);
    }

    return statuses;
  }

  /**
   * 🚀 NEW: Get bot status using PM2 metrics (replaces API dependency)
   */
  public async getBotStatusViaMetrics(id: string): Promise<BotStatus | null> {
    console.log("📊 Getting bot status via PM2 metrics for ID:", id);

    const bot = this.configService.getBotById(id);
    if (!bot) {
      console.log("❌ Bot not found with ID:", id);
      return null;
    }

    // Initialize base status object
    let botStatus: BotStatus = {
      id: bot.id,
      name: bot.name,
      type: bot.type,
      status: "offline",
      phoneNumber: bot.phoneNumber,
      pushName: bot.pushName,
      apiResponsive: false,
    };

    // For external bots, try API only
    if (bot.isExternal) {
      console.log(`🌐 Bot ${bot.id} is external - checking API only`);
      return await this.checkExternalBotAPI(bot, botStatus);
    }

    // For internal bots, use PM2 metrics
    const pm2ProcessId = bot.pm2ServiceId || bot.id;
    console.log(`🔍 Getting PM2 metrics for process: ${pm2ProcessId}`);

    try {
      const metrics = await pm2MetricsService.getProcessMetrics(pm2ProcessId);

      if (!metrics) {
        console.log(`❌ No PM2 metrics found for ${pm2ProcessId}`);
        return { ...botStatus, status: "offline" };
      }

      console.log(`📊 PM2 Metrics for ${bot.id}:`, {
        status: metrics.status,
        memory: metrics.memory,
        cpu: metrics.cpu,
        uptime: metrics.uptime,
        restarts: metrics.restarts,
        errorCount: metrics.errorCount,
      });

      // Evaluate health based on metrics
      const healthEvaluation = pm2MetricsService.evaluateProcessHealth(metrics);

      // Map health status to bot status
      let computedStatus:
        | "online"
        | "offline"
        | "errored"
        | "unknown"
        | "launching";
      switch (healthEvaluation.status) {
        case "healthy":
          computedStatus = metrics.status === "online" ? "online" : "launching";
          break;
        case "warning":
          computedStatus = "online"; // Treat warnings as online but track in health object
          break;
        case "critical":
          computedStatus = "errored";
          break;
        default:
          computedStatus = "unknown";
      }

      // Build comprehensive status object
      botStatus = {
        ...botStatus,
        status: computedStatus,
        lastSeen: new Date().toISOString(),
        pm2: {
          pid: metrics.pid,
          cpu: metrics.cpu,
          memory: metrics.memory,
          restarts: metrics.restarts,
          uptime: metrics.uptime,
          status: metrics.status,
          // Advanced metrics
          activeHandles: metrics.activeHandles,
          activeRequests: metrics.activeRequests,
          eventLoopLatency: metrics.eventLoopLatency,
          heapUsage: metrics.heapUsage,
          errorCount: metrics.errorCount,
          httpRequests: metrics.httpRequests,
        },
        health: {
          status: healthEvaluation.status,
          score: healthEvaluation.score,
          issues: healthEvaluation.issues,
        },
      };

      // If process is online, try a quick API ping (optional)
      if (
        metrics.status === "online" &&
        healthEvaluation.status !== "critical"
      ) {
        try {
          const endpoint = bot.type === "discord" ? "/health" : "/status";
          const url = `${bot.apiHost}:${bot.apiPort}${endpoint}`;

          console.log(`🏓 Quick API ping to: ${url}`);
          const startTime = Date.now();

          const response = await axios.get(url, {
            timeout: 2000, // Quick ping only
          });

          const responseTime = Date.now() - startTime;

          botStatus.apiResponsive = true;
          botStatus.apiResponseTime = responseTime;

          // Try to extract real bot data if available
          if (bot.type === "whatsapp" && response.data?.client) {
            const realPhoneNumber =
              response.data.client.wid?.user ||
              response.data.client.me?.user ||
              bot.phoneNumber;
            const realPushName = response.data.client.pushname || bot.pushName;

            botStatus.phoneNumber = realPhoneNumber;
            botStatus.pushName = realPushName;

            // Update config with real data
            this.configService.updateBotWithRealData(
              bot.id,
              realPhoneNumber || undefined,
              realPushName || undefined
            );
          }

          console.log(`✅ API ping successful (${responseTime}ms)`);
        } catch (apiError) {
          console.log(
            `⚠️ API ping failed, but PM2 metrics show process is healthy`
          );
          // Don't change status - trust PM2 metrics over API
        }
      }

      console.log(
        `✅ Bot ${bot.id} status via metrics: ${computedStatus} (health: ${healthEvaluation.status}, score: ${healthEvaluation.score})`
      );
      return botStatus;
    } catch (error) {
      console.error(`❌ Failed to get PM2 metrics for ${bot.id}:`, error);
      return { ...botStatus, status: "offline" };
    }
  }

  /**
   * Helper method for external bot API checking
   */
  private async checkExternalBotAPI(
    bot: any,
    baseStatus: BotStatus
  ): Promise<BotStatus> {
    try {
      const endpoint = bot.type === "discord" ? "/health" : "/status";
      const url = `${bot.apiHost}:${bot.apiPort}${endpoint}`;

      const startTime = Date.now();
      const response = await axios.get(url, { timeout: 5000 });
      const responseTime = Date.now() - startTime;

      const isOnline =
        bot.type === "discord"
          ? response.status === 200
          : response.data.connected === true ||
            response.data.status === "online";

      let realPhoneNumber = bot.phoneNumber;
      let realPushName = bot.pushName;

      if (bot.type === "whatsapp" && response.data.client) {
        realPhoneNumber =
          response.data.client.wid?.user ||
          response.data.client.me?.user ||
          bot.phoneNumber;
        realPushName = response.data.client.pushname || bot.pushName;

        this.configService.updateBotWithRealData(
          bot.id,
          realPhoneNumber || undefined,
          realPushName || undefined
        );
      }

      return {
        ...baseStatus,
        status: isOnline ? "online" : "offline",
        lastSeen: new Date().toISOString(),
        phoneNumber: realPhoneNumber,
        pushName: realPushName,
        apiResponsive: true,
        apiResponseTime: responseTime,
      };
    } catch (error) {
      console.log(`❌ External bot ${bot.id} API check failed:`, error);
      return { ...baseStatus, status: "offline" };
    }
  }

  public async getBotStatus(id: string): Promise<BotStatus | null> {
    console.log("📊 Getting enhanced status for bot ID:", id);

    const bot = this.configService.getBotById(id);
    console.log("📋 Found bot:", JSON.stringify(bot, null, 2));

    if (!bot) {
      console.log("❌ Bot not found with ID:", id);
      return null;
    }

    // Initialize base status object
    let botStatus: BotStatus = {
      id: bot.id,
      name: bot.name,
      type: bot.type,
      status: "offline",
      phoneNumber: bot.phoneNumber,
      pushName: bot.pushName,
      apiResponsive: false,
    };

    // Check if bot is external (not managed by our PM2)
    if (bot.isExternal) {
      console.log(`🌐 Bot ${bot.id} is external - skipping PM2 status check`);

      // For external bots, only check API connectivity
      try {
        const endpoint = bot.type === "discord" ? "/health" : "/status";
        const url = `${bot.apiHost}:${bot.apiPort}${endpoint}`;
        console.log("🌐 Checking external API connectivity at:", url);

        const startTime = Date.now();
        const response = await axios.get(url, {
          timeout: 5000,
        });
        const responseTime = Date.now() - startTime;

        console.log(
          "✅ External API response received:",
          response.status,
          response.data
        );

        const isOnline =
          bot.type === "discord"
            ? response.status === 200
            : response.data.connected === true ||
              response.data.status === "online";

        // Extract real bot information for WhatsApp bots
        let realPhoneNumber = bot.phoneNumber;
        let realPushName = bot.pushName;

        if (bot.type === "whatsapp" && response.data.client) {
          realPhoneNumber =
            response.data.client.wid?.user ||
            response.data.client.me?.user ||
            bot.phoneNumber;
          realPushName = response.data.client.pushname || bot.pushName;

          // Update bot configuration with real data
          this.configService.updateBotWithRealData(
            bot.id,
            realPhoneNumber || undefined,
            realPushName || undefined
          );
        }

        botStatus = {
          ...botStatus,
          status: isOnline ? "online" : "offline",
          lastSeen: new Date().toISOString(),
          phoneNumber: realPhoneNumber,
          pushName: realPushName,
          apiResponsive: true,
          apiResponseTime: responseTime,
        };

        console.log(
          `✅ External bot ${
            bot.id
          }: API=responsive(${responseTime}ms), Status=${
            isOnline ? "online" : "offline"
          }`
        );
      } catch (error) {
        console.log(
          `❌ External bot ${bot.id}: API=unresponsive (${
            error instanceof Error ? error.message : "Unknown error"
          })`
        );
        botStatus.status = "offline";
      }
    } else {
      // For internal bots, check both PM2 and API
      const pm2ProcessId = bot.pm2ServiceId || bot.id;
      console.log(
        `🔍 Using PM2 process ID: ${pm2ProcessId} for bot: ${bot.id}`
      );

      // Get PM2 process status first
      const pm2Status = await this.getPM2ProcessStatus(pm2ProcessId);
      console.log(`📊 PM2 status for ${bot.id}:`, pm2Status);

      // Initialize status object with PM2 data
      botStatus = {
        ...botStatus,
        status: pm2Status.status,
        pm2: {
          pid: pm2Status.pid,
          cpu: pm2Status.cpu,
          memory: pm2Status.memory,
          restarts: pm2Status.restarts,
          uptime: pm2Status.uptime,
          lastRestart: pm2Status.lastRestart,
        },
      };

      // If PM2 says the process is online, try to check API connectivity
      if (pm2Status.status === "online") {
        try {
          const endpoint = bot.type === "discord" ? "/health" : "/status";
          const url = `${bot.apiHost}:${bot.apiPort}${endpoint}`;
          console.log("🌐 Checking API connectivity at:", url);

          const startTime = Date.now();
          const response = await axios.get(url, {
            timeout: 3000, // Reduced timeout to 3 seconds
          });
          const responseTime = Date.now() - startTime;

          console.log(
            "✅ API response received:",
            response.status,
            "Data keys:",
            Object.keys(response.data || {})
          );

          const isOnline =
            bot.type === "discord"
              ? response.status === 200
              : response.data.connected === true ||
                response.data.status === "online";

          // Extract real bot information for WhatsApp bots
          let realPhoneNumber = bot.phoneNumber;
          let realPushName = bot.pushName;

          if (bot.type === "whatsapp" && response.data.client) {
            realPhoneNumber =
              response.data.client.wid?.user ||
              response.data.client.me?.user ||
              bot.phoneNumber;
            realPushName = response.data.client.pushname || bot.pushName;

            // Update bot configuration with real data
            this.configService.updateBotWithRealData(
              bot.id,
              realPhoneNumber || undefined,
              realPushName || undefined
            );
          }

          botStatus = {
            ...botStatus,
            status: isOnline ? "online" : "offline",
            lastSeen: new Date().toISOString(),
            phoneNumber: realPhoneNumber,
            pushName: realPushName,
            apiResponsive: true,
            apiResponseTime: responseTime,
          };

          console.log(
            `✅ Bot ${bot.id}: PM2=${
              pm2Status.status
            }, API=responsive(${responseTime}ms), Final=${
              isOnline ? "online" : "offline"
            }`
          );
        } catch (error) {
          // PM2 says online but API is not responsive/has errors
          // Don't mark as errored immediately - give it benefit of the doubt
          // if it's just starting up or has temporary API issues
          const isStartupPhase = pm2Status.uptime && pm2Status.uptime < 30000; // Less than 30 seconds

          if (isStartupPhase) {
            botStatus = {
              ...botStatus,
              status: "launching", // Process running and likely still starting up
              apiResponsive: false,
            };
            console.log(
              `🚀 Bot ${bot.id}: PM2=${pm2Status.status}, API=starting (uptime: ${pm2Status.uptime}ms), Status=launching`
            );
          } else {
            // Process running for a while but API consistently not working
            // Use PM2-only mode - consider it "online" with limited functionality
            botStatus = {
              ...botStatus,
              status: "online", // Trust PM2 status over API errors
              apiResponsive: false,
              lastSeen: new Date().toISOString(),
              // Keep existing phone/pushName from config
              phoneNumber: bot.phoneNumber,
              pushName: bot.pushName,
            };
            console.log(
              `🛡️  Bot ${bot.id}: PM2=${pm2Status.status}, API=unresponsive (PM2-only mode), Status=online`
            );
            console.log(
              `📝 API Error: ${
                error instanceof Error ? error.message : "Unknown error"
              }`
            );
          }
        }
      } else {
        // PM2 process is not online
        console.log(
          `❌ Bot ${bot.id}: PM2=${pm2Status.status}, API=not checked`
        );
      }
    }

    return botStatus;
  }

  /**
   * Get detailed PM2 process status for a bot
   */
  private async getPM2ProcessStatus(pm2ProcessId: string): Promise<{
    status:
      | "online"
      | "offline"
      | "stopped"
      | "stopping"
      | "errored"
      | "launching"
      | "unknown";
    pid?: number;
    cpu?: number;
    memory?: number;
    restarts?: number;
    uptime?: number;
    lastRestart?: string;
  }> {
    return new Promise((resolve) => {
      let timeoutId: NodeJS.Timeout | null = null;
      let isResolved = false;

      const safeResolve = (result: any) => {
        if (!isResolved) {
          isResolved = true;
          if (timeoutId) {
            clearTimeout(timeoutId);
          }
          resolve(result);
        }
      };

      // Add timeout for PM2 operations
      timeoutId = setTimeout(() => {
        console.warn(
          `⚠️  PM2 operation timeout for ${pm2ProcessId}, falling back to unknown status`
        );
        safeResolve({ status: "unknown" });
      }, 5000);

      try {
        // Check if PM2 is available
        if (!pm2) {
          console.error(`❌ PM2 module is not available`);
          safeResolve({ status: "unknown" });
          return;
        }

        pm2.connect((err) => {
          if (isResolved) return; // Already timed out

          if (err) {
            console.error(`❌ Failed to connect to PM2 for status check:`, err);
            console.warn(
              `💡 PM2 might not be running. Install PM2 globally: npm install -g pm2`
            );
            safeResolve({ status: "unknown" });
            return;
          }

          // Verify PM2 client is properly connected
          try {
            if (!pm2 || typeof pm2.describe !== "function") {
              console.error(`❌ PM2 client is not properly initialized`);
              safeResolve({ status: "unknown" });
              return;
            }

            pm2.describe(pm2ProcessId, (describeErr, processDescription) => {
              if (isResolved) return; // Already timed out

              // Always try to disconnect, but handle errors gracefully
              setTimeout(() => {
                try {
                  if (pm2 && typeof pm2.disconnect === "function") {
                    pm2.disconnect();
                  }
                } catch (disconnectErr) {
                  console.warn(
                    `⚠️  Error disconnecting from PM2:`,
                    disconnectErr
                  );
                }
              }, 100);

              if (describeErr) {
                console.error(
                  `❌ PM2 describe failed for ${pm2ProcessId}:`,
                  describeErr
                );
                safeResolve({ status: "unknown" });
                return;
              }

              if (!processDescription || processDescription.length === 0) {
                safeResolve({ status: "offline" });
                return;
              }

              const proc = processDescription[0] as any;
              const pm2Env = proc?.pm2_env;
              const monit = proc?.monit;

              // Map PM2 status to our status types
              let status:
                | "online"
                | "offline"
                | "stopped"
                | "stopping"
                | "errored"
                | "launching"
                | "unknown" = "unknown";

              switch (pm2Env?.status) {
                case "online":
                  status = "online";
                  break;
                case "stopped":
                  status = "stopped";
                  break;
                case "stopping":
                  status = "stopping";
                  break;
                case "errored":
                  status = "errored";
                  break;
                case "launching":
                  status = "launching";
                  break;
                default:
                  status = "offline";
              }

              const result = {
                status,
                pid: proc?.pid || undefined,
                cpu: monit?.cpu || undefined,
                memory: monit?.memory
                  ? Math.round(monit.memory / 1024 / 1024)
                  : undefined, // Convert to MB
                restarts: pm2Env?.restart_time || undefined,
                uptime: pm2Env?.pm_uptime
                  ? Date.now() - pm2Env.pm_uptime
                  : undefined,
                lastRestart:
                  pm2Env?.restart_time > 0
                    ? new Date().toISOString()
                    : undefined,
              };

              console.log(`📊 PM2 status for ${pm2ProcessId}:`, result);
              safeResolve(result);
            });
          } catch (innerError) {
            console.error(
              `❌ Error in PM2 describe operation for ${pm2ProcessId}:`,
              innerError
            );
            safeResolve({ status: "unknown" });
          }
        });
      } catch (pm2Error) {
        console.error(`❌ PM2 connection error for ${pm2ProcessId}:`, pm2Error);
        console.warn(
          `💡 PM2 might not be running. Install PM2 globally: npm install -g pm2`
        );
        safeResolve({ status: "unknown" });
      }
    });
  }

  /**
   * 🚀 NEW: Get Discord bot status via PM2 metrics (primary source)
   */
  public async getDiscordBotStatusViaMetrics(): Promise<BotStatus[]> {
    const discordBots = this.configService.getBotsByType("discord");
    const statuses: BotStatus[] = [];

    for (const bot of discordBots) {
      // Skip external bots for PM2 metrics
      if (bot.isExternal) {
        console.log(`🌐 Bot ${bot.id} is external - skipping PM2 metrics`);
        continue;
      }

      const status = await this.getBotStatusViaMetrics(bot.id);
      if (status) {
        statuses.push(status);
      }
    }

    return statuses;
  }

  /**
   * 🚀 NEW: Get WhatsApp bot status via PM2 metrics (primary source)
   */
  public async getWhatsAppBotStatusViaMetrics(): Promise<BotStatus[]> {
    const whatsappBots = this.configService.getBotsByType("whatsapp");
    const statuses: BotStatus[] = [];

    for (const bot of whatsappBots) {
      // Skip external bots for PM2 metrics
      if (bot.isExternal) {
        console.log(`🌐 Bot ${bot.id} is external - skipping PM2 metrics`);
        continue;
      }

      const status = await this.getBotStatusViaMetrics(bot.id);
      if (status) {
        statuses.push(status);
      }
    }

    return statuses;
  }
}
