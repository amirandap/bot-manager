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

// 🚀 Start server with auto port cleanup
async function startServer() {
  const PORT = process.env.BACKEND_PORT || process.env.PORT || 3001;
  const host = process.env.BACKEND_HOST || process.env.SERVER_HOST || "localhost";
  
  try {
    console.log(`🔍 Checking port ${PORT} before starting...`);
    
    // Kill any existing processes on our port
    const portCleared = await killProcessOnPort(Number(PORT));
    
    if (!portCleared) {
      console.warn(`⚠️ Warning: Could not fully clear port ${PORT}, but continuing...`);
    }
    
    // Start the server
    const server = app.listen(PORT, () => {
      console.log(`🚀 Backend server started successfully on http://${host}:${PORT}`);
      console.log(`📚 Swagger documentation available at http://${host}:${PORT}/api-docs`);
    });
    
    // Handle server startup errors
    server.on('error', (error: any) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Port ${PORT} is still in use after cleanup attempt`);
        console.log(`💡 Try manually killing processes: lsof -ti:${PORT} | xargs kill -9`);
      } else {
        console.error(`❌ Server startup error:`, error);
      }
      process.exit(1);
    });
    
    // Graceful shutdown handling
    process.on('SIGTERM', () => {
      console.log('🛑 SIGTERM received, shutting down gracefully');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });
    
    process.on('SIGINT', () => {
      console.log('🛑 SIGINT received, shutting down gracefully');
      server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
      });
    });
    
  } catch (error) {
    console.error(`❌ Failed to start server:`, error);
    process.exit(1);
  }
}

// Start the server
startServer();
