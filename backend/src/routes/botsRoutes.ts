import { Router } from 'express';
import multer from 'multer';
import { BotsController } from '../controllers/botsController';

const router = Router();
const botsController = new BotsController();

// Configure multer for handling multipart/form-data
const upload = multer(); // No storage configuration needed for in-memory parsing

export function setBotsRoutes(app: Router) {
    // Get all bots
    app.get('/api/bots', botsController.getAllBots.bind(botsController));
    
    // Get bot by ID
    app.get('/api/bots/:id', botsController.getBotById.bind(botsController));
    
    // Create a new bot configuration
    app.post('/api/bots', botsController.createBot.bind(botsController));
    
    // Update a bot
    app.put('/api/bots/:id', botsController.updateBot.bind(botsController));
    
    // Delete a bot
    app.delete('/api/bots/:id', botsController.deleteBot.bind(botsController));

    // Send message to bot
    app.post('/api/bots/:id/send', upload.single('file'), async (req, res) => {
        try {
            const botId = req.params.id;
            const requestBody = req.body;

            // Forward the request body to the bot's logic
            const result = await botsController.sendToBot(botId, requestBody, req.file);

            return res.status(200).send({ success: true, result });
        } catch (error) {
            console.error('Error processing the request:', error);
            return res.status(500).send({ error: 'Internal server error' });
        }
    });

    // ===== NEW BOT SPAWNING ROUTES =====
    
    // Create and start a new WhatsApp bot (creates config + starts PM2 process)
    app.post('/api/bots/spawn/whatsapp', botsController.spawnWhatsAppBot.bind(botsController));
    
    // Terminate bot completely (stops PM2 + removes config + deletes data)
    app.delete('/api/bots/:id/terminate', botsController.terminateBot.bind(botsController));
    
    // Start existing bot (PM2 start)
    app.post('/api/bots/:id/start', botsController.spawnBot.bind(botsController));
    
    // Stop existing bot (PM2 stop)
    app.post('/api/bots/:id/stop', botsController.killBot.bind(botsController));
    
    // Restart existing bot (PM2 restart)
    app.post('/api/bots/:id/restart', botsController.restartBot.bind(botsController));
    
    // Get bot synchronization status (config vs PM2)
    app.get('/api/bots/sync/status', botsController.getBotSync.bind(botsController));
}