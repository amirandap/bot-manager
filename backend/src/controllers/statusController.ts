import { Request, Response } from "express";
import { DiscordService } from "../services/discordService";
import { WhatsappService } from "../services/whatsappService";

export class StatusController {
  private discordService: DiscordService;
  private whatsappService: WhatsappService;

  constructor() {
    this.discordService = new DiscordService();
    this.whatsappService = new WhatsappService();
  }
  async getDiscordStatus(req: Request, res: Response) {
    // Logic to fetch Discord bot status
    const discordService = new DiscordService();
    const { id } = req.params;
    const status = await discordService.fetchStatus(id);
    res.json(status);
  }

  async getWhatsappStatus(req: Request, res: Response) {
    // Logic to fetch WhatsApp bot status
    const whatsappService = new WhatsappService();
    const { id } = req.params;
    const status = await whatsappService.fetchStatus(id);
    res.json(status);
  }
}
