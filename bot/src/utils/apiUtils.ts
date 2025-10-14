/**
 * API Server Utilities
 * Centralized functions for Express server management
 */
import * as express from "express";
import * as multer from "multer";
import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "../config/swagger";
import { getQRStatus, isWhatsAppClientReady, getWhatsAppClient } from "./whatsAppUtils";
import { getClient } from "../config/clientExporter";
import { logger } from "../services/LoggerService";
import { MessageController } from "../controllers/MessageController";
import { BotConfig } from "../types/config";

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
  const notificationsRouter = (await import("../routes/notifications")).default;
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
  
  // CORS Configuration
  expressApp.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-API-Key');
    res.header('Access-Control-Max-Age', '86400'); // 24 hours
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      return res.status(200).end();
    }
    
    next();
  });
  
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
  // NOTIFICATION SETTINGS ROUTES
  // ============================================================================
  
  /**
   * @swagger
   * tags:
   *   - name: Configuración de Notificaciones
   *     description: Gestión de configuraciones para evitar interferencia con notificaciones del teléfono
   */
  expressApp.use("/api/notifications", notificationsRouter);

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

  // ============================================================================
  // CACHE MANAGEMENT ROUTES
  // ============================================================================

  /**
   * @swagger
   * /api/cache/clean:
   *   post:
   *     summary: Clean universal WhatsApp cache
   *     tags: [Cache Management]
   *     description: Force cleanup of the universal WhatsApp Web cache
   *     requestBody:
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             properties:
   *               reason:
   *                 type: string
   *                 description: Reason for cache cleanup
   *                 example: "Manual cleanup requested"
   *     responses:
   *       200:
   *         description: Cache cleaned successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                 message:
   *                   type: string
   *                 cacheStats:
   *                   type: object
   *       500:
   *         description: Server error
   */
  expressApp.post("/api/cache/clean", async (req, res) => {
    try {
      const { reason = "Manual cleanup via bot API" } = req.body;
      
      // Import cache manager
      const { qrAutoRestartController } = await import("../controllers/AutoRestartController");
      
      await qrAutoRestartController.forceCacheCleanup(reason);
      const cacheStats = qrAutoRestartController.getCacheInfo();
      
      res.json({
        success: true,
        message: "Universal cache cleaned successfully",
        cacheStats,
        reason,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({
        success: false,
        error: "Failed to clean universal cache",
        details: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  });

  /**
   * @swagger
   * /api/cache/stats:
   *   get:
   *     summary: Get universal cache statistics
   *     tags: [Cache Management]
   *     description: Retrieve statistics about the universal WhatsApp Web cache
   *     responses:
   *       200:
   *         description: Cache statistics retrieved successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 exists:
   *                   type: boolean
   *                 size:
   *                   type: number
   *                 files:
   *                   type: number
   *                 path:
   *                   type: string
   *       500:
   *         description: Server error
   */
  expressApp.get("/api/cache/stats", async (req, res) => {
    try {
      // Import cache manager
      const { cacheManager } = await import("../services/CacheManager");
      
      const cacheStats = cacheManager.getCacheStats();
      const cachePath = cacheManager.getUniversalCachePath();
      
      res.json({
        ...cacheStats,
        path: cachePath,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({
        exists: false,
        size: 0,
        files: 0,
        path: "unknown",
        error: "Failed to get cache stats",
        details: errorMessage,
        timestamp: new Date().toISOString()
      });
    }
  });

  // ============================================================================
  // GROUP MANAGEMENT ENDPOINTS
  // ============================================================================

  /**
   * @swagger
   * /add-to-group:
   *   post:
   *     summary: Add participants to WhatsApp group
   *     tags: [Group Management]
   *     description: Add one or more participants to a WhatsApp group using group name or ID
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [participants]
   *             properties:
   *               groupName:
   *                 type: string
   *                 description: Name of the WhatsApp group (alternative to groupId)
   *                 example: "Marketing Team"
   *               groupId:
   *                 type: string
   *                 description: WhatsApp group ID (alternative to groupName)
   *                 example: "1234567890-1234567890@g.us"
   *               participants:
   *                 type: array
   *                 items:
   *                   type: string
   *                 description: Array of phone numbers to add to the group
   *                 example: ["+1234567890", "+0987654321"]
   *           examples:
   *             add_by_name:
   *               summary: Add participants by group name
   *               value:
   *                 groupName: "Marketing Team"
   *                 participants: ["+1234567890", "+0987654321"]
   *             add_by_id:
   *               summary: Add participants by group ID
   *               value:
   *                 groupId: "1234567890-1234567890@g.us"
   *                 participants: ["+1234567890"]
   *     responses:
   *       200:
   *         description: Participants added successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 groupId:
   *                   type: string
   *                   example: "1234567890-1234567890@g.us"
   *                 groupName:
   *                   type: string
   *                   example: "Marketing Team"
   *                 addedParticipants:
   *                   type: array
   *                   items:
   *                     type: string
   *                   example: ["+1234567890", "+0987654321"]
   *                 failedParticipants:
   *                   type: array
   *                   items:
   *                     type: object
   *                     properties:
   *                       phoneNumber:
   *                         type: string
   *                       reason:
   *                         type: string
   *                   example: []
   *                 message:
   *                   type: string
   *                   example: "Successfully added 2 participants to the group"
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *                   example: "2025-10-06T23:30:00Z"
   *       400:
   *         description: Missing required parameters or invalid input
   *       404:
   *         description: Group not found
   *       500:
   *         description: Server error or WhatsApp client not ready
   */
  expressApp.post("/add-to-group", async (req, res) => {
    const { groupName, groupId, participants } = req.body;

    // Validation
    if (!groupName && !groupId) {
      return res.status(400).json({
        success: false,
        error: "Either groupName or groupId is required"
      });
    }

    if (!participants || !Array.isArray(participants) || participants.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Participants array is required and must not be empty"
      });
    }

    try {
      // Get WhatsApp client
      const client = getWhatsAppClient();
      if (!client) {
        return res.status(500).json({
          success: false,
          error: "WhatsApp client not ready"
        });
      }

      let targetGroupId = groupId;
      let targetGroupName = groupName;

      // If group name is provided but not ID, find the group
      if (groupName && !groupId) {
        try {
          const chats = await client.getChats();
          const groups = chats.filter(chat => chat.isGroup);
          const targetGroup = groups.find(group => 
            group.name.toLowerCase() === groupName.toLowerCase()
          );

          if (!targetGroup) {
            return res.status(404).json({
              success: false,
              error: `Group with name "${groupName}" not found`,
              availableGroups: groups.map(g => ({ id: g.id._serialized, name: g.name }))
            });
          }

          targetGroupId = targetGroup.id._serialized;
          targetGroupName = targetGroup.name;
        } catch (error: any) {
          return res.status(500).json({
            success: false,
            error: "Failed to retrieve groups",
            details: error.message
          });
        }
      } else if (groupId && !groupName) {
        // If only groupId provided, get the group name for logging
        try {
          const chat = await client.getChatById(targetGroupId!);
          if (chat.isGroup) {
            targetGroupName = chat.name;
          }
        } catch (error: any) {
          // Not critical, continue without name
          logger.warn(`Could not retrieve group name for ${targetGroupId}: ${error.message}`);
        }
      }

      // Format and validate participants
      const { formatRecipient } = await import("./recipientFormattingUtils");
      const formattedParticipants: string[] = [];
      const invalidParticipants: string[] = [];

      for (const participant of participants) {
        try {
          const formatted = formatRecipient(participant);
          
          // Check if number is valid on WhatsApp
          const numberId = await client.getNumberId(formatted);
          if (numberId) {
            formattedParticipants.push(formatted);
          } else {
            invalidParticipants.push(participant);
          }
        } catch (error) {
          invalidParticipants.push(participant);
        }
      }

      if (formattedParticipants.length === 0) {
        return res.status(400).json({
          success: false,
          error: "No valid WhatsApp numbers found in participants list",
          invalidParticipants
        });
      }

      // Add participants to group
      const addedParticipants: string[] = [];
      const failedParticipants: Array<{phoneNumber: string, reason: string}> = [];

      try {
        // Get the group chat
        const chat = await client.getChatById(targetGroupId!);
        
        if (!chat.isGroup) {
          return res.status(400).json({
            success: false,
            error: "Provided ID is not a group"
          });
        }

        // Check if bot is admin before attempting to add participants
        const groupMetadata = await (chat as any).groupMetadata;
        const botNumber = client.info.wid._serialized;
        const botParticipant = groupMetadata.participants.find((p: any) => p.id._serialized === botNumber);
        
        logger.info(`Bot admin check - Bot: ${botNumber}, Group: ${targetGroupName}`);
        logger.info(`Bot participant found: ${!!botParticipant}, Is admin: ${botParticipant?.isAdmin}`);
        
        if (!botParticipant || !botParticipant.isAdmin) {
          logger.warn(`Bot is not admin of group ${targetGroupName}. Cannot add participants.`);
          return res.status(403).json({
            success: false,
            error: "Bot is not an administrator of this group",
            message: "The bot must be a group administrator to add participants. Please promote the bot to admin first.",
            groupId: targetGroupId,
            groupName: targetGroupName,
            botNumber: botNumber,
            timestamp: new Date().toISOString()
          });
        }
        
        logger.info(`Bot is admin of group ${targetGroupName}. Proceeding to add participants.`);

        // Add each participant individually for better error handling
        for (const participant of formattedParticipants) {
          try {
            // Use the addParticipants method available on group chats
            // Note: We use 'as any' here because TypeScript may not have the latest WhatsApp Web.js types
            const result = await (chat as any).addParticipants([participant]);
            logger.info(`Add participant result for ${participant}:`, JSON.stringify(result));
            addedParticipants.push(participant);
            logger.info(`Successfully added ${participant} to group ${targetGroupName}`);
          } catch (addError: any) {
            const reason = addError.message || "Unknown error occurred";
            failedParticipants.push({ phoneNumber: participant, reason });
            logger.error(`Failed to add ${participant} to group ${targetGroupName}: ${reason}`, addError);
          }
        }

        // Add invalid participants to failed list
        for (const invalid of invalidParticipants) {
          failedParticipants.push({ 
            phoneNumber: invalid, 
            reason: "Number not registered on WhatsApp" 
          });
        }

        const response = {
          success: true,
          groupId: targetGroupId,
          groupName: targetGroupName,
          addedParticipants,
          failedParticipants,
          message: `Successfully added ${addedParticipants.length} participant(s) to the group`,
          timestamp: new Date().toISOString()
        };

        logger.info(`Group operation completed: ${addedParticipants.length} added, ${failedParticipants.length} failed`);
        res.json(response);

      } catch (groupError: any) {
        logger.error(`Failed to add participants to group: ${groupError.message}`);
        res.status(500).json({
          success: false,
          error: "Failed to add participants to group",
          details: groupError.message,
          groupId: targetGroupId,
          groupName: targetGroupName,
          timestamp: new Date().toISOString()
        });
      }

    } catch (error: any) {
      logger.error(`Add to group error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: "Server error occurred",
        details: error.message,
        timestamp: new Date().toISOString()
      });
    }
  });

  // ============================================================================
  // NUMBER VERIFICATION ENDPOINTS
  // ============================================================================

  /**
   * @swagger
   * /verify-number:
   *   post:
   *     summary: Verificar número de WhatsApp
   *     tags: [Verification]
   *     description: Verifica si un número de teléfono está registrado en WhatsApp
   *     requestBody:
   *       required: true
   *       content:
   *         application/json:
   *           schema:
   *             type: object
   *             required: [phoneNumber]
   *             properties:
   *               phoneNumber:
   *                 type: string
   *                 description: Número de teléfono con código de país
   *                 example: "+1234567890"
   *           examples:
   *             verify_number:
   *               summary: Verificar número individual
   *               value:
   *                 phoneNumber: "+1234567890"
   *     responses:
   *       200:
   *         description: Verificación exitosa
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 success:
   *                   type: boolean
   *                   example: true
   *                 phoneNumber:
   *                   type: string
   *                   example: "+1234567890"
   *                 isRegistered:
   *                   type: boolean
   *                   example: true
   *                 numberId:
   *                   type: string
   *                   example: "1234567890@c.us"
   *                 formatted:
   *                   type: string
   *                   example: "+1 (234) 567-890"
   *                 isValid:
   *                   type: boolean
   *                   example: true
   *                 country:
   *                   type: string
   *                   example: "US"
   *                 timestamp:
   *                   type: string
   *                   format: date-time
   *                   example: "2025-10-06T23:30:00Z"
   *       400:
   *         description: Número de teléfono requerido
   *       500:
   *         description: Error en la verificación o cliente WhatsApp no listo
   */
  expressApp.post("/verify-number", async (req, res) => {
    const { phoneNumber } = req.body;
    
    if (!phoneNumber) {
      return res.status(400).json({
        success: false,
        error: "Phone number is required",
        timestamp: new Date().toISOString()
      });
    }

    try {
      // Importar funciones de utilidad
      const { formatRecipient } = await import("./recipientFormattingUtils");
      const { cleanAndFormatPhoneNumber } = await import("./cleanAndFormatPhoneNumber");
      
      // Formatear número
      const formattedNumber = formatRecipient(phoneNumber);
      const cleanedNumber = cleanAndFormatPhoneNumber(phoneNumber);
      
      // Obtener cliente WhatsApp
      const client = getWhatsAppClient();
      if (!client) {
        return res.status(500).json({
          success: false,
          error: "WhatsApp client not ready",
          phoneNumber,
          timestamp: new Date().toISOString()
        });
      }

      // Verificar número en WhatsApp
      let isRegistered = false;
      let numberId = null;
      let errorDetails = null;
      
      try {
        numberId = await client.getNumberId(formattedNumber);
        isRegistered = !!numberId;
        
        logger.info(`Number verification: ${phoneNumber} -> ${isRegistered ? 'REGISTERED' : 'NOT REGISTERED'}`);
      } catch (verifyError: any) {
        logger.warn(`Number verification failed: ${verifyError.message}`);
        isRegistered = false;
        errorDetails = verifyError.message;
      }

      // Respuesta estructurada
      const response = {
        success: true,
        phoneNumber,
        isRegistered,
        numberId: numberId?._serialized || null,
        formatted: cleanedNumber.cleanedPhoneNumber,
        isValid: cleanedNumber.isValid,
        errorDetails: isRegistered ? null : errorDetails,
        timestamp: new Date().toISOString()
      };

      logger.info(`Number verification completed: ${phoneNumber} -> ${isRegistered}`);
      res.json(response);

    } catch (error: any) {
      logger.error(`Number verification error: ${error.message}`);
      res.status(500).json({
        success: false,
        error: "Server error during verification",
        details: error.message,
        phoneNumber,
        timestamp: new Date().toISOString()
      });
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
