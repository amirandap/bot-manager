/* eslint-disable max-len */
/* eslint-disable no-console */
import { Client, GroupChat, LocalAuth } from "whatsapp-web.js";
import qrTerminal from "qrcode";
import sendMessageRoute from "../routes/sendMessage";
import pendingRoute from "../routes/pending";
import followupRoute from "../routes/followUp";
import receiveImageAndJSONRoute from "../routes/receiveImageAndJson";
import confirmationRoute from "../routes/confirmation";
import getGroupsRoute from "../routes/getGroups";
import { sendMessage } from "../helpers/helpers";
import { app, BOT_ID, SESSION_PATH } from "..";
import { getGroupDetails } from "../helpers/groupHelper";
import nodemailer from "nodemailer";
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

    // Determine the correct Chrome executable path based on the operating system
    let chromeExecutablePath;

    if (process.env.CHROME_PATH) {
      chromeExecutablePath = process.env.CHROME_PATH;
    } else if (process.platform === "darwin") {
      // macOS
      chromeExecutablePath =
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
    } else if (process.platform === "linux") {
      // Linux
      chromeExecutablePath = "/usr/bin/google-chrome";
    } else if (process.platform === "win32") {
      // Windows
      chromeExecutablePath =
        "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
    } else {
      // Default fallback
      chromeExecutablePath = "/usr/bin/google-chrome";
    }

    console.log(`🌐 Using Chrome executable: ${chromeExecutablePath}`);

    client = new Client({
      authStrategy: new LocalAuth({
        dataPath: SESSION_PATH,
        clientId: BOT_ID,
      }),
      puppeteer: {
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-accelerated-2d-canvas",
          "--no-first-run",
          "--no-zygote",
          "--single-process",
          "--disable-gpu",
        ],
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
    console.error("Error initializing client:", error);
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

      // Send email with QR code link if not already sent
      if (!emailSent) {
        const transporter = nodemailer.createTransport({
          service: "gmail",
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS,
          },
        });

        const rootFolderName = path.basename(path.resolve(__dirname, "../../"));
        const mailOptions = {
          from: process.env.GMAIL_USER,
          to: process.env.MAIL_RECIPIENT,
          subject: "WhatsApp QR Code",
          text: `Scan the QR code using the following link: ${baseUrl}/qr-code\nRoot folder: ${rootFolderName}`,
        };

        try {
          await transporter.sendMail(mailOptions);
          console.log("Email sent with QR code link");
          emailSent = true;
        } catch (error) {
          console.error("Error sending email:", error);
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
    app.use("/send-message", sendMessageRoute);
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
    Endpoints available: POST /send-message, POST /pending, POST /followup, POST /receive-image-and-json, GET /get-groups`;
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
}
