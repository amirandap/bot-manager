import express from "express";
import { setBotsRoutes } from "./routes/botsRoutes";
import { setStatusRoutes } from "./routes/statusRoutes";
import { setDeployRoutes } from "./routes/deployRoutes";
import cors from "cors";
import morgan from "morgan";
import { ConfigService } from "./services/configService";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from root .env file
dotenv.config({ path: path.join(__dirname, "../../.env") });

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
setStatusRoutes(app);
setDeployRoutes(app);

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  const host = process.env.SERVER_HOST || '0.0.0.0';
  console.log(`Server is running on http://${host}:${PORT}`);
});
