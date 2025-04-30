import { Request, Response } from 'express';
import { WhatsappService } from "../services/whatsappService";
import FormData from 'form-data';
import axios from 'axios';

export class BotsController {
    private whatsappService: WhatsappService;

    constructor() {
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
            const whatsappBots = await this.whatsappService.fetchBots();
            const bot = whatsappBots[id as unknown as number];
            if (bot) {
                res.json(bot);
            } else {
                res.status(404).json({ message: 'Bot not found' });
            }
        } catch (error) {
            res.status(500).json({ message: 'Error fetching bot', error });
        }
    }

    public async sendToBot(botId: string, requestBody: any, file?: Express.Multer.File) {
        try {
            const whatsappBots = await this.whatsappService.fetchBots();
            const bot = whatsappBots[botId as unknown as number];
            if (bot) {
                const { QrCode } = bot;
                const baseUrl = QrCode.split('/q')[0];
                const url = `${baseUrl}/send-message`;
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
                });

                return response.data;
                
            } else {
                throw new Error('Bot not found');
            }
        } catch (error) {
            console.error('Error sending to bot:', error);
            throw error;
        }
    }
}