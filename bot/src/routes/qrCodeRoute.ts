import { Router } from 'express';
import nodemailer from 'nodemailer';

const router = Router();

let qrCodeBase64: string | null = null;

router.post('/', (req, res) => {
  const { qrCode } = req.body;
  qrCodeBase64 = qrCode;
  res.status(200).send('QR code received');
});

router.get('/', (req, res) => {
  if (qrCodeBase64) {
    res.status(200).send(`
        <button onclick="window.location.reload();">REFRESH CODE</button>
        <img src="data:image/png;base64,${qrCodeBase64}" alt="QR Code" />
        `);
  } else {
    res.status(404).send(`
        <h1>QR code not found, try refreshing</h1>
        <button onclick="window.location.reload();">REFRESH CODE</button>`);
  }
});

export default router;