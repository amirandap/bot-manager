import { Router } from "express";
import { StatusController } from "../controllers/statusController";
import { BotStatusController } from "../controllers/botProxy/BotStatusController";

const router = Router();
const statusController = new StatusController();
const botStatusController = new BotStatusController();

export function setStatusRoutes(app: Router) {
  // 🚨 LEGACY STATUS ROUTES (DEPRECATED - Use PM2 metrics instead)
  // These routes use API-based status checking and should be migrated to PM2 metrics
  // ⚠️ Will be removed in future versions - use /api/bots/:botId/status/metrics instead
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

  // 🚀 RECOMMENDED: PM2 Metrics-based status routes (primary source)
  // These routes use PM2 process metrics for more reliable bot status
  app.get(
    "/api/bots/:botId/status/metrics",
    botStatusController.getBotStatusViaMetrics.bind(botStatusController)
  );
  app.get(
    "/api/bots/:botId/metrics",
    botStatusController.getBotPM2Metrics.bind(botStatusController)
  );
  app.get(
    "/api/bots/:botId/health",
    botStatusController.getBotHealth.bind(botStatusController)
  );
  app.get(
    "/api/bots/metrics/all",
    botStatusController.getAllPM2Metrics.bind(botStatusController)
  );
}
