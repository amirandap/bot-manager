import express, { Response } from 'express';
import { fallbackNumber } from './changeFallbackNumberRoute';
import { client } from '../config/whatsAppClient';

const router = express.Router();

export const serverStartTime = Date.now();

const baseUrl = process.env.BASE_URL || 'http://localhost:2343';

router.get('/', (req, res: Response) => {
  const uptime = Date.now() - serverStartTime;
  const clientData = client?.info || null;
  res.send({
    status: 'online',
    rootFolder: __dirname,
    port: process.env.PORT || 7260,
    uptime: `${Math.floor(uptime / 1000)} seconds`,
    fallbackNumber,
    QrCode: baseUrl + '/qr-code',
    client: clientData,
  });
});

export default router;