import { Request, Response } from "express";
import { BotService } from "../services/botService";

export class StatusController {
  private botService: BotService;

  constructor() {
    this.botService = new BotService();
  }

  /**
   * 🚀 PM2-ONLY: Get all bots status via PM2 metrics exclusively
   */
  public getAllBotsStatus = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const allBots = await this.botService.getAllBotsStatusViaMetrics();
      res.json(allBots);
    } catch (error) {
      console.error("❌ Error getting all bots status:", error);
      res.status(500).json({ error: "Failed to retrieve all bots status" });
    }
  };

  /**
   * 🚀 PM2-ONLY: Get Discord bot status via PM2 metrics exclusively
   */
  public getDiscordStatus = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const allBots = await this.botService.getDiscordBotStatusViaMetrics();
      res.json(allBots);
    } catch (error) {
      console.error("❌ Error getting Discord status:", error);
      res.status(500).json({ error: "Failed to retrieve Discord bot status" });
    }
  };

  /**
   * 🚀 PM2-ONLY: Get WhatsApp bot status via PM2 metrics exclusively
   */
  public getWhatsappStatus = async (
    req: Request,
    res: Response
  ): Promise<void> => {
    try {
      const allBots = await this.botService.getWhatsAppBotStatusViaMetrics();
      res.json(allBots);
    } catch (error) {
      console.error("❌ Error getting WhatsApp status:", error);
      res.status(500).json({ error: "Failed to retrieve WhatsApp bot status" });
    }
  };

  /**
   * 🚀 PM2-ONLY: Get individual bot status via PM2 metrics exclusively
   */
  public getBotStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;

      const statusViaPM2 = await this.botService.getBotStatusViaMetrics(id);

      if (!statusViaPM2) {
        res.status(404).json({ error: "Bot not found or not managed by PM2" });
        return;
      }

      res.json(statusViaPM2);
    } catch (error) {
      console.error("❌ Error getting bot status:", error);
      res.status(500).json({ error: "Failed to retrieve bot status" });
    }
  };
}
