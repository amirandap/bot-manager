import express, { Response } from 'express';
import { getFallbackNumber } from '../utils/fallbackUtils';
import { client } from '../config/whatsAppClient';
import { botLifecycle } from '../utils/botLifecycleTracker';

const router = express.Router();

export const serverStartTime = Date.now();

const baseUrl = process.env.BASE_URL || 'http://localhost:2343';

router.get('/', (req, res: Response) => {
  const uptime = Date.now() - serverStartTime;
  const clientData = client?.info || null;
  const lifecycleDetails = botLifecycle.getStateDetails();
  
  // Determine client connection status
  let isConnected = false;
  let phoneNumber = null;
  let pushName = null;
  
  if (client?.info) {
    isConnected = true;
    phoneNumber = client.info.wid?.user || null;
    pushName = client.info.pushname || null;
  }
  
  res.send({
    status: lifecycleDetails.currentState,
    lifecycle: lifecycleDetails,
    connected: isConnected,
    rootFolder: __dirname,
    port: process.env.PORT || 7260,
    uptime: `${Math.floor(uptime / 1000)} seconds`,
    uptimeMs: uptime,
    fallbackNumber: getFallbackNumber(),
    QrCode: baseUrl + '/qr-code',
    client: clientData,
    phoneNumber,
    pushName,
  });
});

export default router;