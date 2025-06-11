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
    
    // Create a new bot
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
}