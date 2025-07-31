import swaggerJsdoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import { Application } from "express";

const options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "WhatsApp Bot Manager API",
      version: "1.0.0",
      description:
        "API documentation for WhatsApp Bot Manager - Bot messaging and management endpoints",
      contact: {
        name: "Bot Manager Team",
        email: "support@botmanager.com",
      },
    },
    servers: [
      {
        url: process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:3001",
        description: "Development server",
      },
    ],
    tags: [
      {
        name: "Bots",
        description: "Bot configuration and management",
      },
      {
        name: "Bot Messaging",
        description: "Send messages through bots",
      },
      {
        name: "Bot Spawning",
        description: "Create and spawn new bot instances",
      },
      {
        name: "PM2 Management",
        description: "PM2 process management for bots",
      },
      {
        name: "WhatsApp Bot Direct API",
        description: "Direct API endpoints on bot instances",
      },
      {
        name: "Bot Proxy - Core",
        description:
          "Unified proxy endpoints for bot core operations (status, QR, restart, configuration)",
      },
      {
        name: "Bot Proxy - Messaging",
        description:
          "Unified proxy endpoints for bot messaging operations with smart endpoint routing and enhanced error handling",
      },
      {
        name: "Error Handling",
        description:
          "Standardized error handling system with post-send error detection and fallback prevention",
      },
    ],
    components: {
      schemas: {
        Bot: {
          type: "object",
          required: ["id", "name", "type", "apiHost", "apiPort"],
          properties: {
            id: {
              type: "string",
              description: "Unique bot identifier",
              example: "whatsapp-bot-1234567890",
            },
            name: {
              type: "string",
              description: "Bot display name",
              example: "My WhatsApp Bot",
            },
            type: {
              type: "string",
              enum: ["whatsapp", "discord"],
              description: "Bot platform type",
              example: "whatsapp",
            },
            apiHost: {
              type: "string",
              description: "Bot API host",
              example: "localhost",
            },
            apiPort: {
              type: "number",
              description: "Bot API port",
              example: 3000,
            },
            phoneNumber: {
              type: "string",
              nullable: true,
              description: "Bot phone number (for WhatsApp bots)",
              example: "+1234567890",
            },
            pushName: {
              type: "string",
              nullable: true,
              description: "Bot display name in WhatsApp",
              example: "My Bot",
            },
            enabled: {
              type: "boolean",
              description: "Whether the bot is enabled",
              example: true,
            },
            isExternal: {
              type: "boolean",
              description: "Whether the bot is external (not managed by PM2)",
              example: false,
            },
            pm2ServiceId: {
              type: "string",
              nullable: true,
              description: "PM2 service identifier",
              example: "wabot-3000",
            },
            createdAt: {
              type: "string",
              format: "date-time",
              description: "Bot creation timestamp",
            },
            updatedAt: {
              type: "string",
              format: "date-time",
              description: "Bot last update timestamp",
            },
          },
        },
        SendMessageRequest: {
          type: "object",
          required: ["message"],
          properties: {
            message: {
              type: "string",
              description: "Message content to send",
              example: "Hello, this is a test message!",
            },
            to: {
              oneOf: [
                { type: "string" },
                { type: "array", items: { type: "string" } }
              ],
              description: "Recipients - can be phone numbers and/or group IDs. Supports unified addressing for hybrid messaging.",
              example: ["1234567890@c.us", "987654321@g.us"],
            },
            phoneNumber: {
              oneOf: [
                { type: "string" },
                { type: "array", items: { type: "string" } },
              ],
              description: "Phone number(s) to send message to",
              example: "+1234567890",
            },
            groupId: {
              oneOf: [
                { type: "string" },
                { type: "array", items: { type: "string" } }
              ],
              description: "WhatsApp group ID(s) to send message to",
              example: "1234567890@g.us",
            },
            group_id: {
              type: "string",
              description: "WhatsApp group ID (alternative to phoneNumber, legacy support)",
              example: "1234567890@g.us",
            },
            group_name: {
              type: "string",
              description: "WhatsApp group name (used with group_id)",
              example: "My Test Group",
            },
            discorduserid: {
              type: "string",
              description: "Discord user ID for cross-platform messaging",
              example: "123456789012345678",
            },
          },
        },
        SendMessageResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              description: "Whether the operation was successful",
              example: true,
            },
            result: {
              type: "object",
              description: "Response from bot API",
              properties: {
                sent: {
                  type: "array",
                  items: { type: "string" },
                  description: "Successfully sent recipients (phone numbers and/or group IDs)",
                },
                errors: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      recipient: { type: "string" },
                      error: { type: "string" },
                      errorType: { 
                        type: "string",
                        enum: ["SESSION_CORRUPTED", "CRITICAL_ERROR", "VALIDATION_ERROR"],
                        description: "Type of error encountered - SESSION_CORRUPTED errors are treated as post-send and ignored"
                      },
                    },
                  },
                  description: "Failed recipients with error details and type classification",
                },
              },
            },
            messageType: {
              type: "string",
              enum: ["INDIVIDUAL", "GROUP", "HYBRID", "BROADCAST", "UNKNOWN"],
              description: "Type of message based on recipients - HYBRID for mixed phone/group sends"
            },
            endpoint: {
              type: "string",
              enum: ["/send-to-phone", "/send-to-group", "/send-broadcast", "/send-message"],
              description: "Bot endpoint used for optimal routing based on recipient types"
            },
            requestId: {
              type: "number",
              description: "Unique request identifier for tracking and debugging"
            },
            timestamp: {
              type: "string",
              format: "date-time",
              description: "ISO timestamp of the request"
            }
          },
        },
        ErrorResponse: {
          type: "object",
          properties: {
            success: {
              type: "boolean",
              example: false,
            },
            error: {
              type: "string",
              description: "Error message",
              example: "Failed to send message",
            },
            errorType: {
              type: "string",
              enum: ["BACKEND_ERROR", "BOT_ERROR", "CONNECTION_ERROR", "REQUEST_SETUP_ERROR", "VALIDATION_ERROR", "UNKNOWN_ERROR"],
              description: "Categorized error type for better handling and debugging"
            },
            details: {
              type: "string",
              description: "Detailed error message with prefix indicating source (BACKEND_ERROR, BOT_ERROR, etc.)",
            },
            requestId: {
              type: "number",
              description: "Unique request identifier for tracking"
            },
            timestamp: {
              type: "string",
              format: "date-time",
              description: "ISO timestamp of the error"
            },
            troubleshooting: {
              type: "string",
              description: "Contextual troubleshooting guidance based on error type"
            }
          },
        },
        PM2Status: {
          type: "object",
          properties: {
            isExternal: {
              type: "boolean",
              description: "Whether the bot is external",
              example: false,
            },
            pm2ServiceId: {
              type: "string",
              description: "PM2 service identifier",
              example: "wabot-3000",
            },
            pm2Status: {
              type: "string",
              enum: [
                "online",
                "stopped",
                "errored",
                "unknown",
                "external",
                "no-service",
                "error",
              ],
              description: "PM2 process status",
              example: "online",
            },
            pm2Details: {
              type: "object",
              properties: {
                status: {
                  type: "string",
                  enum: ["online", "stopped", "errored", "unknown"],
                },
                pid: { type: "number", description: "Process ID" },
                cpu: { type: "number", description: "CPU usage percentage" },
                memory: { type: "number", description: "Memory usage in MB" },
                restarts: { type: "number", description: "Number of restarts" },
                uptime: {
                  type: "number",
                  description: "Uptime in milliseconds",
                },
                lastRestart: { type: "string", format: "date-time" },
              },
            },
            message: {
              type: "string",
              description: "Status message",
            },
          },
        },
        Error: {
          type: "object",
          properties: {
            error: {
              type: "string",
              description: "Error message",
              example: "Bot not found",
            },
            details: {
              type: "string",
              description: "Additional error details",
            },
          },
        },
      },
      parameters: {
        BotId: {
          name: "id",
          in: "path",
          required: true,
          description: "Bot unique identifier",
          schema: {
            type: "string",
            example: "whatsapp-bot-1234567890",
          },
        },
      },
    },
  },
  apis: ["./src/routes/*.ts", "./src/controllers/*.ts", "./src/docs/*.ts"], // paths to files containing OpenAPI definitions
};

const specs = swaggerJsdoc(options);

export const setupSwagger = (app: Application): void => {
  // Swagger UI setup
  app.use(
    "/api-docs",
    swaggerUi.serve,
    swaggerUi.setup(specs, {
      customCss: ".swagger-ui .topbar { display: none }",
      customSiteTitle: "WhatsApp Bot Manager API Documentation",
    })
  );

  // Raw JSON spec endpoint
  app.get("/api-docs.json", (req, res) => {
    res.setHeader("Content-Type", "application/json");
    res.send(specs);
  });

  console.log("📚 Swagger documentation available at /api-docs");
};
