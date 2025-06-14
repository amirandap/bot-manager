import { Router } from "express";
import { DeployController } from "../controllers/deployController";

const router = Router();
const deployController = new DeployController();

export function setDeployRoutes(app: Router) {
  // Webhook endpoint for Git providers (GitHub, GitLab, etc.)
  app.post(
    "/api/deploy/webhook",
    deployController.handleWebhook.bind(deployController)
  );

  // Manual deployment trigger
  app.post(
    "/api/deploy/trigger",
    deployController.triggerManualDeploy.bind(deployController)
  );

  // Deployment status and monitoring
  app.get(
    "/api/deploy/status",
    deployController.getDeploymentStatus.bind(deployController)
  );

  // Deployment history
  app.get(
    "/api/deploy/history",
    deployController.getDeploymentHistoryEndpoint.bind(deployController)
  );

  // System health check
  app.get("/api/deploy/health", (req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
    });
  });
}
