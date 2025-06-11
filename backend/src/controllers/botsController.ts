import { Request, Response } from 'express';
import { BotService } from '../services/botService';
import { ConfigService } from '../services/configService';
import { WhatsappService } from "../services/whatsappService";
import { BotSpawnerService } from '../services/botSpawnerService'; // ← Added import
import FormData from 'form-data';
import axios from 'axios';

export class BotsController {
    private botService: BotService;
    private configService: ConfigService;
    private whatsappService: WhatsappService;
    private botSpawnerService: BotSpawnerService; // ← Added service

    constructor() {
        this.botService = new BotService();
        this.configService = ConfigService.getInstance();
        this.whatsappService = new WhatsappService();
        this.botSpawnerService = new BotSpawnerService(); // ← Initialize service
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

    public async spawnBot(req: Request, res: Response): Promise<void> {
        try {
            const { botId } = req.params;
            const bot = this.configService.getBotById(botId);

            if (!bot) {
                res.status(404).json({ error: 'Bot not found' });
                return;
            }

            // Start the bot using the BotSpawnerService
            const success = await this.botSpawnerService.startBot(botId);

            if (success) {
                res.status(200).json({ message: 'Bot started successfully', botId });
            } else {
                res.status(500).json({ error: 'Failed to start bot', botId });
            }
        } catch (error) {
            console.error('Error starting bot:', error);
            res.status(500).json({ error: 'Failed to start bot' });
        }
    }

    public async killBot(req: Request, res: Response): Promise<void> {
        try {
            const { botId } = req.params;
            const bot = this.configService.getBotById(botId);

            if (!bot) {
                res.status(404).json({ error: 'Bot not found' });
                return;
            }

            // Stop the bot process using the BotSpawnerService
            const success = await this.botSpawnerService.stopBot(botId);

            if (success) {
                res.status(200).json({ message: 'Bot stopped successfully', botId });
            } else {
                res.status(500).json({ error: 'Failed to stop bot', botId });
            }
        } catch (error) {
            console.error('Error stopping bot:', error);
            res.status(500).json({ error: 'Failed to stop bot' });
        }
    }

    // New method for creating completely new bots
    public async spawnWhatsAppBot(req: Request, res: Response): Promise<void> {
        try {
            const botConfig = req.body;
            
            // Validate required fields
            if (!botConfig.name || !botConfig.apiPort) {
                res.status(400).json({ 
                    error: 'Missing required fields', 
                    required: ['name', 'apiPort'] 
                });
                return;
            }

            const newBot = await this.botSpawnerService.createNewWhatsAppBot(botConfig);
            
            res.status(201).json({
                success: true,
                bot: newBot,
                message: 'WhatsApp bot created and started successfully'
            });
        } catch (error) {
            console.error('Error spawning WhatsApp bot:', error);
            res.status(500).json({
                error: 'Failed to spawn WhatsApp bot',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    public async terminateBot(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const success = await this.botSpawnerService.deleteBot(id);
            
            if (success) {
                res.json({ 
                    success: true, 
                    message: 'Bot terminated and removed successfully',
                    botId: id 
                });
            } else {
                res.status(500).json({ 
                    error: 'Failed to terminate bot',
                    botId: id 
                });
            }
        } catch (error) {
            console.error('Error terminating bot:', error);
            res.status(500).json({ 
                error: 'Failed to terminate bot',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    public async restartBot(req: Request, res: Response): Promise<void> {
        try {
            const { id } = req.params;
            const success = await this.botSpawnerService.restartBot(id);
            
            if (success) {
                res.json({ 
                    success: true, 
                    message: 'Bot restarted successfully',
                    botId: id 
                });
            } else {
                res.status(500).json({ 
                    error: 'Failed to restart bot',
                    botId: id 
                });
            }
        } catch (error) {
            console.error('Error restarting bot:', error);
            res.status(500).json({ 
                error: 'Failed to restart bot',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }

    public async getBotSync(req: Request, res: Response): Promise<void> {
        try {
            const syncStatus = await this.botSpawnerService.syncBotsWithPM2();
            res.json({
                success: true,
                sync: syncStatus,
                message: 'Bot synchronization status retrieved'
            });
        } catch (error) {
            console.error('Error getting bot sync status:', error);
            res.status(500).json({
                error: 'Failed to get sync status',
                details: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }
}