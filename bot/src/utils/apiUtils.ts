/**
 * API Server Utilities
 * Centralized functions for Express server management
 */
import * as express from "express";
import * as multer from "multer";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "../config/swagger";
import { getQRStatus, isWhatsAppClientReady, getWhatsAppClient } from "./whatsAppUtils";
import { logger } from "../services/LoggerService";
import { MessageController } from "../controllers/MessageController";
interface BotConfig {
  BOT_ID: string;
  BOT_NAME: string;
  BOT_PORT: number;
}

// Global server state
let expressApp: express.Application | null = null;
let httpServer: any = null;

/**
 * Setup Express API with all necessary routes and middleware
 */
export async function setupExpressAPI(config: BotConfig): Promise<express.Application> {
  if (expressApp) {
    return expressApp;
  }

  // Import routes only when needed
  const getGroupsRouter = (await import("../routes/getGroups")).default;
  const { addRequestId, logRequest } = await import("../middleware/botMiddleware");

  // Create Express app
  expressApp = express.default();

  // Configure multer for file uploads
  const upload = multer.default({
    storage: multer.default.memoryStorage(),
    limits: {
      fileSize: 100 * 1024 * 1024, // 100MB limit
    },
  });

  // Basic middleware
  expressApp.use(express.json());
  expressApp.use(addRequestId);
  expressApp.use(logRequest);

  // ============================================================================
  // SWAGGER DOCUMENTATION
  // ============================================================================
  
  // Swagger UI options
  const swaggerOptions = {
    explorer: true,
    swaggerOptions: {
      docExpansion: 'none',
      filter: true,
      showRequestDuration: true,
      tryItOutEnabled: true
    },
    customSiteTitle: 'WhatsApp Bot API Documentation'
  };

  // Swagger UI endpoint
  expressApp.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, swaggerOptions));

  // Alternative documentation endpoints
  expressApp.get('/swagger.json', (req, res) => {
    res.setHeader('Content-Type', 'application/json');
    res.send(swaggerSpec);
  });

  // Documentation redirect
  expressApp.get('/docs', (req, res) => {
    res.redirect('/api-docs');
  });

  logger.info("📚 Swagger documentation available at /api-docs", "📖");

  // ============================================================================
  // UNIFIED MESSAGE ENDPOINTS - Direct integration (no intermediate router)
  // ============================================================================

  /**
   * @swagger
   * /send-to-phone:
   *   post:
   *     tags: [Mensajes]
   *     summary: Enviar mensaje de texto a números de teléfono
   *     description: |
   *       Envía un mensaje de texto a uno o varios números de teléfono específicos.
   *       Los números se validan automáticamente y se formatean según el país.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/PhoneMessageRequest'
   *           examples:
   *             single_phone:
   *               summary: Número individual
   *               value:
   *                 phoneNumber: "1234567890"
   *                 message: "Hola, este es un mensaje desde el bot!"
   *             multiple_phones:
   *               summary: Múltiples números
   *               value:
   *                 phoneNumber: ["1234567890", "0987654321", "525512345678"]
   *                 message: "Mensaje para múltiples destinatarios"
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               phoneNumber:
   *                 type: string
   *                 description: Número(s) de teléfono
   *               message:
   *                 type: string
   *                 description: Mensaje de texto
   *               file:
   *                 type: string
   *                 format: binary
   *                 description: Archivo opcional a adjuntar
   *             required: [phoneNumber, message]
   *     responses:
   *       200:
   *         $ref: '#/components/responses/Success'
   *       207:
   *         $ref: '#/components/responses/PartialSuccess'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       503:
   *         $ref: '#/components/responses/ServiceUnavailable'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  expressApp.post("/send-to-phone", upload.single("file"), MessageController.sendToPhone);

  /**
   * @swagger
   * /send-to-group:
   *   post:
   *     tags: [Mensajes]
   *     summary: Enviar mensaje de texto a grupos de WhatsApp
   *     description: |
   *       Envía un mensaje de texto a uno o varios grupos de WhatsApp.
   *       El bot debe ser miembro del grupo para poder enviar mensajes.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/GroupMessageRequest'
   *           examples:
   *             single_group:
   *               summary: Grupo individual
   *               value:
   *                 groupId: "123456789-987654321@g.us"
   *                 message: "Mensaje para el grupo desde el bot"
   *             multiple_groups:
   *               summary: Múltiples grupos
   *               value:
   *                 groupId: ["123456789-987654321@g.us", "111222333-444555666@g.us"]
   *                 message: "Mensaje para múltiples grupos"
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               groupId:
   *                 type: string
   *                 description: ID(s) de grupo
   *               message:
   *                 type: string
   *                 description: Mensaje de texto
   *               file:
   *                 type: string
   *                 format: binary
   *                 description: Archivo opcional a adjuntar
   *             required: [groupId, message]
   *     responses:
   *       200:
   *         $ref: '#/components/responses/Success'
   *       207:
   *         $ref: '#/components/responses/PartialSuccess'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       503:
   *         $ref: '#/components/responses/ServiceUnavailable'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  expressApp.post("/send-to-group", upload.single("file"), MessageController.sendToGroup);

  /**
   * @swagger
   * /send-broadcast:
   *   post:
   *     tags: [Mensajes]
   *     summary: Enviar mensaje broadcast a múltiples destinatarios
   *     description: |
   *       Envía un mensaje de texto a una lista mixta de números de teléfono y grupos.
   *       Ideal para campañas o notificaciones masivas.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/BroadcastRequest'
   *           examples:
   *             mixed_recipients:
   *               summary: Números y grupos mezclados
   *               value:
   *                 to: ["1234567890", "123456789-987654321@g.us", "0987654321"]
   *                 message: "Mensaje broadcast para todos los destinatarios"
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               to:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: Lista de destinatarios (números y grupos)
   *               message:
   *                 type: string
   *                 description: Mensaje de texto
   *               file:
   *                 type: string
   *                 format: binary
   *                 description: Archivo opcional a adjuntar
   *             required: [to, message]
   *     responses:
   *       200:
   *         $ref: '#/components/responses/Success'
   *       207:
   *         $ref: '#/components/responses/PartialSuccess'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       503:
   *         $ref: '#/components/responses/ServiceUnavailable'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  expressApp.post("/send-broadcast", upload.single("file"), MessageController.sendBroadcast);

  /**
   * @swagger
   * /send-message:
   *   post:
   *     tags: [Mensajes]
   *     summary: Enviar mensaje simple (compatibilidad legacy)
   *     description: |
   *       Endpoint simplificado para envío de mensajes de texto.
   *       Acepta tanto números de teléfono como IDs de grupo.
   *       Mantenido por compatibilidad con integraciones existentes.
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/SimpleMessageRequest'
   *           examples:
   *             phone_number:
   *               summary: Usando phoneNumber
   *               value:
   *                 phoneNumber: "1234567890"
   *                 message: "Mensaje simple a teléfono"
   *             using_to:
   *               summary: Usando campo to
   *               value:
   *                 to: "123456789-987654321@g.us"
   *                 message: "Mensaje simple a grupo"
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               to:
   *                 type: string
   *                 description: Destinatario (número o grupo)
   *               phoneNumber:
   *                 type: string
   *                 description: Número de teléfono (alternativo a 'to')
   *               message:
   *                 type: string
   *                 description: Mensaje de texto
   *               media:
   *                 type: string
   *                 format: binary
   *                 description: Archivo multimedia opcional
   *             required: [message]
   *     responses:
   *       200:
   *         $ref: '#/components/responses/Success'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       503:
   *         $ref: '#/components/responses/ServiceUnavailable'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  expressApp.post("/send-message", upload.single("media"), MessageController.sendSimpleMessage);

  // ============================================================================
  // MEDIA ENDPOINTS
  // ============================================================================

  /**
   * @swagger
   * /send-image:
   *   post:
   *     tags: [Multimedia]
   *     summary: Enviar imagen con caption opcional
   *     description: |
   *       Envía una imagen a uno o varios destinatarios con un caption opcional.
   *       Formatos soportados: JPG, PNG, GIF, WEBP. Tamaño máximo: 16MB.
   *     requestBody:
   *       $ref: '#/components/requestBodies/MediaUpload'
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               file:
   *                 type: string
   *                 format: binary
   *                 description: Archivo de imagen (JPG, PNG, GIF, WEBP)
   *               to:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: Lista de destinatarios
   *               caption:
   *                 type: string
   *                 description: Texto que acompaña la imagen
   *             required: [file, to]
   *           examples:
   *             image_with_caption:
   *               summary: Imagen con caption
   *               value:
   *                 to: ["1234567890", "123456789-987654321@g.us"]
   *                 caption: "¡Mira esta increíble imagen!"
   *     responses:
   *       200:
   *         description: Imagen enviada exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/MediaResponse'
   *       207:
   *         $ref: '#/components/responses/PartialSuccess'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       503:
   *         $ref: '#/components/responses/ServiceUnavailable'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  expressApp.post("/send-image", upload.single("file"), (req, res) => {
    MessageController.sendMedia(req, res, "image");
  });

  /**
   * @swagger
   * /send-document:
   *   post:
   *     tags: [Multimedia]
   *     summary: Enviar documento con mensaje opcional
   *     description: |
   *       Envía cualquier tipo de documento a destinatarios especificados.
   *       Acepta cualquier formato de archivo. Tamaño máximo: 100MB.
   *     requestBody:
   *       $ref: '#/components/requestBodies/MediaUpload'
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               file:
   *                 type: string
   *                 format: binary
   *                 description: Documento a enviar (cualquier formato)
   *               to:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: Lista de destinatarios
   *               message:
   *                 type: string
   *                 description: Mensaje que acompaña el documento
   *             required: [file, to]
   *           examples:
   *             pdf_document:
   *               summary: Documento PDF
   *               value:
   *                 to: ["1234567890"]
   *                 message: "Te envío el documento solicitado"
   *     responses:
   *       200:
   *         description: Documento enviado exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/MediaResponse'
   *       207:
   *         $ref: '#/components/responses/PartialSuccess'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       503:
   *         $ref: '#/components/responses/ServiceUnavailable'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  expressApp.post("/send-document", upload.single("file"), (req, res) => {
    MessageController.sendMedia(req, res, "document");
  });

  /**
   * @swagger
   * /send-audio:
   *   post:
   *     tags: [Multimedia]
   *     summary: Enviar archivo de audio
   *     description: |
   *       Envía archivos de audio a destinatarios especificados.
   *       Formatos soportados: MP3, WAV, OGG, AMR. Tamaño máximo: 16MB.
   *     requestBody:
   *       $ref: '#/components/requestBodies/MediaUpload'
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               file:
   *                 type: string
   *                 format: binary
   *                 description: Archivo de audio (MP3, WAV, OGG, AMR)
   *               to:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: Lista de destinatarios
   *               message:
   *                 type: string
   *                 description: Mensaje que acompaña el audio
   *             required: [file, to]
   *           examples:
   *             voice_message:
   *               summary: Mensaje de voz
   *               value:
   *                 to: ["1234567890", "123456789-987654321@g.us"]
   *                 message: "Aquí tienes el audio que me pediste"
   *     responses:
   *       200:
   *         description: Audio enviado exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/MediaResponse'
   *       207:
   *         $ref: '#/components/responses/PartialSuccess'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       503:
   *         $ref: '#/components/responses/ServiceUnavailable'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  expressApp.post("/send-audio", upload.single("file"), (req, res) => {
    MessageController.sendMedia(req, res, "audio");
  });

  /**
   * @swagger
   * /send-video:
   *   post:
   *     tags: [Multimedia]
   *     summary: Enviar video con caption opcional
   *     description: |
   *       Envía archivos de video a destinatarios especificados con caption opcional.
   *       Formatos soportados: MP4, AVI, MOV, 3GP. Tamaño máximo: 64MB.
   *     requestBody:
   *       $ref: '#/components/requestBodies/MediaUpload'
   *       content:
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               file:
   *                 type: string
   *                 format: binary
   *                 description: Archivo de video (MP4, AVI, MOV, 3GP)
   *               to:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: Lista de destinatarios
   *               caption:
   *                 type: string
   *                 description: Texto que acompaña el video
   *             required: [file, to]
   *           examples:
   *             video_message:
   *               summary: Video con caption
   *               value:
   *                 to: ["1234567890", "123456789-987654321@g.us"]
   *                 caption: "Mira este video increíble!"
   *     responses:
   *       200:
   *         description: Video enviado exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/MediaResponse'
   *       207:
   *         $ref: '#/components/responses/PartialSuccess'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       503:
   *         $ref: '#/components/responses/ServiceUnavailable'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  expressApp.post("/send-video", upload.single("file"), (req, res) => {
    MessageController.sendMedia(req, res, "video");
  });

  // ============================================================================
  // OTHER ROUTES
  // ============================================================================

  /**
   * @swagger
   * /get-groups:
   *   get:
   *     tags: [Grupos]
   *     summary: Obtener lista de grupos de WhatsApp
   *     description: |
   *       Devuelve todos los grupos de WhatsApp donde el bot es miembro.
   *       Incluye información detallada de cada grupo como ID, nombre, 
   *       número de participantes y si el bot es administrador.
   *     responses:
   *       200:
   *         description: Lista de grupos obtenida exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/GroupsResponse'
   *             examples:
   *               groups_list:
   *                 summary: Ejemplo de lista de grupos
   *                 value:
   *                   success: true
   *                   groups:
   *                     - id: "123456789-987654321@g.us"
   *                       name: "Grupo de Trabajo"
   *                       description: "Coordinación de proyectos"
   *                       participants: 15
   *                       isGroupAdmin: true
   *                       createdAt: "2023-01-15T10:30:00.000Z"
   *                     - id: "111222333-444555666@g.us"
   *                       name: "Chat Familiar"
   *                       participants: 8
   *                       isGroupAdmin: false
   *                       createdAt: "2022-12-01T08:00:00.000Z"
   *                   totalGroups: 2
   *                   timestamp: "2024-01-15T16:45:00.000Z"
   *       503:
   *         $ref: '#/components/responses/ServiceUnavailable'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  expressApp.use("/get-groups", getGroupsRouter);

  /**
   * @swagger
   * /status:
   *   get:
   *     tags: [Estado]
   *     summary: Estado del bot de WhatsApp
   *     description: |
   *       Devuelve el estado actual del bot incluyendo información de conexión,
   *       disponibilidad del cliente de WhatsApp y código QR si es necesario.
   *     responses:
   *       200:
   *         description: Estado del sistema obtenido exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/StatusResponse'
   *             examples:
   *               bot_ready:
   *                 summary: Bot conectado y listo
   *                 value:
   *                   botId: "BOT_001"
   *                   botName: "WhatsApp Bot Manager"
   *                   isReady: true
   *                   hasClient: true
   *                   connectionState: "CONNECTED"
   *                   timestamp: "2024-01-15T16:45:00.000Z"
   *               bot_needs_auth:
   *                 summary: Bot necesita autenticación
   *                 value:
   *                   botId: "BOT_001"
   *                   botName: "WhatsApp Bot Manager"
   *                   isReady: false
   *                   hasClient: true
   *                   qrCode: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA..."
   *                   connectionState: "AUTHENTICATION_NEEDED"
   *                   timestamp: "2024-01-15T16:45:00.000Z"
   */
  expressApp.get("/status", (req, res) => {
    const isReady = isWhatsAppClientReady();
    const hasClient = getWhatsAppClient() !== null;
    const qrStatus = getQRStatus();
    
    res.json({
      botId: config.BOT_ID,
      botName: config.BOT_NAME,
      isReady: isReady,
      hasClient: hasClient,
      timestamp: new Date().toISOString(),
      ...qrStatus
    });
  });

  /**
   * @swagger
   * /health:
   *   get:
   *     tags: [Estado]
   *     summary: Estado de salud del sistema
   *     description: |
   *       Endpoint de health check para monitoreo del sistema.
   *       Devuelve información básica sobre la salud y disponibilidad del servicio.
   *       Útil para load balancers y sistemas de monitoreo.
   *     responses:
   *       200:
   *         description: Estado de salud obtenido exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               $ref: '#/components/schemas/HealthResponse'
   *             examples:
   *               healthy:
   *                 summary: Sistema saludable
   *                 value:
   *                   status: "healthy"
   *                   ready: true
   *                   uptime: 3600.45
   *                   timestamp: "2024-01-15T16:45:00.000Z"
   *               starting:
   *                 summary: Sistema iniciando
   *                 value:
   *                   status: "starting"
   *                   ready: false
   *                   uptime: 45.12
   *                   timestamp: "2024-01-15T16:45:00.000Z"
   */
  expressApp.get("/health", (req, res) => {
    const isReady = isWhatsAppClientReady();
    res.json({
      status: isReady ? "healthy" : "starting",
      ready: isReady,
      uptime: process.uptime(),
      timestamp: new Date().toISOString()
    });
  });

  logger.info("Express API configured successfully", "🌐");
  return expressApp;
}

/**
 * Start the API server
 */
export async function startAPIServer(
  config: BotConfig,
  maxRetries: number = 2
): Promise<any> {
  if (!expressApp) {
    const error = new Error("Express API not configured. Call setupExpressAPI first.");
    logger.error(error.message, { component: 'api' }, "API_SERVER_STATUS", 1);
    throw error;
  }

  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      logger.info(`Attempting to start API server on port ${config.BOT_PORT} (attempt ${attempt}/${maxRetries})`, "🚀", undefined, "API_SERVER_STATUS", "STARTING");

      // Start server
      httpServer = expressApp.listen(config.BOT_PORT, () => {
        logger.info(`✅ ${config.BOT_NAME} API server started successfully on port ${config.BOT_PORT}`, "✅", undefined, "API_SERVER_STATUS", "UP");
        logger.info(`📊 Status: http://localhost:${config.BOT_PORT}/status`, "🌐");
        logger.info(` Health: http://localhost:${config.BOT_PORT}/health`, "🌐");
      });

      return httpServer;

    } catch (error) {
      lastError = error as Error;
      logger.warn(`API server startup attempt ${attempt} failed: ${error}`, undefined, "API_SERVER_STATUS", "FAILED");

      // Check if this is a port conflict
      if (isPortError(error as Error)) {
        logger.info(`Port ${config.BOT_PORT} conflict detected, attempting to resolve...`, "🔧");
        
        // Try to clean the port
        const cleanupSuccess = await cleanPort(config.BOT_PORT);
        
        if (cleanupSuccess && attempt < maxRetries) {
          logger.info("Port cleaned successfully, retrying...");
          // Wait a moment before retrying
          await new Promise(resolve => setTimeout(resolve, 2000));
          continue;
        }
      }

      if (attempt === maxRetries) {
        break;
      }

      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
    }
  }

  // If we get here, all retries failed
  const finalError = lastError || new Error("API server startup failed after retries");
  logger.error(finalError.message, { component: 'api', retries: maxRetries }, "API_SERVER_STATUS", 1);
  throw finalError;
}

/**
 * Check if an error is related to port being in use
 */
function isPortError(error: Error): boolean {
  const errorMessage = error.message.toLowerCase();
  const errorCode = (error as any).code;
  
  return (
    errorCode === 'EADDRINUSE' ||
    errorMessage.includes('eaddrinuse') ||
    errorMessage.includes('address already in use') ||
    errorMessage.includes('port') && errorMessage.includes('in use')
  );
}

/**
 * Clean a port by killing processes using it
 */
async function cleanPort(port: number, ): Promise<boolean> {
  try {
    const { exec } = await import('child_process');
    const { promisify } = await import('util');
    const execAsync = promisify(exec);

    logger.info(`🔧 Checking for processes using port ${port}...`);

    // Find process using the port
    const { stdout } = await execAsync(`lsof -ti:${port}`);
    const pids = stdout.trim().split('\n').filter(pid => pid);

    if (pids.length === 0) {
      logger.info(`Port ${port} is already free`);
      return true;
    }

    logger.info(`Found ${pids.length} process(es) using port ${port}: ${pids.join(', ')}`);

    // Kill each process
    for (const pid of pids) {
      try {
        await execAsync(`kill -9 ${pid}`);
        logger.info(`Killed process ${pid}`, "💀");
      } catch (killError) {
        logger.warn(`Failed to kill process ${pid}: ${killError}`);
      }
    }

    // Wait a moment for processes to terminate
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Verify port is now free
    try {
      const { stdout: checkStdout } = await execAsync(`lsof -ti:${port}`);
      const remainingPids = checkStdout.trim().split('\n').filter(pid => pid);
      
      if (remainingPids.length === 0) {
        logger.info(`Port ${port} successfully cleaned`);
        return true;
      } else {
        logger.warn(`Port ${port} still has ${remainingPids.length} process(es) running`);
        return false;
      }
    } catch {
      // If lsof fails, assume port is free
      logger.info(`Port ${port} appears to be cleaned`);
      return true;
    }

  } catch (error) {
    logger.error(`Error cleaning port ${port}: ${error}`);
    return false;
  }
}

/**
 * Shutdown API server
 */
export async function shutdownAPIServer(): Promise<void> {
  try {
    if (httpServer) {
      logger.info("Shutting down API server...", "🛑", undefined, "API_SERVER_STATUS", "STOPPING");
      
      return new Promise((resolve, reject) => {
        httpServer.close((error: any) => {
          if (error) {
            logger.error(`Error shutting down API server: ${error}`, { component: 'api' }, "API_SERVER_STATUS", 1);
            reject(error);
          } else {
            logger.info("API server shutdown complete", "✅", undefined, "API_SERVER_STATUS", "DOWN");
            httpServer = null;
            resolve();
          }
        });
      });
    }
  } catch (error) {
    logger.error(`Error during API server shutdown: ${error}`);
    throw error;
  }
}

/**
 * Get Express app instance
 */
export function getExpressApp(): express.Application | null {
  return expressApp;
}

/**
 * Get HTTP server instance
 */
export function getHTTPServer(): any {
  return httpServer;
}
