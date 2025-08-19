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
import { logger } from "./services/LoggerService";
import { textToJsonMiddleware, enhancedJsonErrorHandler } from "./middleware/textProcessing";
import { 
  handleMulterErrors, 
  globalErrorHandler 
} from "./middleware/validation";
import { validateJsonPayload } from "./middleware/jsonValidation";
import dotenv from "dotenv";
import path from "path";

// Load environment variables from root .env file
const envPath = path.join(__dirname, "../../.env");
dotenv.config({ path: envPath });

const app = express();
const PORT = process.env.BACKEND_PORT || process.env.PORT || 7299;

// Initialize config service with fallback API host
const configService = ConfigService.getInstance();
const defaultBotHost = process.env.DEFAULT_BOT_HOST;
if (defaultBotHost) {
  configService.setFallbackApiHost(defaultBotHost);
}

app.use(express.json());
app.use(cors());

// Add request logging middleware
app.use((req, res, next) => {
  logger.logRequest(req);
  next();
});

// Use morgan with custom format that works with Pino
app.use(morgan("combined", {
  stream: {
    write: (message: string) => {
      logger.getPinoLogger().info(`🌐 ${message.trim()}`);
    }
  }
}));

// Apply text-to-JSON middleware globally
app.use(textToJsonMiddleware);

// Apply enhanced JSON error handler
app.use(enhancedJsonErrorHandler);

// Apply global JSON validation
app.use(validateJsonPayload);

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

// Add global error handlers at the end
app.use(handleMulterErrors);
app.use(globalErrorHandler);

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
