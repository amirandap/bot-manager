/* eslint-disable max-len */
/* eslint-disable no-console */
import { Client, LocalAuth } from "whatsapp-web.js";
import qrTerminal from "qrcode";
import nodemailer from "nodemailer";
import {
  isSmtpConfigured,
  getSmtpConfig,
  logSmtpStatus,
} from "../utils/smtpUtils";

import { botLifecycle, BotLifecycleState } from "../utils/botLifecycleTracker";
import { pm2Metrics } from "../utils/pm2Metrics";
import configService from "../utils/configService";

export let client: Client | null = null;
let emailSent = false;

// Message counters for monitoring
let messagesSent = 0;
let messagesReceived = 0;

// Export functions to get message counts
export const getMessageCounters = () => ({
  sent: messagesSent,
  received: messagesReceived,
});

// Use PM2 metrics to check client readiness - this eliminates a separate flag
export const isClientReady = (): boolean => {
  // Access PM2 metrics directly
  try {
    // Define a type for PM2 metrics to avoid 'any'
    interface PM2Metrics {
      is_connected?: boolean;
      whatsapp_status?: string;
      [key: string]: unknown;
    }

    // Access the metrics with proper typing
    const pm2Metrics = (global as { NodeJS?: { _METRICS?: PM2Metrics } }).NodeJS
      ?._METRICS;

    // Client is ready if whatsapp_status is 'ready' or 'connected' and is_connected is true
    return (
      pm2Metrics?.is_connected === true &&
      ["ready", "connected"].includes(pm2Metrics?.whatsapp_status || "")
    );
  } catch (error) {
    return false; // Default to not ready if metrics access fails
  }
};

export async function initializeClient() {
  try {
    const botId = configService.getBotId();
    const sessionPath = configService.getSessionPath();

    console.log(`🚀 Initializing WhatsApp client for bot: ${botId}`);
    console.log(`📂 Using session path: ${sessionPath}`);

    // Set initial lifecycle state
    botLifecycle.setState(
      BotLifecycleState.INITIALIZING,
      "Starting WhatsApp client initialization"
    );

    // Log SMTP configuration status
    logSmtpStatus();

    // Get Chrome executable path from config service
    const chromeExecutablePath = configService.getChromePath();
    console.log(`🌐 Using Chrome executable: ${chromeExecutablePath}`);

    // Get system memory to adjust browser parameters
    const systemMemoryMB = configService.getMemoryLimitMB();

    // Calculate memory limits based on available memory
    const memoryLimitMB = Math.min(systemMemoryMB * 0.5, 1024);
    const memoryParams = [
      `--js-flags=--max-old-space-size=${memoryLimitMB}`,
      `--max-old-space-size=${memoryLimitMB}`,
    ];

    // Log memory configuration
    console.log(`🧠 Memory optimization: Limiting to ${memoryLimitMB}MB`);

    // Optimized browser arguments for WhatsApp Web
    const browserArgs = [
      // Process isolation and security
      "--no-sandbox",
      "--disable-setuid-sandbox",

      // Memory and performance optimizations
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--disable-gpu",
      "--memory-pressure-off",

      // Background processing optimizations
      "--disable-background-timer-throttling",
      "--disable-backgrounding-occluded-windows",
      "--disable-renderer-backgrounding",

      // Feature disabling for reduced resource usage
      "--disable-features=TranslateUI,VizDisplayCompositor,BlinkGenPropertyTrees",
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

      // Security settings (required for WhatsApp Web to function)
      "--disable-web-security",
      "--ignore-certificate-errors",
      "--ignore-ssl-errors",
      "--ignore-certificate-errors-spki-list",

      // Anti-detection measures
      "--disable-infobars",
      "--disable-blink-features=AutomationControlled",
      "--disable-notifications",
      "--disable-desktop-notifications",
      "--disable-permissions-api",
      "--autoplay-policy=no-user-gesture-required",

      // Additional memory optimizations
      ...memoryParams,
    ];

    // Update lifecycle state before creating client
    botLifecycle.markBrowserLaunching();

    client = new Client({
      authStrategy: new LocalAuth({
        dataPath: sessionPath,
        clientId: botId,
      }),
      puppeteer: {
        headless: true,
        args: [...browserArgs, ...memoryParams],
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
    console.error(
      "❌ CRITICAL ERROR: Failed to initialize WhatsApp client:",
      error
    );
    console.error("🛑 Bot cannot continue without a working browser.");
    console.error(
      "🔧 Please check Chrome/Chromium installation and CHROME_PATH environment variable"
    );
    console.error(
      "⚠️  Bot initialization failed - stopping this instance gracefully"
    );

    // Update lifecycle state to reflect the error
    if (error instanceof Error) {
      if (
        error.message.includes("browser") ||
        error.message.includes("puppeteer") ||
        error.message.includes("chrome") ||
        error.message.includes("executable")
      ) {
        botLifecycle.markBrowserError(error);
      } else {
        botLifecycle.markError(error);
      }
    } else {
      botLifecycle.markError(new Error(String(error)));
    }

    // Throw error to be handled by the calling function instead of forcing exit
    throw new Error(
      `WhatsApp client initialization failed: ${
        error instanceof Error ? error.message : String(error)
      }`
    );
  }
}

export function appendListeners(client: Client) {
  if (!client) {
    throw new Error("Client not initialized");
  }

  // QR code event
  client.on("qr", async (qr) => {
    console.log("Scan the QR code with your phone:");

    // Update lifecycle state - QR code is ready for scanning
    botLifecycle.markQRReady();

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
      const baseUrl = configService.getBaseUrl();
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

          const botName = configService.getBotName();
          const botId = configService.getBotId();
          const mailOptions = {
            from: smtpConfig.user,
            to: smtpConfig.recipient,
            subject: `WhatsApp QR Code - ${botName}`,
            text: `Scan the QR code for bot '${botName}' (${botId}) using the following link: ${baseUrl}/qr-code`,
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
    // Increment received message counter
    messagesReceived++;

    // Update PM2 metrics
    pm2Metrics.updateMessageCounters(messagesSent, messagesReceived);

    const isGroup = await message.getChat().then((chat) => chat.isGroup);

    if (message.body.toLowerCase() === "estamos ready??" && !isGroup) {
      try {
        await client.sendMessage(message.from, "Funcionando jefe 👀");
        // Increment sent message counter for the ping response
        messagesSent++;
        pm2Metrics.updateMessageCounters(messagesSent, messagesReceived);
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

    // Clear any QR code that might be cached first to indicate we're now connected
    try {
      const baseUrl = configService.getBaseUrl();
      fetch(`${baseUrl}/qr-code/clear`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      }).catch((error) => {
        console.error("Error clearing QR code:", error);
      });
    } catch (error) {
      console.error("Error attempting to clear QR code:", error);
    }
  });

  client.on("error", (error) => {
    console.log(error);
    // Update lifecycle state based on error type
    if (
      error.toString().includes("browser") ||
      error.toString().includes("puppeteer")
    ) {
      botLifecycle.markBrowserError(error);
      // The bot lifecycle state update will update PM2 metrics
    } else if (
      error.toString().includes("connection") ||
      error.toString().includes("network")
    ) {
      botLifecycle.markConnectionError(error);
      // Don't mark as disconnected for temporary connection issues
      // We'll let the 'disconnected' event handle that if needed
    } else {
      // Only mark as critical error for specific cases
      if (
        error.toString().includes("fatal") ||
        error.toString().includes("critical")
      ) {
        botLifecycle.markError(error);
      } else {
        // For non-critical errors, just log them but don't change state
        console.error("Non-critical error:", error);
      }
    }
  });

  client.on("disconnected", (reason) => {
    console.log(`❌ WhatsApp client disconnected: ${reason}`);
    // Update lifecycle state - no need to set isClientReady flag as PM2 metrics handle this
    botLifecycle.markDisconnected(reason);

    // Clear QR code on disconnection so a new one can be generated
    try {
      const baseUrl = configService.getBaseUrl();
      fetch(`${baseUrl}/qr-code/clear`, {
        method: "POST",
      });
    } catch (error) {
      console.log("Note: Could not clear QR code on disconnect");
    }
  });

  client.on("auth_failure", (message) => {
    console.error(`❌ Authentication failed: ${message}`);
    // Update lifecycle state - no need to set isClientReady flag as PM2 metrics handle this
    botLifecycle.markAuthenticationError(new Error(message));

    // Clear QR code on auth failure so a new one can be generated
    try {
      const baseUrl = configService.getBaseUrl();
      fetch(`${baseUrl}/qr-code/clear`, {
        method: "POST",
      });
    } catch (error) {
      console.log("Note: Could not clear QR code on auth failure");
    }
  });
}
