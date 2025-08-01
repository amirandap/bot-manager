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
import { getFallbackNumber } from "../utils/fallbackUtils";

dotenv.config();

export let client: Client | null = null;
let emailSent = false;

export async function initializeClient() {
  try {
    console.log(`🚀 Initializing WhatsApp client for bot: ${BOT_ID}`);
    console.log(`📂 Using session path: ${SESSION_PATH}`);
    
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
    await client?.initialize();
    console.log("Client is ready!");

    // Check if the client is already authenticated
    if (client.info) {
      console.log("Client is already authenticated", client.info);
      return;
    }
  } catch (error) {
    console.error("❌ CRITICAL ERROR: Failed to initialize WhatsApp client:", error);
    console.error("🛑 Bot cannot continue without a working browser.");
    console.error("🔧 Please check Chrome/Chromium installation and CHROME_PATH environment variable");
    console.error("⚠️  Bot initialization failed - stopping this instance gracefully");
    
    // Throw error to be handled by the calling function instead of forcing exit
    throw new Error(`WhatsApp client initialization failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function appendListeners(client: Client) {
  if (!client) {
    throw new Error("Client not initialized");
  }
  client.on("qr", async (qr) => {
    console.log("Scan the QR code with your phone:");
    qrTerminal.toString(
      qr,
      { type: "terminal", small: true },
      (err, qrString) => {
        if (err) {
          console.error("Error generating QR code:", err);
          return;
        }
        console.log(qrString);
      }
    );
    qrTerminal.toDataURL(qr, async (err, url) => {
      // Send QR code to the endpoint
      const baseUrl = process.env.BASE_URL || "http://localhost:2343";
      try {
        await fetch(`${baseUrl}/qr-code`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ qrCode: url.split(",")[1] }),
        });
        console.log("QR code sent to endpoint");
      } catch (error) {
        console.error("Error sending QR code to endpoint:", error);
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
          const mailOptions = {
            from: smtpConfig.user,
            to: smtpConfig.recipient,
            subject: "WhatsApp QR Code",
            text: `Scan the QR code using the following link: ${baseUrl}/qr-code\nRoot folder: ${rootFolderName}`,
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

  client.on("ready", async () => {
    console.log("✅ WhatsApp client is ready and authenticated!");
    
    // Clear QR code since we're now connected
    try {
      await fetch(`${process.env.BASE_URL || "http://localhost:2343"}/qr-code/clear`, {
        method: "POST",
      });
    } catch (error) {
      console.log("Note: Could not clear QR code (this is normal)");
    }

    // Legacy unified endpoint (for backward compatibility)
    app.use("/send-message", sendMessageRoute);
    
    // New specific endpoints (recommended)
    app.use("/send-to-phone", sendToPhoneRoute);
    app.use("/send-to-group", sendToGroupRoute);
    app.use("/send-broadcast", sendBroadcastRoute);
    
    // Media-specific endpoints
    app.use("/send-image", sendImageRoute);
    app.use("/send-document", sendDocumentRoute);
    app.use("/send-audio", sendAudioRoute);
    app.use("/send-video", sendVideoRoute);
    
    // Other endpoints
    app.use("/pending", pendingRoute);
    app.use("/followup", followupRoute);
    app.use("/receive-image-and-json", receiveImageAndJSONRoute);
    app.use("/confirmation", confirmationRoute);
    app.use("/get-groups", getGroupsRoute);

    // Send group chats list with initial message along with current endpoints
    const chats = await client.getChats();
    const groupChats = chats.filter((chat) =>
      chat.id._serialized.endsWith("@g.us")
    ) as GroupChat[];
    const groups = await Promise.all(
      groupChats.map((group) => getGroupDetails(group))
    );
    const message = `Whatsapp client initialized. Current groups:
    ${groups.map((group) => `Group: ${group.name}, ID: ${group.id}`).join("\n")}
    
Endpoints available:
• Legacy: POST /send-message (unified)
• Specific: POST /send-to-phone, POST /send-to-group, POST /send-broadcast
• Media: POST /send-image, POST /send-document, POST /send-audio, POST /send-video
• Other: POST /pending, POST /followup, POST /receive-image-and-json, GET /get-groups`;
    try {
      await sendMessage(client, getFallbackNumber(), message);
    } catch (error: unknown) {
      console.error("Error sending initial message:", error);
    }
    console.log(message);
  });

  client.on("error", (error) => {
    console.log(error);
  });

  client.on("disconnected", (reason) => {
    console.log(`❌ WhatsApp client disconnected: ${reason}`);
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
