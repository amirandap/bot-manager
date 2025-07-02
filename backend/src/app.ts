import express from "express";
import { setBotsRoutes } from "./routes/botsRoutes";
import { setBotProxyRoutes } from "./routes/botProxyRoutes";
import { setStatusRoutes } from "./routes/statusRoutes";
import { setDeployRoutes } from "./routes/deployRoutes";
import { setupSwagger } from "./swagger";
import cors from "cors";
import morgan from "morgan";
import { ConfigService } from "./services/configService";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from root .env file
const envPath =
  process.env.NODE_ENV === "production"
    ? path.join(__dirname, "../../.env.production")
    : path.join(__dirname, "../../.env.development");

dotenv.config({ path: envPath });

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize config service with fallback API host
const configService = ConfigService.getInstance();
const defaultBotHost = process.env.DEFAULT_BOT_HOST;
if (defaultBotHost) {
  configService.setFallbackApiHost(defaultBotHost);
}

app.use(express.json());
app.use(cors());
app.use(morgan("short"));

setBotsRoutes(app);
setBotProxyRoutes(app);
setStatusRoutes(app);
setDeployRoutes(app);

// Setup Swagger documentation
setupSwagger(app);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app
  .listen(PORT, () => {
    const host = process.env.SERVER_HOST || "0.0.0.0";
    console.log(
      `🚀 Backend server started successfully on http://${host}:${PORT}`
    );
    console.log(
      `📚 Swagger documentation available at http://${host}:${PORT}/api-docs`
    );
  })
  .on("error", (err: any) => {
    if (err.code === "EADDRINUSE") {
      console.error(
        `❌ Port ${PORT} is already in use. Please check for other instances or change the port.`
      );
      console.error(
        `💡 You can set a different port using: PORT=<new_port> npm run dev`
      );
      process.exit(1);
    } else {
      console.error(`❌ Server failed to start:`, err);
      process.exit(1);
    }
  });
