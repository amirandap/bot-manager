import { Request, Response } from "express";
import { BotService } from "../services/botService";

export class StatusController {
  private botService: BotService;

  constructor() {
    this.botService = new BotService();
  }

  /**
   * 🚀 UPDATED: Get Discord bot status via PM2 metrics (primary) with API fallback
   */
  public getDiscordStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      // Try PM2 metrics first for managed bots
      const allBots = await this.botService.getDiscordBotStatusViaMetrics();
      
      if (allBots.length > 0) {
        res.json(allBots);
        return;
      }
      
      // Fallback to legacy API-based method if no PM2-managed Discord bots
      console.log("⚠️ No PM2-managed Discord bots found, using legacy API method");
      const status = await this.botService.getDiscordBotStatus();
      res.json(status);
    } catch (error) {
      console.error("❌ Error getting Discord status:", error);
      res.status(500).json({ error: 'Failed to retrieve Discord bot status' });
    }
  };

  /**
   * 🚀 UPDATED: Get WhatsApp bot status via PM2 metrics (primary) with API fallback
   */
  public getWhatsappStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      // Try PM2 metrics first for managed bots  
      const allBots = await this.botService.getWhatsAppBotStatusViaMetrics();
      
      if (allBots.length > 0) {
        res.json(allBots);
        return;
      }
      
      // Fallback to legacy API-based method if no PM2-managed WhatsApp bots
      console.log("⚠️ No PM2-managed WhatsApp bots found, using legacy API method");
      const status = await this.botService.getWhatsAppBotStatus();
      res.json(status);
    } catch (error) {
      console.error("❌ Error getting WhatsApp status:", error);
      res.status(500).json({ error: 'Failed to retrieve WhatsApp bot status' });
    }
  };

  /**
   * 🚀 UPDATED: Get individual bot status via PM2 metrics (primary) with API fallback
   */
  public getBotStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      
      // Try PM2 metrics first
      const statusViaPM2 = await this.botService.getBotStatusViaMetrics(id);
      
      if (statusViaPM2) {
        res.json(statusViaPM2);
        return;
      }
      
      // Fallback to legacy API-based method
      console.log(`⚠️ PM2 metrics unavailable for bot ${id}, using legacy API method`);
      const status = await this.botService.getBotStatus(id);
      
      if (!status) {
        res.status(404).json({ error: 'Bot not found' });
        return;
      }
      
      res.json(status);
    } catch (error) {
      console.error("❌ Error getting bot status:", error);
      res.status(500).json({ error: 'Failed to retrieve bot status' });
    }
  };
}
