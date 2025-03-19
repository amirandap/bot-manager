import { Router } from 'express';
import { StatusController } from '../controllers/statusController';

const router = Router();
const statusController = new StatusController();

export function setStatusRoutes(app: Router) {
    app.get('/api/status/discord', statusController.getDiscordStatus.bind(statusController));
    app.get('/api/status/whatsapp', statusController.getWhatsappStatus.bind(statusController));
}