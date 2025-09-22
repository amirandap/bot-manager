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
      console.log("BotService: Getting all bots with PM2 metrics as source of truth...");

      const bots = this.configService.getAllBots();
      console.log("BotService: Retrieved", bots.length, "bots from config");

      // Enrich each bot with PM2 metrics as the primary source of truth
      const botsWithMetrics = await Promise.all(
        bots.map(async (bot) => {
          if (bot.isExternal) {
            // External bots don't have PM2 metrics
            return {
              ...bot,
              status: "stopped" as const,
              pm2: null,
            };
          }

          // Get PM2 metrics for internal bots
          const pm2ProcessId = bot.pm2ServiceId || bot.id;
          console.log(`🔍 Getting PM2 metrics for bot ${bot.id} (process: ${pm2ProcessId})`);

          try {
            const metrics = await pm2MetricsService.getProcessMetrics(pm2ProcessId);
            
            if (!metrics) {
              console.log(`❌ No PM2 metrics found for ${pm2ProcessId}`);
              return {
                ...bot,
                status: "stopped" as const,
                pm2: null,
              };
            }

            // Evaluate health based on metrics
            const healthEvaluation = pm2MetricsService.evaluateProcessHealth(metrics);

            // Map PM2 status to bot status (PM2 is the source of truth)
            let status: "spawning" | "online" | "error" | "stopped" | "unknown";
            switch (metrics.status) {
              case "online":
                status = healthEvaluation.status === "critical" ? "error" : "online";
                break;
              case "stopped":
                status = "stopped";
                break;
              case "errored":
                status = "error";
                break;
              case "launching":
                status = "spawning";
                break;
              default:
                status = "unknown";
            }

            console.log(`📊 Bot ${bot.id} status from PM2: ${metrics.status} -> ${status}`);

            return {
              ...bot,
              status,
              pm2: metrics,
              health: healthEvaluation,
            };

          } catch (error) {
            console.error(`❌ Error getting PM2 metrics for bot ${bot.id}:`, error);
            return {
              ...bot,
              status: "stopped" as const,
              pm2: null,
            };
          }
        })
      );

      console.log("BotService: Enriched all bots with PM2 metrics");
      return botsWithMetrics;
    } catch (error) {
      console.error("BotService: Error in getAllBots:", error);
      throw error;
    }
  }

  public async getBotsByType(type: "whatsapp" | "discord"): Promise<Bot[]> {
    return this.configService.getBotsByType(type);
  }

  /**
   * 🚀 PM2-ONLY: Get bot status using PM2 metrics exclusively
   */
  public async getBotStatusViaMetrics(id: string): Promise<BotStatus | null> {
    console.log("📊 Getting bot status via PM2 metrics for ID:", id);

    const bot = this.configService.getBotById(id);
    if (!bot) {
      console.log("❌ Bot not found with ID:", id);
      return null;
    }

    // Initialize base status object - only essential fields
    let botStatus: BotStatus = {
      id: bot.id,
      name: bot.name,
      type: bot.type,
    };

    // Skip external bots - only support PM2-managed bots
    if (bot.isExternal) {
      console.log(
        `⚠️ Bot ${bot.id} is external - not supported in PM2-only mode`
      );
      return { ...botStatus, status: "offline" };
    }

    // For internal bots, use PM2 metrics exclusively
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

      // Extract client info from custom metrics if available
      let clientPhone = bot.phoneNumber;
      let clientPushName = bot.pushName;

      if (metrics.customMetrics) {
        // Try to get dynamic phone and pushname from metrics
        clientPhone = metrics.customMetrics.clientPhone || bot.phoneNumber;
        clientPushName = metrics.customMetrics.clientPushname || bot.pushName;
      }

      // Build comprehensive status object using only PM2 data
      // Frontend will use pm2.status, pm2.botStatus, pm2.whatsappStatus, pm2.qrCodeStatus, pm2.apiServerStatus for logical decisions
      botStatus = {
        id: bot.id,
        name: bot.name,
        type: bot.type,
        phoneNumber: clientPhone,
        // Pass all PM2 metrics dynamically - let frontend decide what to use
        pm2: {
          ...metrics, // All metrics from PM2 including custom ones
        },
        health: {
          status: healthEvaluation.status,
          score: healthEvaluation.score,
          issues: healthEvaluation.issues,
        },
      };

      console.log(
        `✅ Bot ${bot.id} status via PM2 metrics only (health: ${healthEvaluation.status}, score: ${healthEvaluation.score})`
      );
      return botStatus;
    } catch (error) {
      console.error(`❌ Failed to get PM2 metrics for ${bot.id}:`, error);
      return { 
        id: bot.id,
        name: bot.name,
        type: bot.type,
      };
    }
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

  /**
   * 🚀 NEW: Get all bots status via PM2 metrics (primary source)
   */
  public async getAllBotsStatusViaMetrics(): Promise<BotStatus[]> {
    const allBots = this.configService.getAllBots();
    const statuses: BotStatus[] = [];

    for (const bot of allBots) {
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
