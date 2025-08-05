import express, { Response } from 'express';
import { getFallbackNumber } from '../utils/fallbackUtils';
import { client } from '../config/whatsAppClient';
import { botLifecycle } from '../utils/botLifecycleTracker';
import fs from 'fs';
import path from 'path';
import { BOT_ID } from '..';

const router = express.Router();

export const serverStartTime = Date.now();

// Get the base URL from environment or use a default
const apiHost = process.env.API_HOST || 'http://localhost:3001';
const baseUrl = process.env.BASE_URL || 'http://localhost:7260';

// QR code storage location
const QR_CODE_DIR = path.join(process.cwd(), '../data/qr-codes');
const QR_CODE_PATH = path.join(QR_CODE_DIR, `${BOT_ID}.json`);

// Get QR code information
function getQRCodeInfo() {
  try {
    if (fs.existsSync(QR_CODE_PATH)) {
      const data = fs.readFileSync(QR_CODE_PATH, 'utf-8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('Error reading QR code:', error);
  }
  return null;
}

router.get('/', (req, res: Response) => {
  const uptime = Date.now() - serverStartTime;
  const clientData = client?.info || null;
  const lifecycleDetails = botLifecycle.getStateDetails();
  const qrCodeInfo = getQRCodeInfo();
  
  // Determine client connection status
  let isConnected = false;
  let phoneNumber = null;
  let pushName = null;
  
  if (client?.info) {
    isConnected = true;
    phoneNumber = client.info.wid?.user || null;
    pushName = client.info.pushname || null;
  }
  
  // Update PM2 metrics on status request
  botLifecycle.updateMetrics();
  
  res.send({
    botId: BOT_ID,
    status: lifecycleDetails.currentState,
    statusDescription: botLifecycle.getStateDescription(),
    lifecycle: lifecycleDetails,
    connected: isConnected,
    healthy: botLifecycle.isHealthy(),
    rootFolder: __dirname,
    port: process.env.PORT || 7260,
    uptime: `${Math.floor(uptime / 1000)} seconds`,
    uptimeMs: uptime,
    fallbackNumber: getFallbackNumber(),
    qrCodeEndpoint: baseUrl + '/qr-code',
    qrCodeAvailable: qrCodeInfo !== null,
    qrCodeTimestamp: qrCodeInfo ? qrCodeInfo.timestamp : null,
    client: clientData,
    phoneNumber,
    pushName,
    memoryUsage: process.memoryUsage(),
    resourceUsage: process.resourceUsage()
  });
});

// Simple health check endpoint for monitoring
router.get('/health', (req, res: Response) => {
  const isHealthy = botLifecycle.isHealthy();
  const currentState = botLifecycle.getState();
  
  // Update PM2 metrics on health check
  botLifecycle.updateMetrics();
  
  if (isHealthy) {
    res.status(200).send({
      status: 'healthy',
      botId: BOT_ID,
      state: currentState,
      connected: true,
      timestamp: new Date().toISOString()
    });
  } else {
    // Return 503 Service Unavailable if the bot is not healthy
    res.status(503).send({
      status: 'unhealthy',
      botId: BOT_ID,
      state: currentState,
      connected: false,
      stateDescription: botLifecycle.getStateDescription(),
      timestamp: new Date().toISOString()
    });
  }
});

export default router;