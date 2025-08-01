import express, { Response } from "express";
import { getFallbackNumber } from "../utils/fallbackUtils";
import {
  client,
  isClientReady,
  getMessageCounters,
} from "../config/whatsAppClient";
import { botLifecycle } from "../utils/botLifecycleTracker";
import { serverStartTime } from "..";

const router = express.Router();

const baseUrl = process.env.BASE_URL || "http://localhost:2343";

router.get("/", (req, res: Response) => {
  const uptime = Date.now() - serverStartTime;
  const clientData = client?.info || null;

  // Determine client connection status
  let phoneNumber = null;
  let pushName = null;

  if (client?.info) {
    phoneNumber = client.info.wid?.user || null;
    pushName = client.info.pushname || null;
  }

  // Get PM2 metrics for status
  const pm2MetricsData = (global as any).NodeJS?._METRICS || {
    whatsapp_status: "unknown",
    is_connected: false,
    qr_ready: false,
    messages_sent: 0,
    messages_received: 0,
    uptime_ms: uptime,
  };

  res.send({
    // Use PM2 metrics as source of truth
    status: pm2MetricsData.whatsapp_status,
    connected: pm2MetricsData.is_connected,
    qrReady: pm2MetricsData.qr_ready,

    // Client details still needed for authentication info
    rootFolder: __dirname,
    port: process.env.PORT || 7260,
    uptime: `${Math.floor(uptime / 1000)} seconds`,
    uptimeMs: uptime,
    fallbackNumber: getFallbackNumber(),
    QrCode: baseUrl + "/qr-code",
    client: clientData,
    phoneNumber,
    pushName,

    // Message stats from PM2 metrics
    messages: {
      sent: pm2MetricsData.messages_sent,
      received: pm2MetricsData.messages_received,
    },

    // Include lifecycle info for backward compatibility
    lifecycleDetails: botLifecycle.getStateDetails(),

    // For clients that need to know if bot is ready
    ready: isClientReady(),
  });
});

export default router;
