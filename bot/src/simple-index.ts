// Simple bot index for environment variable handling
import { exec } from 'child_process';
import express from 'express';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

// Bot configuration from environment variables
const BOT_ID = process.env.BOT_ID || `bot-${Date.now()}`;
const BOT_NAME = process.env.BOT_NAME || `WhatsApp Bot ${BOT_ID}`;
const BOT_PORT = parseInt(process.env.BOT_PORT || '3000');
const BOT_TYPE = process.env.BOT_TYPE || 'whatsapp';

// Centralized data paths
const DATA_ROOT = path.join(__dirname, '../../../data');
const SESSION_PATH = path.join(DATA_ROOT, 'sessions', BOT_ID);
const QR_PATH = path.join(DATA_ROOT, 'qr-codes');
const LOGS_PATH = path.join(DATA_ROOT, 'logs', BOT_ID);

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

const app = express();
app.use(express.json());

let isReady = false;
let qrCodeData: string | null = null;
let clientInfo: any = null;

// Log helper function
const logToFile = (file: string, message: string) => {
    const logFile = path.join(LOGS_PATH, file);
    const timestamp = new Date().toISOString();
    fs.appendFileSync(logFile, `${timestamp} - ${message}\n`);
};

// Basic status endpoint
app.get('/status', (req, res) => {
    res.json({
        status: isReady ? 'online' : 'offline',
        botId: BOT_ID,
        botName: BOT_NAME,
        port: BOT_PORT,
        uptime: `${Math.floor(process.uptime())} seconds`,
        client: clientInfo,
        hasQR: !!qrCodeData,
        sessionPath: SESSION_PATH,
        qrPath: path.join(QR_PATH, `${BOT_ID}.png`),
        timestamp: new Date().toISOString()
    });
});

// QR Code endpoint
app.get('/qr-code', (req, res) => {
    const qrFilePath = path.join(QR_PATH, `${BOT_ID}.png`);
    
    if (qrCodeData) {
        res.json({ qr: qrCodeData, available: true });
    } else if (fs.existsSync(qrFilePath)) {
        res.sendFile(qrFilePath);
    } else {
        res.status(404).json({ 
            error: 'QR code not available',
            message: isReady ? 'Bot is already authenticated' : 'Bot is initializing'
        });
    }
});

// Health check endpoint
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        botId: BOT_ID,
        sessionExists: fs.existsSync(SESSION_PATH),
        qrExists: fs.existsSync(path.join(QR_PATH, `${BOT_ID}.png`)),
        timestamp: new Date().toISOString()
    });
});

// Send message endpoint (placeholder)
app.post('/send-message', (req, res) => {
    const { number, message } = req.body;
    
    if (!isReady) {
        return res.status(503).json({ error: 'Bot is not ready' });
    }

    if (!number || !message) {
        return res.status(400).json({ error: 'Number and message are required' });
    }

    // Log the message attempt
    logToFile('messages.log', `Send attempt to ${number}: ${message}`);
    
    // Placeholder response
    res.json({ 
        success: true, 
        message: 'Message queued (placeholder implementation)',
        to: number,
        sentAt: new Date().toISOString()
    });
});

// Simulate bot initialization
const initializeBot = () => {
    console.log('🚀 Initializing bot simulation...');
    logToFile('status.log', 'Bot initialization started');
    
    // Simulate initialization delay
    setTimeout(() => {
        isReady = true;
        clientInfo = {
            pushname: `${BOT_NAME} Simulator`,
            wid: { user: '1234567890' },
            platform: 'simulator'
        };
        
        console.log('✅ Bot simulation ready!');
        logToFile('status.log', 'Bot simulation ready');
        
        // Generate a mock QR code data
        qrCodeData = `mock-qr-code-${BOT_ID}-${Date.now()}`;
        
        // Save mock QR as text file
        const qrFilePath = path.join(QR_PATH, `${BOT_ID}.png`);
        fs.writeFileSync(qrFilePath, `Mock QR Code for ${BOT_ID}\nGenerated at: ${new Date().toISOString()}`);
        
    }, 3000); // 3 second delay to simulate initialization
};

// Start server
app.listen(BOT_PORT, () => {
    console.log(`✅ ${BOT_NAME} server started on port ${BOT_PORT}`);
    console.log(`🔗 Status: http://localhost:${BOT_PORT}/status`);
    console.log(`📱 QR Code: http://localhost:${BOT_PORT}/qr-code`);
    
    logToFile('status.log', `Server started on port ${BOT_PORT}`);
    
    // Initialize bot
    initializeBot();
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log(`🛑 Gracefully shutting down ${BOT_NAME}...`);
    logToFile('status.log', 'Graceful shutdown initiated');
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log(`🛑 Received SIGTERM, shutting down ${BOT_NAME}...`);
    logToFile('status.log', 'SIGTERM shutdown initiated');
    process.exit(0);
});

export { BOT_ID, BOT_NAME, BOT_PORT, SESSION_PATH, QR_PATH, LOGS_PATH };
