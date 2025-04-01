import { Request, Response } from 'express';
import { DiscordService } from "../services/discordService";
import { WhatsappService } from "../services/whatsappService";

export class BotsController {
    private discordService: DiscordService;
    private whatsappService: WhatsappService;

    constructor() {
        this.discordService = new DiscordService();
        this.whatsappService = new WhatsappService();
    }

    public async getAllBots(req: Request, res: Response): Promise<void> {
        try {
            const whatsappBots = await this.whatsappService.fetchBots();
            res.json(whatsappBots);
        } catch (error) {
            res.status(500).json({ message: 'Error fetching bots', error });
        }
    }

    public async getBotById(req: Request, res: Response): Promise<void> {
        const { id } = req.params;
        try {
            const discordBot = await this.discordService.fetchBotById(id);
            const whatsappBot = await this.whatsappService.fetchBotById(id);
            const bot = discordBot || whatsappBot;
            if (bot) {
                res.json(bot);
            } else {
                res.status(404).json({ message: 'Bot not found' });
            }
        } catch (error) {
            res.status(500).json({ message: 'Error fetching bot', error });
        }
    }
}