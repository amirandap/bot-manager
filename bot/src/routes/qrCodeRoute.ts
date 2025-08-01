import { Router } from 'express';
import { client } from '../config/whatsAppClient';

const router = Router();

let qrCodeBase64: string | null = null;
let qrCodeGeneratedAt: Date | null = null;
const QR_CODE_EXPIRY_MINUTES = 2; // QR codes typically expire after 2 minutes

router.post('/', (req, res) => {
  const { qrCode } = req.body;
  qrCodeBase64 = qrCode;
  qrCodeGeneratedAt = new Date();
  res.status(200).send('QR code received');
});

router.post('/clear', (req, res) => {
  qrCodeBase64 = null;
  qrCodeGeneratedAt = null;
  res.status(200).send('QR code cleared');
});

router.get('/', (req, res) => {
  // Check if client is already connected
  if (client && client.info && client.info.wid) {
    res.status(200).send(`
      <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
        <h1 style="color: #25D366;">✅ Bot Already Connected</h1>
        <p style="font-size: 16px; color: #333;">
          This WhatsApp bot is already connected and authenticated.
        </p>
        <p style="font-size: 14px; color: #666;">
          Phone Number: ${client.info.wid.user}
        </p>
        <p style="font-size: 12px; color: #999;">
          No QR code scan is required.
        </p>
        <button onclick="window.close();" style="
          background-color: #25D366; 
          color: white; 
          border: none; 
          padding: 10px 20px; 
          border-radius: 5px; 
          cursor: pointer;
          margin-top: 20px;
        ">CLOSE</button>
      </div>
    `);
    return;
  }

  // Check if QR code is available and not expired
  if (qrCodeBase64 && qrCodeGeneratedAt) {
    const now = new Date();
    const minutesSinceGenerated = (now.getTime() - qrCodeGeneratedAt.getTime()) / (1000 * 60);
    
    if (minutesSinceGenerated > QR_CODE_EXPIRY_MINUTES) {
      // QR code has expired
      res.status(410).send(`
        <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
          <h1 style="color: #ff6b6b;">⏰ QR Code Expired</h1>
          <p style="font-size: 16px; color: #333;">
            The QR code has expired (generated ${Math.floor(minutesSinceGenerated)} minutes ago).
          </p>
          <p style="font-size: 14px; color: #666;">
            Please restart the bot to generate a new QR code.
          </p>
          <button onclick="window.location.reload();" style="
            background-color: #007bff; 
            color: white; 
            border: none; 
            padding: 10px 20px; 
            border-radius: 5px; 
            cursor: pointer;
            margin-top: 20px;
          ">REFRESH PAGE</button>
        </div>
      `);
      return;
    }

    // QR code is valid
    res.status(200).send(`
      <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
        <h1 style="color: #25D366;">📱 Scan QR Code</h1>
        <p style="font-size: 16px; color: #333;">
          Scan this QR code with your WhatsApp mobile app
        </p>
        <p style="font-size: 12px; color: #999;">
          Generated: ${qrCodeGeneratedAt.toLocaleString()}<br>
          Expires in: ${Math.ceil(QR_CODE_EXPIRY_MINUTES - minutesSinceGenerated)} minute(s)
        </p>
        <div style="margin: 20px 0;">
          <img src="data:image/png;base64,${qrCodeBase64}" alt="QR Code" style="max-width: 300px; border: 2px solid #ddd; border-radius: 10px;" />
        </div>
        <button onclick="window.location.reload();" style="
          background-color: #25D366; 
          color: white; 
          border: none; 
          padding: 10px 20px; 
          border-radius: 5px; 
          cursor: pointer;
          margin: 10px;
        ">REFRESH QR CODE</button>
        <button onclick="window.close();" style="
          background-color: #6c757d; 
          color: white; 
          border: none; 
          padding: 10px 20px; 
          border-radius: 5px; 
          cursor: pointer;
          margin: 10px;
        ">CLOSE</button>
      </div>
    `);
  } else {
    // No QR code available
    res.status(404).send(`
      <div style="font-family: Arial, sans-serif; padding: 20px; text-align: center;">
        <h1 style="color: #ffc107;">⚠️ QR Code Not Available</h1>
        <p style="font-size: 16px; color: #333;">
          The bot is currently initializing or already connected.
        </p>
        <div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-radius: 5px;">
          <h3 style="color: #495057;">Possible reasons:</h3>
          <ul style="text-align: left; display: inline-block; color: #666;">
            <li>Bot is starting up (wait 30-60 seconds)</li>
            <li>Bot is already connected to WhatsApp</li>
            <li>QR code has expired and bot is generating a new one</li>
            <li>WhatsApp Web session is being restored</li>
          </ul>
        </div>
        <button onclick="window.location.reload();" style="
          background-color: #007bff; 
          color: white; 
          border: none; 
          padding: 10px 20px; 
          border-radius: 5px; 
          cursor: pointer;
          margin: 10px;
        ">REFRESH PAGE</button>
        <button onclick="window.close();" style="
          background-color: #6c757d; 
          color: white; 
          border: none; 
          padding: 10px 20px; 
          border-radius: 5px; 
          cursor: pointer;
          margin: 10px;
        ">CLOSE</button>
      </div>
    `);
  }
});

export default router;