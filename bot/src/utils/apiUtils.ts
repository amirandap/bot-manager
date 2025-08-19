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
   * /send-message:
   *   post:
   *     tags: [Mensajes]
   *     summary: Enviar mensaje unificado (texto, imágenes, archivos)
   *     description: |
   *       **Endpoint principal y unificado** para envío de mensajes de texto, imágenes, videos, 
   *       audio y documentos a números individuales, múltiples números, grupos, o combinaciones mixtas.
   *       
   *       **Detección automática de tipo:**
   *       - Sin archivo: mensaje de texto
   *       - Con archivo: detecta automáticamente imagen/video/audio/documento
   *       
   *       **Tipos de destinatarios soportados:**
   *       - Números individuales: "1234567890"
   *       - Múltiples números: ["1234567890", "0987654321"]
   *       - IDs de grupos: "123456789-987654321@g.us"
   *       - Combinación mixta: ["1234567890", "123456789-987654321@g.us"]
   *       
   *       **Tipos de archivo soportados:**
   *       - Imágenes: JPG, PNG, GIF, WEBP (máx. 16MB)
   *       - Videos: MP4, AVI, MOV, 3GP (máx. 64MB)
   *       - Audio: MP3, WAV, OGG, AMR (máx. 16MB)
   *       - Documentos: PDF, DOC, XLS, etc. (máx. 100MB)
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             $ref: '#/components/schemas/MainMessageRequest'
   *           examples:
   *             text_single:
   *               summary: Texto a número individual
   *               value:
   *                 to: "1234567890"
   *                 message: "Hola, mensaje de texto simple"
   *             text_multiple:
   *               summary: Texto a múltiples destinatarios
   *               value:
   *                 to: ["1234567890", "0987654321"]
   *                 message: "Mensaje a múltiples números"
   *             text_mixed:
   *               summary: Texto a números y grupos
   *               value:
   *                 to: ["1234567890", "123456789-987654321@g.us"]
   *                 message: "Mensaje para destinatarios mixtos"
   *         multipart/form-data:
   *           schema:
   *             type: object
   *             properties:
   *               to:
   *                 oneOf:
   *                   - type: string
   *                     description: Destinatario individual (número o grupo)
   *                   - type: array
   *                     items:
   *                       type: string
   *                     description: Lista de destinatarios (números y grupos)
   *               message:
   *                 type: string
   *                 description: Mensaje de texto (requerido si no hay archivo, opcional con archivo)
   *               caption:
   *                 type: string
   *                 description: Caption para imágenes y videos (opcional)
   *               file:
   *                 type: string
   *                 format: binary
   *                 description: |
   *                   Archivo multimedia opcional. Tipo detectado automáticamente:
   *                   - Imágenes: JPG, PNG, GIF, WEBP
   *                   - Videos: MP4, AVI, MOV, 3GP
   *                   - Audio: MP3, WAV, OGG, AMR
   *                   - Documentos: PDF, DOC, XLS, etc.
   *             required: [to]
   *           examples:
   *             image_with_caption:
   *               summary: Imagen con caption
   *               value:
   *                 to: ["1234567890", "123456789-987654321@g.us"]
   *                 caption: "¡Mira esta imagen!"
   *                 file: "[imagen.jpg]"
   *             document_with_message:
   *               summary: Documento con mensaje
   *               value:
   *                 to: "1234567890"
   *                 message: "Te envío el documento solicitado"
   *                 file: "[documento.pdf]"
   *             video_only:
   *               summary: Video sin texto
   *               value:
   *                 to: ["1234567890", "0987654321"]
   *                 file: "[video.mp4]"
   *     responses:
   *       200:
   *         description: Mensaje enviado exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               oneOf:
   *                 - $ref: '#/components/schemas/StandardResponse'
   *                 - $ref: '#/components/schemas/MediaResponse'
   *       207:
   *         $ref: '#/components/responses/PartialSuccess'
   *       400:
   *         $ref: '#/components/responses/BadRequest'
   *       503:
   *         $ref: '#/components/responses/ServiceUnavailable'
   *       500:
   *         $ref: '#/components/responses/InternalServerError'
   */
  expressApp.post("/send-message", upload.single("file"), MessageController.sendBroadcast);

  /**
   * @swagger
   * /send-broadcast:
   *   post:
   *     tags: [Mensajes]
   *     summary: Enviar mensaje broadcast (alias de /send-message)
   *     description: |
   *       **⚠️ DEPRECATED**: Este endpoint es un alias de `/send-message` para mantener compatibilidad.
   *       Se recomienda usar `/send-message` para nuevas integraciones.
   *       
   *       Envía un mensaje de texto a una lista mixta de números de teléfono y grupos.
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

  // Endpoint /get-groups está documentado en su archivo de ruta: /src/routes/getGroups.ts
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

  // =================
  // SESSION MONITORING & RECOVERY ROUTES
  // =================
  
  /**
   * @swagger
   * /session/status:
   *   get:
   *     tags: [Session Management]
   *     summary: Obtener estado de la sesión y recovery
   *     description: Retorna información sobre el estado de la sesión de WhatsApp y el sistema de recovery automático
   *     responses:
   *       200:
   *         description: Estado de la sesión obtenido exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 sessionHealth:
   *                   type: string
   *                   description: Estado de salud de la sesión
   *                   enum: [healthy, unhealthy, recovering]
   *                 recoveryStatus:
   *                   type: object
   *                   properties:
   *                     isRecovering:
   *                       type: boolean
   *                     recoveryAttempts:
   *                       type: number
   *                     maxRecoveryAttempts:
   *                       type: number
   *                     lastHealthCheck:
   *                       type: number
   *                 whatsappStatus:
   *                   type: string
   *                   description: Estado del cliente de WhatsApp
   */
  expressApp.get("/session/status", (req, res) => {
    try {
      const { SessionMonitorService } = require("../services/SessionMonitorService");
      const sessionMonitor = SessionMonitorService.getInstance();
      const recoveryStatus = sessionMonitor.getRecoveryStatus();
      
      const client = getClient();
      const isClientReady = client ? true : false;
      
      res.json({
        success: true,
        sessionHealth: recoveryStatus.isRecovering ? "recovering" : (isClientReady ? "healthy" : "unhealthy"),
        recoveryStatus,
        whatsappStatus: isClientReady ? "ready" : "not_ready",
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: "Failed to get session status",
        details: error instanceof Error ? error.message : String(error),
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * @swagger
   * /session/recover:
   *   post:
   *     tags: [Session Management]
   *     summary: Triggerar recovery manual de la sesión
   *     description: Fuerza un reinicio de la sesión de WhatsApp para resolver problemas de conectividad
   *     responses:
   *       200:
   *         description: Recovery iniciado exitosamente
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 recovery_initiated:
   *                   type: boolean
   *       409:
   *         description: Recovery ya en progreso
   *       500:
   *         description: Error interno del servidor
   */
  expressApp.post("/session/recover", async (req, res) => {
    try {
      const { SessionMonitorService } = require("../services/SessionMonitorService");
      const sessionMonitor = SessionMonitorService.getInstance();
      
      await sessionMonitor.triggerManualRecovery();
      
      res.json({
        success: true,
        message: "Session recovery initiated successfully",
        recovery_initiated: true,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes("already in progress")) {
        res.status(409).json({
          success: false,
          error: "Recovery already in progress",
          details: errorMessage,
          timestamp: new Date().toISOString()
        });
      } else {
        res.status(500).json({
          success: false,
          error: "Failed to trigger session recovery",
          details: errorMessage,
          timestamp: new Date().toISOString()
        });
      }
    }
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
