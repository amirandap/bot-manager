/* eslint-disable max-len */
// eslint-disable-next-line node/no-extraneous-import
import bodyParser from "body-parser";
import express from "express";
import cors from "cors";
import { SystemError } from "./types/types";
import {
  appendListeners,
  client,
  initializeClient,
} from "./config/whatsAppClient";
import qrCodeRoute from "./routes/qrCodeRoute";
import statusRoute from "./routes/statusRoute";
import restartRoute from "./routes/restartRoute";
import changeFallbackNumberRoute from "./routes/changeFallbackNumberRoute";
import changePortRoute from "./routes/changePortRoute";
import path from "path";
import fs from "fs";
import { pm2Metrics } from "./utils/pm2Metrics";
import configService from "./utils/configService";

// Server start time for uptime tracking
export const serverStartTime = Date.now();

// Export configuration values from the config service
export const BOT_ID = configService.getBotId();
export const BOT_NAME = configService.getBotName();
export const BOT_PORT = configService.getBotPort();
export const BOT_TYPE = configService.getBotType();

// Centralized data paths from config service
export const DATA_ROOT = configService.get<string>("DATA_ROOT");
export const SESSION_PATH = configService.getSessionPath();
export const QR_PATH = configService.getQrPath();
export const LOGS_PATH = configService.getLogsPath();

// Create directories if they don't exist
[SESSION_PATH, QR_PATH, LOGS_PATH].forEach((dir) => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
});

// Import message tracking utilities
import { resetMessageCounters } from "./utils/messageTracker";

console.log(`🤖 Initializing ${BOT_NAME} (${BOT_ID})`);
console.log(`📂 Session path: ${SESSION_PATH}`);
console.log(`📱 QR path: ${QR_PATH}`);
console.log(`📄 Logs path: ${LOGS_PATH}`);
console.log(`🌐 Port: ${BOT_PORT}`);

// Initialize PM2 metrics
pm2Metrics.init();
resetMessageCounters();

// Update uptime metric every minute
setInterval(() => {
  const uptime = Date.now() - serverStartTime;
  pm2Metrics.updateUptime(uptime);
}, 60000);

// Configuration is now fully handled by ConfigService
// No need to sync with manager as all updates are handled by PM2 ecosystem config

export const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());
app.use("/qr-code", qrCodeRoute);
app.use("/status", statusRoute);
app.use("/restart", restartRoute);
app.use("/change-fallback-number", changeFallbackNumberRoute);
app.use("/change-port", changePortRoute);

// Import middleware and WhatsApp-dependent routes
import requireWhatsAppClient from "./middleware/clientReadyCheck";
import sendMessageRoute from "./routes/sendMessage";
import sendToPhoneRoute from "./routes/sendToPhone";
import sendToGroupRoute from "./routes/sendToGroup";
import sendBroadcastRoute from "./routes/sendBroadcast";
import sendImageRoute from "./routes/sendImageRoute";
import sendDocumentRoute from "./routes/sendDocumentRoute";
import sendAudioRoute from "./routes/sendAudioRoute";
import sendVideoRoute from "./routes/sendVideoRoute";
import pendingRoute from "./routes/pending";
import followupRoute from "./routes/followUp";
import receiveImageAndJSONRoute from "./routes/receiveImageAndJson";
import confirmationRoute from "./routes/confirmation";
import getGroupsRoute from "./routes/getGroups";

// Register WhatsApp-dependent routes with client check middleware
// These routes will return a 503 error if the WhatsApp client is not ready
app.use("/sendMessage", requireWhatsAppClient, sendMessageRoute);
app.use("/sendToPhone", requireWhatsAppClient, sendToPhoneRoute);
app.use("/sendToGroup", requireWhatsAppClient, sendToGroupRoute);
app.use("/sendBroadcast", requireWhatsAppClient, sendBroadcastRoute);
app.use("/sendImage", requireWhatsAppClient, sendImageRoute);
app.use("/sendDocument", requireWhatsAppClient, sendDocumentRoute);
app.use("/sendAudio", requireWhatsAppClient, sendAudioRoute);
app.use("/sendVideo", requireWhatsAppClient, sendVideoRoute);
app.use("/pending", requireWhatsAppClient, pendingRoute);
app.use("/followup", requireWhatsAppClient, followupRoute);
app.use(
  "/receiveImageAndJSON",
  requireWhatsAppClient,
  receiveImageAndJSONRoute
);
app.use("/confirm", requireWhatsAppClient, confirmationRoute);
app.use("/getGroups", requireWhatsAppClient, getGroupsRoute);

const startServer = (initialPort: number) => {
  let currentPort = initialPort;

  const attemptStart = () =>
    app
      .listen(currentPort, () => {
        console.log(`✅ ${BOT_NAME} server started on port ${currentPort}`);
        console.log(`🔗 Status: http://localhost:${currentPort}/status`);
        console.log(`📱 QR Code: http://localhost:${currentPort}/qr-code`);

        // Log server start
        const statusLog = path.join(LOGS_PATH, "status.log");
        fs.appendFileSync(
          statusLog,
          `${new Date().toISOString()} - Server Started on port ${currentPort}\n`
        );

        console.log("🚀 Initializing WhatsApp client...");
        initializeClient()
          .then(() => {
            if (client) {
              appendListeners(client);
              console.log(`🎉 ${BOT_NAME} fully initialized and ready!`);
            }
          })
          .catch((error) => {
            console.error("❌ Error initializing WhatsApp client:", error);

            // Log initialization error
            const errorLog = path.join(LOGS_PATH, "errors.log");
            fs.appendFileSync(
              errorLog,
              `${new Date().toISOString()} - Init Error: ${error.message}\n`
            );
          });
      })
      .on("error", (err: SystemError) => {
        console.error(`❌ Server error on port ${currentPort}:`, err);

        if (err.code === "EADDRINUSE") {
          console.log(
            `⚠️  Port ${currentPort} in use, trying ${currentPort + 1}...`
          );
          setTimeout(() => {
            currentPort += 1;
            attemptStart();
          }, 1000);
        } else {
          // Log other server errors
          const errorLog = path.join(LOGS_PATH, "errors.log");
          fs.appendFileSync(
            errorLog,
            `${new Date().toISOString()} - Server Error: ${err.message}\n`
          );
        }
      });

  attemptStart();
};

// Graceful shutdown
process.on("SIGINT", async () => {
  console.log(`🛑 Gracefully shutting down ${BOT_NAME}...`);

  // Log shutdown
  const statusLog = path.join(LOGS_PATH, "status.log");
  fs.appendFileSync(
    statusLog,
    `${new Date().toISOString()} - Graceful Shutdown\n`
  );

  if (client) {
    try {
      await client.destroy();
      console.log("✅ WhatsApp client destroyed");
    } catch (error) {
      console.error("❌ Error destroying client:", error);
    }
  }

  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log(`🛑 Received SIGTERM, shutting down ${BOT_NAME}...`);

  // Log shutdown
  const statusLog = path.join(LOGS_PATH, "status.log");
  fs.appendFileSync(
    statusLog,
    `${new Date().toISOString()} - SIGTERM Shutdown\n`
  );

  if (client) {
    try {
      await client.destroy();
    } catch (error) {
      console.error("❌ Error destroying client:", error);
    }
  }

  // Instead of process.exit(), throw an error
  throw new Error("SIGTERM received, shutting down");
});

startServer(BOT_PORT);

process.on("SIGINT", async () => {
  if (client !== null) {
    console.log("Closing WhatsApp client...");
    await client.resetState();
    await client.logout();
    await client.destroy();
  }

  throw new Error("Server shutting down...");
});
