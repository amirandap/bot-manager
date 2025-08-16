import { Router } from "express";
import { StatusController } from "../controllers/statusController";

const router = Router();
const statusController = new StatusController();

export function setStatusRoutes(app: Router) {
  // 🚀 PM2-ONLY: Status routes using PM2 metrics exclusively
  // No HTTP calls to bot endpoints for status checking
  
  // Get all bots status
  app.get(
    "/api/status",
    statusController.getAllBotsStatus.bind(statusController)
  );
  
  app.get(
    "/api/status/discord",
    statusController.getDiscordStatus.bind(statusController)
  );
  app.get(
    "/api/status/whatsapp",
    statusController.getWhatsappStatus.bind(statusController)
  );
  app.get(
    "/api/status/:id",
    statusController.getBotStatus.bind(statusController)
  );
}
