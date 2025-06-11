import { Request, Response } from 'express';
import { BotService } from '../services/botService';
import { ConfigService } from '../services/configService';
import { WhatsappService } from "../services/whatsappService";
import FormData from 'form-data';
import axios from 'axios';

export class BotsController {
    private botService: BotService;
    private configService: ConfigService;
    private whatsappService: WhatsappService;

    constructor() {
        this.botService = new BotService();
        this.configService = ConfigService.getInstance();
        this.whatsappService = new WhatsappService();
    }

    public async getAllBots(req: Request, res: Response): Promise<void> {
        try {
            console.log('BotsController: Getting all bots...');
            const bots = await this.botService.getAllBots();
            console.log('BotsController: Found', bots.length, 'bots');
            res.json(bots);
        } catch (error) {
            console.error('BotsController: Error getting bots:', error);
            res.status(500).json({ error: 'Failed to retrieve bots', details: error instanceof Error ? error.message : 'Unknown error' });
        }
    }

    public async getBotById(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const bot = this.configService.getBotById(id);
            
            if (!bot) {
                res.status(404).json({ error: 'Bot not found' });
                return;
            }
            
            res.json(bot);
        } catch (error) {
            res.status(500).json({ error: 'Failed to retrieve bot' });
        }
    }

    public async createBot(req: Request, res: Response): Promise<void> {
        try {
            const botData = req.body;
            const newBot = this.configService.addBot(botData);
            res.status(201).json(newBot);
        } catch (error) {
            res.status(500).json({ error: 'Failed to create bot' });
        }
    }

    public async updateBot(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const updates = req.body;
            const updatedBot = this.configService.updateBot(id, updates);
            
            if (!updatedBot) {
                res.status(404).json({ error: 'Bot not found' });
                return;
            }
            
            res.json(updatedBot);
        } catch (error) {
            res.status(500).json({ error: 'Failed to update bot' });
        }
    }

    public async deleteBot(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const deleted = this.configService.deleteBot(id);
            
            if (!deleted) {
                res.status(404).json({ error: 'Bot not found' });
                return;
            }
            
            res.status(204).send();
        } catch (error) {
            res.status(500).json({ error: 'Failed to delete bot' });
        }
    }

    public async sendToBot(botId: string, requestBody: any, file?: Express.Multer.File) {
        try {
            const bot = this.configService.getBotById(botId);
            if (!bot) {
                throw new Error('Bot not found');
            }

            const url = `${bot.apiHost}:${bot.apiPort}/send-message`;
            console.log('Sending to bot:', url, requestBody);

            const formData = new FormData();

            for (const key in requestBody) {
                if (Array.isArray(requestBody[key])) {
                    requestBody[key].forEach((value: string) => formData.append(`${key}[]`, value));
                } else {
                    formData.append(key, requestBody[key]);
                }
            }

            if (file) {
                formData.append('file', file.buffer, file.originalname);
            }

            const response = await axios.post(url, formData, {
                headers: formData.getHeaders(),
            });            return response.data;
                
        } catch (error) {
            console.error('Error sending to bot:', error);
            throw error;
        }
    }
}