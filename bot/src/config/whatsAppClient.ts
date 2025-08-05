/* eslint-disable max-len */
/* eslint-disable no-console */
import { Client, GroupChat, LocalAuth } from "whatsapp-web.js";
import qrTerminal from "qrcode";
import sendMessageRoute from "../routes/sendMessage";
import sendToPhoneRoute from "../routes/sendToPhone";
import sendToGroupRoute from "../routes/sendToGroup";
import sendBroadcastRoute from "../routes/sendBroadcast";
import sendImageRoute from "../routes/sendImageRoute";
import sendDocumentRoute from "../routes/sendDocumentRoute";
import sendAudioRoute from "../routes/sendAudioRoute";
import sendVideoRoute from "../routes/sendVideoRoute";
import pendingRoute from "../routes/pending";
import followupRoute from "../routes/followUp";
import receiveImageAndJSONRoute from "../routes/receiveImageAndJson";
import confirmationRoute from "../routes/confirmation";
import getGroupsRoute from "../routes/getGroups";
import { sendMessage } from "../helpers/helpers";
import { app, BOT_ID, SESSION_PATH } from "..";
import { getGroupDetails } from "../helpers/groupHelper";
import nodemailer from "nodemailer";
import { isSmtpConfigured, getSmtpConfig, logSmtpStatus } from "../utils/smtpUtils";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";
import { getFallbackNumber } from "../utils/fallbackUtils";
import { botLifecycle, BotLifecycleState } from "../utils/botLifecycleTracker";

dotenv.config();

export let client: Client | null = null;
let emailSent = false;

export async function initializeClient() {
  try {
    console.log(`🚀 Initializing WhatsApp client for bot: ${BOT_ID}`);
    console.log(`📂 Using session path: ${SESSION_PATH}`);
    
    // Set initial lifecycle state
    botLifecycle.setState(BotLifecycleState.INITIALIZING, 'Starting WhatsApp client initialization');
    
    // Update PM2 metrics on initialization
    if (process.send) {
      process.send({
        type: 'process:msg',
        data: {
          botStarting: true,
          botStartTime: new Date().toISOString(),
          botId: BOT_ID,
          startupPhase: 'initializing'
        }
      });
    }
    
    // Log SMTP configuration status
    logSmtpStatus();

    // Use Chrome executable path from environment variable
    const chromeExecutablePath = process.env.CHROME_PATH || "/usr/bin/google-chrome-stable";

    console.log(`🌐 Using Chrome executable: ${chromeExecutablePath}`);

    // Optimized browser arguments for WhatsApp Web
    const browserArgs = [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--disable-gpu",
      "--memory-pressure-off",
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",
      "--disable-features=TranslateUI,VizDisplayCompositor",
      "--disable-background-networking",
      "--disable-default-apps",
      "--disable-extensions",
      "--disable-plugins",
      "--disable-sync",
      "--disable-translate",
      "--hide-scrollbars",
      "--mute-audio",
      "--disable-client-side-phishing-detection",
      "--disable-component-update",
      "--disable-hang-monitor",
      "--disable-prompt-on-repost",
      "--disable-web-security",
      "--ignore-certificate-errors",
      "--ignore-ssl-errors",
      "--ignore-certificate-errors-spki-list",
      "--disable-infobars",
      "--disable-blink-features=AutomationControlled",
      "--disable-notifications",
      "--disable-desktop-notifications",
      "--disable-permissions-api",
      "--autoplay-policy=no-user-gesture-required"
    ];
    
    // Update lifecycle state before creating client
    botLifecycle.markBrowserLaunching();
    
    client = new Client({
      authStrategy: new LocalAuth({
        dataPath: SESSION_PATH,
        clientId: BOT_ID,
      }),
      puppeteer: {
        headless: true,
        args: browserArgs,
        executablePath: chromeExecutablePath,
      },
    });
    
    console.log("Initializing client...");
    
    // Update lifecycle state before initializing
    botLifecycle.markWaitingForQR();
    
    await client?.initialize();
    console.log("Client is ready!");

    // Check if the client is already authenticated
    if (client.info) {
      console.log("Client is already authenticated", client.info);
      botLifecycle.markConnected();
      botLifecycle.markReady();
      return;
    }
  } catch (error) {
    console.error("❌ CRITICAL ERROR: Failed to initialize WhatsApp client:", error);
    console.error("🛑 Bot cannot continue without a working browser.");
    console.error("🔧 Please check Chrome/Chromium installation and CHROME_PATH environment variable");
    console.error("⚠️  Bot initialization failed - stopping this instance gracefully");
    
    // Update lifecycle state to reflect the error
    if (error instanceof Error) {
      if (error.message.includes('browser') || error.message.includes('puppeteer') || 
          error.message.includes('chrome') || error.message.includes('executable')) {
        botLifecycle.markBrowserError(error);
      } else {
        botLifecycle.markError(error);
      }
    } else {
      botLifecycle.markError(new Error(String(error)));
    }
    
    // Throw error to be handled by the calling function instead of forcing exit
    throw new Error(`WhatsApp client initialization failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function appendListeners(client: Client) {
  if (!client) {
    throw new Error("Client not initialized");
  }
  
  // QR code event
  client.on("qr", async (qr) => {
    console.log("📱 Scan the QR code with your phone:");
    
    // Update lifecycle state - QR code is ready for scanning
    botLifecycle.markQRReady();
    
    // Display QR in terminal
    qrTerminal.toString(
      qr,
      { type: "terminal", small: true },
      (err, qrString) => {
        if (err) {
          console.error("❌ Error generating terminal QR code:", err);
          return;
        }
        console.log(qrString);
      }
    );
    
    // Generate QR code as data URL and store it locally for API access
    qrTerminal.toDataURL(qr, async (err, url) => {
      if (err) {
        console.error("❌ Error generating QR data URL:", err);
        botLifecycle.markQRError(new Error(`QR generation error: ${err.message}`));
        return;
      }
      
      const botId = BOT_ID || "unknown-bot-id";
      const qrCodeBase64 = url.split(",")[1];
      
      try {
        // Store QR code locally for API access
        const qrCodeDir = path.join(process.cwd(), '../data/qr-codes');
        
        // Ensure the directory exists
        if (!fs.existsSync(qrCodeDir)) {
          fs.mkdirSync(qrCodeDir, { recursive: true });
        }
        
        // Save QR code to a file named with the bot ID
        const qrCodePath = path.join(qrCodeDir, `${botId}.json`);
        fs.writeFileSync(
          qrCodePath,
          JSON.stringify({ 
            qrCode: qrCodeBase64, 
            timestamp: new Date().toISOString(),
            botId: botId
          }, null, 2)
        );
        
        console.log(`💾 QR code saved locally for bot ID ${botId}`);
        
        // Also save as image for convenience
        const qrImagePath = path.join(qrCodeDir, `${botId}.png`);
        fs.writeFileSync(
          qrImagePath,
          qrCodeBase64,
          'base64'
        );
        
        // Update PM2 metrics to indicate QR code is available
        if (process.send) {
          process.send({
            type: 'process:msg',
            data: {
              qrCodeAvailable: true,
              qrCodeTimestamp: new Date().toISOString(),
              botId: botId
            }
          });
        }
      } catch (error) {
        console.error(`❌ Error saving QR code locally:`, error);
        
        if (error instanceof Error) {
          botLifecycle.markQRError(error);
        }
      }

            // Send email with QR code link if SMTP is configured and not already sent
      if (!emailSent && isSmtpConfigured()) {
        try {
          const smtpConfig = getSmtpConfig()!;
          const transporter = nodemailer.createTransport({
            service: "gmail",
            auth: {
              user: smtpConfig.user,
              pass: smtpConfig.pass,
            },
          });

          const rootFolderName = path.basename(path.resolve(__dirname, "../../"));
          const apiHost = process.env.API_HOST || "http://localhost:3001";
          const mailOptions = {
            from: smtpConfig.user,
            to: smtpConfig.recipient,
            subject: `WhatsApp QR Code - Bot ${BOT_ID}`,
            text: `Scan the QR code for bot ${BOT_ID}.\nAccess the QR code at: ${apiHost}/api/bots/${botId}/qr-code\nRoot folder: ${rootFolderName}`,
          };

          await transporter.sendMail(mailOptions);
          console.log("✅ Email sent with QR code link");
          emailSent = true;
        } catch (error) {
          console.error("❌ Error sending email:", error);
        }
      }
    });
  });
  
  // Add disconnect event handler
  client.on("disconnected", (reason) => {
    console.log(`🔌 WhatsApp client disconnected: ${reason}`);
    botLifecycle.markDisconnected(reason);
    
    // Update PM2 metrics for disconnection event
    if (process.send) {
      process.send({
        type: 'process:msg',
        data: {
          botConnected: false,
          botDisconnected: true,
          disconnectReason: reason,
          disconnectTimestamp: new Date().toISOString(),
          botId: BOT_ID
        }
      });
    }
  });
  
  // Add reconnecting event handler
  client.on("change_state", (state) => {
    console.log(`📶 WhatsApp client state changed: ${state}`);
    
    if (state === 'CONNECTED') {
      botLifecycle.markConnected();
    }
    else if (state === 'OPENING') {
      botLifecycle.markReconnecting();
      
      // Update PM2 metrics for reconnection attempt
      if (process.send) {
        process.send({
          type: 'process:msg',
          data: {
            botReconnecting: true,
            reconnectAttemptTimestamp: new Date().toISOString(),
            botId: BOT_ID
          }
        });
      }
    }
  });

  client.on("message", async (message) => {
    const isGroup = await message.getChat().then((chat) => chat.isGroup);

    if (message.body.toLowerCase() === "estamos ready??" && !isGroup) {
      try {
        await client.sendMessage(message.from, "Funcionando jefe 👀");
      } catch (error) {
        console.error("Error while processing message:", error);
      }
    }
  });

  // Client ready event
  client.on("ready", () => {
    console.log("Client is ready!");
    
    // Update lifecycle state
    botLifecycle.markConnected();
    botLifecycle.markReady();
    
    // Initialize routes
    app.use("/sendMessage", sendMessageRoute);
    app.use("/sendToPhone", sendToPhoneRoute);
    app.use("/sendToGroup", sendToGroupRoute);
    app.use("/sendBroadcast", sendBroadcastRoute);
    app.use("/sendImage", sendImageRoute);
    app.use("/sendDocument", sendDocumentRoute);
    app.use("/sendAudio", sendAudioRoute);
    app.use("/sendVideo", sendVideoRoute);
    app.use("/pending", pendingRoute);
    app.use("/followup", followupRoute);
    app.use("/receiveImageAndJSON", receiveImageAndJSONRoute);
    app.use("/confirm", confirmationRoute);
    app.use("/getGroups", getGroupsRoute);

    // Use the botLifecycle to update PM2 metrics
    botLifecycle.updateMetrics();
    
    // Send additional ready metrics
    if (process.send) {
      process.send({
        type: 'process:msg',
        data: {
          botConnected: true,
          botReady: true,
          botReadyTimestamp: new Date().toISOString(),
          botId: BOT_ID,
          qrCodeAvailable: false,
          apiRoutesInitialized: true,
          whatsappInfo: client.info ? {
            phone: client.info.wid ? client.info.wid.user : null,
            name: client.info.pushname,
            platform: client.info.platform
          } : null,
          memoryUsage: process.memoryUsage()
        }
      });
    }
    
    // Delete any stored QR code since we don't need it anymore
    try {
      const qrCodeDir = path.join(process.cwd(), '../data/qr-codes');
      const qrCodePath = path.join(qrCodeDir, `${BOT_ID}.json`);
      const qrImagePath = path.join(qrCodeDir, `${BOT_ID}.png`);
      
      if (fs.existsSync(qrCodePath)) {
        fs.unlinkSync(qrCodePath);
      }
      
      if (fs.existsSync(qrImagePath)) {
        fs.unlinkSync(qrImagePath);
      }
    } catch (error) {
      console.error("Error removing QR code files:", error);
    }
  });

  client.on("error", (error) => {
    console.log(error);
    // Update lifecycle state based on error type
    if (error.toString().includes('browser') || error.toString().includes('puppeteer')) {
      botLifecycle.markBrowserError(error);
    } else if (error.toString().includes('connection') || error.toString().includes('network')) {
      botLifecycle.markConnectionError(error);
    } else {
      botLifecycle.markError(error);
    }
  });

  client.on("disconnected", (reason) => {
    console.log(`❌ WhatsApp client disconnected: ${reason}`);
    // Update lifecycle state
    botLifecycle.markDisconnected(reason);
    
    // Clear QR code on disconnection so a new one can be generated
    try {
      fetch(`${process.env.BASE_URL || "http://localhost:2343"}/qr-code/clear`, {
        method: "POST",
      });
    } catch (error) {
      console.log("Note: Could not clear QR code on disconnect");
    }
  });

  client.on("auth_failure", (message) => {
    console.error(`❌ Authentication failed: ${message}`);
    // Update lifecycle state
    botLifecycle.markAuthenticationError(new Error(message));
    
    // Clear QR code on auth failure so a new one can be generated
    try {
      fetch(`${process.env.BASE_URL || "http://localhost:2343"}/qr-code/clear`, {
        method: "POST",
      });
    } catch (error) {
      console.log("Note: Could not clear QR code on auth failure");
    }
  });
}
