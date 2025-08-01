import { Request, Response, NextFunction } from "express";
import { isClientReady, client } from "../config/whatsAppClient";
import { botLifecycle } from "../utils/botLifecycleTracker";

/**
 * Middleware that checks if the WhatsApp client is ready before proceeding
 * with the request. If the client is not ready, it returns a 503 Service
 * Unavailable response.
 */
export function requireWhatsAppClient(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  if (!client || !isClientReady()) {
    const lifecycleDetails = botLifecycle.getStateDetails();

    // Return detailed status information for better debugging
    res.status(503).json({
      success: false,
      error: "WhatsApp client is not ready",
      state: lifecycleDetails.currentState,
      lastStateChange: lifecycleDetails.lastStateChange,
      message:
        "The WhatsApp client is not initialized or not ready to process " +
        "requests",
      timestamp: new Date().toISOString(),
    });
    return;
  }

  next();
}

export default requireWhatsAppClient;
