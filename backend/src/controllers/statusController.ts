import { Request, Response } from "express";
import { BotService } from "../services/botService";

export class StatusController {
  private botService: BotService;

  constructor() {
    this.botService = new BotService();
  }

  public getDiscordStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const status = await this.botService.getDiscordBotStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve Discord bot status' });
    }
  };

  public getWhatsappStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const status = await this.botService.getWhatsAppBotStatus();
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve WhatsApp bot status' });
    }
  };

  public getBotStatus = async (req: Request, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const status = await this.botService.getBotStatus(id);
      
      if (!status) {
        res.status(404).json({ error: 'Bot not found' });
        return;
      }
      
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: 'Failed to retrieve bot status' });
    }
  };
}
