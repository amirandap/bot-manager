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
import changePortRoute from './routes/changePortRoute';
import path from 'path';
import fs from 'fs';
import axios from 'axios';
import { setFallbackNumber } from './utils/fallbackUtils';

// Bot configuration from environment variables
export const BOT_ID = process.env.BOT_ID || `bot-${Date.now()}`;
export const BOT_NAME = process.env.BOT_NAME || `WhatsApp Bot ${BOT_ID}`;
export const BOT_PORT = parseInt(process.env.BOT_PORT || '3000');
export const BOT_TYPE = process.env.BOT_TYPE || 'whatsapp';

// Centralized data paths
export const DATA_ROOT = path.join(__dirname, '../../data');
export const SESSION_PATH = path.join(DATA_ROOT, 'sessions', BOT_ID);
export const QR_PATH = path.join(DATA_ROOT, 'qr-codes');
export const LOGS_PATH = path.join(DATA_ROOT, 'logs', BOT_ID);

// Create directories if they don't exist
[SESSION_PATH, QR_PATH, LOGS_PATH].forEach(dir => {
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`📁 Created directory: ${dir}`);
    }
});

console.log(`🤖 Initializing ${BOT_NAME} (${BOT_ID})`);
console.log(`📂 Session path: ${SESSION_PATH}`);
console.log(`📱 QR path: ${QR_PATH}`);
console.log(`📄 Logs path: ${LOGS_PATH}`);
console.log(`🌐 Port: ${BOT_PORT}`);

// Function to sync configuration with bot manager
async function syncConfigWithManager(): Promise<void> {
  try {
    const managerHost = process.env.MANAGER_HOST || 'localhost';
    const managerPort = process.env.MANAGER_PORT || '3001';
    const configUrl = `http://${managerHost}:${managerPort}/api/bots/${BOT_ID}`;
    
    console.log(`🔄 Syncing configuration with manager: ${configUrl}`);
    
    const response = await axios.get(configUrl, { timeout: 5000 });
    const botConfig = response.data;
    
    console.log(`📋 Received configuration from manager:`, {
      name: botConfig.name,
      fallbackNumber: botConfig.fallbackNumber,
      phoneNumber: botConfig.phoneNumber
    });
    
    // Update fallback number if provided
    if (botConfig.fallbackNumber) {
      console.log(`📞 Updating fallback number to: ${botConfig.fallbackNumber}`);
      setFallbackNumber(botConfig.fallbackNumber);
    }
    
    console.log(`✅ Configuration synced successfully`);
  } catch (error) {
    console.warn(`⚠️  Failed to sync configuration with manager:`, error instanceof Error ? error.message : 'Unknown error');
    console.warn(`🔄 Bot will continue with default/environment configuration`);
  }
}

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
    console.log(`✅ ${BOT_NAME} server started on port ${currentPort}`);
    console.log(`🔗 Status: http://localhost:${currentPort}/status`);
    console.log(`📱 QR Code: http://localhost:${currentPort}/qr-code`);
    
    // Log server start
    const statusLog = path.join(LOGS_PATH, 'status.log');
    fs.appendFileSync(statusLog, `${new Date().toISOString()} - Server Started on port ${currentPort}\n`);
    
    // Sync configuration with manager
    syncConfigWithManager();
    
    console.log('🚀 Initializing WhatsApp client...');
    initializeClient()
      .then(() => {
        if (client) {
          appendListeners(client);
          console.log(`🎉 ${BOT_NAME} fully initialized and ready!`);
        }
      })
      .catch((error) => {
        console.error('❌ Error initializing WhatsApp client:', error);
        
        // Log initialization error
        const errorLog = path.join(LOGS_PATH, 'errors.log');
        fs.appendFileSync(errorLog, `${new Date().toISOString()} - Init Error: ${error.message}\n`);
      });
  }).on('error', (err: SystemError) => {
    console.error(`❌ Server error on port ${currentPort}:`, err);
    
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️  Port ${currentPort} in use, trying ${currentPort + 1}...`);
      setTimeout(() => {
        currentPort += 1;
        attemptStart();
      }, 1000);
    } else {
      // Log other server errors
      const errorLog = path.join(LOGS_PATH, 'errors.log');
      fs.appendFileSync(errorLog, `${new Date().toISOString()} - Server Error: ${err.message}\n`);
    }
  });

  attemptStart();
};

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log(`🛑 Gracefully shutting down ${BOT_NAME}...`);
    
    // Log shutdown
    const statusLog = path.join(LOGS_PATH, 'status.log');
    fs.appendFileSync(statusLog, `${new Date().toISOString()} - Graceful Shutdown\n`);
    
    if (client) {
        try {
            await client.destroy();
            console.log('✅ WhatsApp client destroyed');
        } catch (error) {
            console.error('❌ Error destroying client:', error);
        }
    }
    
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log(`🛑 Received SIGTERM, shutting down ${BOT_NAME}...`);
    
    // Log shutdown
    const statusLog = path.join(LOGS_PATH, 'status.log');
    fs.appendFileSync(statusLog, `${new Date().toISOString()} - SIGTERM Shutdown\n`);
    
    if (client) {
        try {
            await client.destroy();
        } catch (error) {
            console.error('❌ Error destroying client:', error);
        }
    }
    
    process.exit(0);
});

startServer(BOT_PORT);

process.on('SIGINT', async () => {
  if (client !== null) {
    console.log('Closing WhatsApp client...');
    await client.resetState();
    await client.logout();
    await client.destroy();
  }

  throw new Error('Server shutting down...');
});
