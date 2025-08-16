import express from "express";
import { setBotsRoutes } from "./routes/botsRoutes";
import { setBotProxyRoutes } from "./routes/botProxyRoutes";
import { setStatusRoutes } from "./routes/statusRoutes";
import { setDeployRoutes } from "./routes/deployRoutes";
import { setupSwagger } from "./swagger";
import cors from "cors";
import morgan from "morgan";
import { ConfigService } from "./services/configService";
import { killProcessOnPort } from "./utils/portKiller";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from root .env file
const envPath = path.join(__dirname, "../../.env");
dotenv.config({ path: envPath });

const app = express();
const PORT = process.env.BACKEND_PORT || process.env.PORT || 3001;

// Initialize config service with fallback API host
const configService = ConfigService.getInstance();
const defaultBotHost = process.env.DEFAULT_BOT_HOST;
if (defaultBotHost) {
  configService.setFallbackApiHost(defaultBotHost);
}

app.use(express.json());
app.use(cors());
app.use(morgan("short"));

setBotProxyRoutes(app);
setBotsRoutes(app);
setStatusRoutes(app);
setDeployRoutes(app);

// Setup Swagger documentation
setupSwagger(app);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// QR Code popup endpoint for frontend
app.get("/qr-popup", (req, res) => {
  const botName = req.query.bot || 'Bot';
  const qrUrl = req.query.qr || '';
  
  const html = `<!DOCTYPE html>
<html>
<head>
  <title>WhatsApp QR - ${botName}</title>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body{font-family:system-ui;margin:0;padding:20px;background:#f5f5f5;text-align:center}
    .container{max-width:400px;margin:0 auto;background:white;border-radius:12px;padding:20px;box-shadow:0 4px 6px rgba(0,0,0,0.1)}
    .header{background:#25D366;color:white;padding:20px;margin:-20px -20px 20px;border-radius:12px 12px 0 0}
    .qr{margin:20px 0;padding:15px;border:2px solid #25D366;border-radius:8px;background:#f8f9fa}
    img{max-width:100%;height:auto;border-radius:4px}
    .btn{padding:10px 20px;border:none;border-radius:6px;cursor:pointer;margin:5px;background:#25D366;color:white;font-size:14px}
    .btn:hover{background:#128C7E}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin:0">📱 WhatsApp QR Code</h2>
      <p style="margin:5px 0 0 0;opacity:0.9">Bot: ${botName}</p>
    </div>
    <div class="qr">
      <img src="${qrUrl}" alt="QR Code" onerror="this.parentElement.innerHTML='❌ Error loading QR code'">
    </div>
    <button class="btn" onclick="location.reload()">🔄 Refresh</button>
    <button class="btn" onclick="window.close()">✕ Close</button>
  </div>
</body>
</html>`;
  
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// 🚀 Start server with auto port cleanup
async function startServer() {
  const PORT = process.env.BACKEND_PORT || process.env.PORT || 3001;
  const host =
    process.env.BACKEND_HOST || process.env.SERVER_HOST || "localhost";

  try {
    console.log(`🔍 Checking port ${PORT} before starting...`);

    // Kill any existing processes on our port
    const portCleared = await killProcessOnPort(Number(PORT));

    if (!portCleared) {
      console.warn(
        `⚠️ Warning: Could not fully clear port ${PORT}, but continuing...`
      );
    }

    // Start the server
    const server = app.listen(PORT, () => {
      console.log(
        `🚀 Backend server started successfully on http://${host}:${PORT}`
      );
      console.log(
        `📚 Swagger documentation available at http://${host}:${PORT}/api-docs`
      );
    });

    // Handle server startup errors
    server.on("error", (error: any) => {
      if (error.code === "EADDRINUSE") {
        console.error(`❌ Port ${PORT} is still in use after cleanup attempt`);
        console.log(
          `💡 Try manually killing processes: lsof -ti:${PORT} | xargs kill -9`
        );
      } else {
        console.error(`❌ Server startup error:`, error);
      }
      process.exit(1);
    });

    // Increase max listeners to prevent warnings
    process.setMaxListeners(15);

    // Graceful shutdown function
    const gracefulShutdown = (signal: string) => {
      console.log(`🛑 ${signal} received, shutting down gracefully`);
      server.close(() => {
        console.log("✅ Server closed");
        process.exit(0);
      });

      // Force exit after 5 seconds if graceful shutdown fails
      setTimeout(() => {
        console.log("❌ Forcing shutdown after timeout");
        process.exit(1);
      }, 5000);
    };

    // Remove any existing listeners to prevent duplicates
    process.removeAllListeners("SIGTERM");
    process.removeAllListeners("SIGINT");

    // Add shutdown handlers (only once)
    process.once("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.once("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    console.error(`❌ Failed to start server:`, error);
    process.exit(1);
  }
}

// Start the server
startServer();
