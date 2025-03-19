import { Router } from 'express';
import { BotsController } from '../controllers/botsController';

const router = Router();
const botsController = new BotsController();

export function setBotsRoutes(app: Router) {
    app.get('/api/bots', botsController.getAllBots.bind(botsController));
    app.get('/api/bots/:id', botsController.getBotById.bind(botsController));
}