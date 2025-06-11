/* eslint-disable no-console */
/* eslint-disable max-len */
// eslint-disable-next-line node/no-extraneous-import
import bodyParser from 'body-parser';
import express from 'express';
import cors from 'cors';
import { SystemError } from './types/types';
import { appendListeners, client, initializeClient } from './config/whatsAppClient';
import qrCodeRoute from './routes/qrCodeRoute';
import statusRoute from './routes/statusRoute';
import restartRoute from './routes/restartRoute';
import changeFallbackNumberRoute from './routes/changeFallbackNumberRoute';
import changePortRoute, { port } from './routes/changePortRoute';

export const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true}));
app.use(cors());  
app.use('/qr-code', qrCodeRoute);
app.use('/status', statusRoute);
app.use('/restart', restartRoute);
app.use('/change-fallback-number', changeFallbackNumberRoute);
app.use('/change-port', changePortRoute);

const startServer = (initialPort: number) => {
  let currentPort = initialPort;

  const attemptStart = () => app.listen(currentPort, () => {
    console.log(`Server started on port ${currentPort}. Initializing WhatsApp client...`);
    initializeClient()
      .then(() => {
        if (client) {
          appendListeners(client);
        }
      });
  }).on('error', (err: SystemError) => {
    console.log(err);
    if (err.code === 'EADDRINUSE') {
      console.log('Address in use, retrying...');
      setTimeout(() => {
        currentPort += 1;
        attemptStart();
      }, 1000);
    }
  });

  attemptStart();
};

startServer(port);

process.on('SIGINT', async () => {
  if (client !== null) {
    console.log('Closing WhatsApp client...');
    await client.resetState();
    await client.logout();
    await client.destroy();
  }

  throw new Error('Server shutting down...');
});
