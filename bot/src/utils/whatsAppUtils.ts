/**
 * WhatsApp Client Management Utilities
 * CENTRALIZED - Unified utility functions for WhatsApp client lifecycle
 * Now includes internal QR code management and universal cache
 */

import { Client, LocalAuth } from "whatsapp-web.js";
import * as QRCode from "qrcode";
import * as path from "path";
import { cleanAndFormatPhoneNumber } from "./cleanAndFormatPhoneNumber";
import { logger } from "../services/LoggerService";
import { puppeteerConfig } from "../config/PuppeteerConfig";
import { QR_PATH } from "../config/EnvironmentManager";
import { EnvironmentConfig } from "../types/types";
import { setClient } from "../config/clientExporter";
import { qrAutoRestartController } from "../controllers/AutoRestartController";
import { cacheManager } from "../services/CacheManager";
import { groupWebhookService } from "../services/GroupWebhookService";

// State management
let whatsappClient: Client | null = null;

// QR Code state (moved from qrUtils)
let currentQRCode: string | null = null;
let qrCodePath: string | null = null;

/**
 * Initialize QR code system (internal function)
 */
export async function initializeQRCodePath(botId: string): Promise<string> {
  try {
    qrCodePath = path.join(QR_PATH, `qr-code-${botId}.png`);
    logger.info(`QR code path initialized: ${qrCodePath}`, "📂", undefined, "QR_STATUS", "INITIALIZING");
    return qrCodePath;
  } catch (error) {
    logger.error(`Failed to initialize QR code path: ${error}`, {}, "ERRORS", 1);
    throw error;
  }
}

/**
 * Handle QR code generation (internal function)
 */
async function handleQRGenerated(qr: string): Promise<void> {
  if (!qrCodePath) {
    throw new Error("QR code path not initialized");
  }

  try {
    logger.info("Processing QR code generation...", "🔄", undefined, "QR_STATUS", "GENERATING");
    currentQRCode = qr;

    await saveQRCode(qr);

    // Update PM2 with QR code ready status
    logger.info("QR code generated and ready for scanning", "✅", undefined, "QR_STATUS", "SCANME");
    
    // Update QR Codes metric
    logger.updateMetric("QR_CODES", 1);

    logger.info(`QR Code saved to: ${qrCodePath}`, "💾");
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error handling QR code: ${errorMessage}`);
    
    // Update errors metric
    logger.updateMetric("ERRORS", 1);
    
    throw new Error(`QR code handling failed: ${errorMessage}`);
  }
}

/**
 * Save QR code to file (internal function)
 */
async function saveQRCode(qr: string): Promise<void> {
  if (!qrCodePath) {
    throw new Error("QR code path not initialized");
  }

  try {
    await QRCode.toFile(qrCodePath, qr);
    logger.info(`QR code saved to: ${qrCodePath}`, "💾", undefined, "QR_STATUS", "SAVED");
  } catch (error) {
    logger.error(`Failed to save QR code: ${error}`, {}, "ERRORS", 1);
    throw error;
  }
}

/**
 * Clean up QR code file (internal function)
 */
function cleanupQRCode(): void {
  if (qrCodePath) {
    try {
      const fs = require("fs");
      if (fs.existsSync(qrCodePath)) {
        fs.unlinkSync(qrCodePath);
        logger.info("QR code file cleaned up", "🧹");
      }
    } catch (error) {
      logger.error(`Failed to cleanup QR code: ${error}`);
    }
  }
  currentQRCode = null;
}

/**
 * Initialize WhatsApp client with proper configuration
 * Now handles QR code management internally and waits for client to be ready
 */
export async function initializeWhatsAppClient(
  config: EnvironmentConfig,
  onQRGenerated?: (qr: string) => Promise<void>
): Promise<Client> {
  // Iniciar el controlador de auto-reinicio para QR code
  qrAutoRestartController.startMonitoring();
  
  // Inicializar contexto de sesión para lógica inteligente
  qrAutoRestartController.initializeSessionContext(config.SESSION_PATH, config.BOT_ID);
  
  if (whatsappClient) {
    logger.info("WhatsApp client already initialized", "ℹ️");
    return whatsappClient;
  }

  try {
    logger.info("WHATSAPP CLIENT INITIALIZATION", "🚀");
    logger.info("WhatsApp state: browser_launching - Starting WhatsApp Web browser", "🤖", undefined, "WHATSAPP_STATUS", "BROWSER_LAUNCHING");
    logger.logLifecycleStep("BROWSER_LAUNCHING");

    // Preparar cache universal antes de inicializar
    await cacheManager.prepareCache(config.BOT_ID);
    const universalCachePath = cacheManager.getUniversalCachePath();
    const cacheStats = cacheManager.getCacheStats();
    logger.info(`🗂️ Usando cache universal: ${universalCachePath} (${cacheStats.files} archivos, ${(cacheStats.size / 1024 / 1024).toFixed(2)} MB)`);

    // Initialize QR code path internally
    initializeQRCodePath(config.BOT_ID);

    // Get pre-validated Puppeteer configuration (Chromium already validated in startup)
    const puppeteerOptions = puppeteerConfig.getConfiguration();

    // Log Puppeteer configuration details (Chromium path already shown in startup)
    logger.info(`Puppeteer config for ${process.platform}`, "⚙️");
    
    // Log user agent information
    if (puppeteerOptions.userAgent) {
      logger.info(`🌐 User Agent: ${puppeteerOptions.userAgent}`, "🌐");
    }

    whatsappClient = new Client({
      authStrategy: new LocalAuth({
        clientId: config.BOT_ID,
        dataPath: config.SESSION_PATH, // Sesión separada por bot
      }),
      puppeteer: puppeteerOptions,
      webVersionCache: {
        type: "local",
        path: universalCachePath // Cache universal compartido
      },
      // Memory optimization settings
      qrMaxRetries: 10, // Aumentado para permitir más intentos con lógica inteligente
      restartOnAuthFail: true, // Auto-reiniciar en fallos de autenticación
      takeoverOnConflict: true,
    });

    // Create a promise that resolves when the client is ready
    const clientReadyPromise = new Promise<Client>((resolve, reject) => {
      // State change handler - captures all state transitions
      whatsappClient!.on("change_state", (state) => {
        try {
          logger.info(`WhatsApp state change: ${state}`, "🔄", undefined, "WHATSAPP_STATUS", state);
          
          // DIAGNÓSTICO: Agregar logging extendido de estados
          console.log(`[DEBUG] WhatsApp state change detected: ${state}`);
          console.log(`[DEBUG] Current time: ${new Date().toISOString()}`);
          console.log(`[DEBUG] Client ready state: ${whatsappClient?.info ? 'has info' : 'no info'}`);
          
          // Update specific metrics based on state
          if (state === "PAIRING") {
            logger.updateMetric("PAIRING_ATTEMPTS", 1);
          } else if (state === "CONNECTED") {
            logger.updateMetric("WHATSAPP_CONNECTIONS", 1);
            // DIAGNÓSTICO: Si llega a CONNECTED, debería estar cerca de READY
            console.log(`[DEBUG] WhatsApp reached CONNECTED state - should reach READY soon`);
          }
        } catch (error) {
          logger.error(`Error handling state change: ${error}`, {}, "ERRORS", 1);
        }
      });

      // Track WhatsApp state to prevent loading events from overriding READY
      let isWhatsAppReady = false;
      let loadingTimeout: NodeJS.Timeout | null = null;
      let loadingStartTime = Date.now();
      let lastLoadingProgress = 0;
      let stuckProgressCount = 0;

      // Loading screen handler - shows authentication progress
      whatsappClient!.on("loading_screen", (percent, message) => {
        try {
          // Only update to LOADING if we're not already READY
          // This prevents loading events from overriding the READY state
          if (!isWhatsAppReady) {
            logger.info(`WhatsApp loading: ${percent}% - ${message}`, "⏳", undefined, "WHATSAPP_STATUS", "LOADING");
            
            // Convert percent to number for comparison
            const currentProgress = typeof percent === 'string' ? parseInt(percent) : percent;
            
            // Check if progress is stuck
            if (currentProgress === lastLoadingProgress) {
              stuckProgressCount++;
              if (stuckProgressCount > 20) { // If stuck for 20 consecutive updates
                logger.warn(`🚨 Loading appears stuck at ${currentProgress}% - May need restart`);
              }
            } else {
              stuckProgressCount = 0;
              lastLoadingProgress = currentProgress;
            }
            
            // Set timeout for total loading time (10 minutes max)
            if (!loadingTimeout) {
              loadingTimeout = setTimeout(() => {
                const loadingTime = Math.round((Date.now() - loadingStartTime) / 1000);
                
                // DIAGNÓSTICO: Información detallada antes del timeout
                console.log(`[DEBUG] ========= LOADING TIMEOUT TRIGGERED =========`);
                console.log(`[DEBUG] Loading time: ${loadingTime}s`);
                console.log(`[DEBUG] Last progress: ${lastLoadingProgress}%`);
                console.log(`[DEBUG] Stuck count: ${stuckProgressCount}`);
                console.log(`[DEBUG] WhatsApp ready flag: ${isWhatsAppReady}`);
                console.log(`[DEBUG] Client state: ${whatsappClient ? 'exists' : 'null'}`);
                console.log(`[DEBUG] Client info: ${whatsappClient?.info ? 'has info' : 'no info'}`);
                
                logger.error(`🚨 Loading timeout after ${loadingTime}s - Restarting bot to prevent zombie state`);
                
                // DIAGNÓSTICO: Intentar obtener más información del cliente antes de reiniciar
                try {
                  console.log(`[DEBUG] Attempting to get client state before restart...`);
                  if (whatsappClient) {
                    console.log(`[DEBUG] Client exists, checking state...`);
                    // No acceder directamente a propiedades internas que pueden causar errores
                  }
                } catch (debugError) {
                  console.log(`[DEBUG] Error getting client state: ${debugError}`);
                }
                
                process.exit(1); // PM2 will restart the process
              }, 2 * 60 * 1000); // 2 minutes timeout para diagnóstico rápido
            }
          } else {
            // Just log the progress without changing the status
            logger.info(`WhatsApp loading: ${percent}% - ${message} (status already READY)`, "⏳");
          }
          logger.updateMetric("LOADING_PROGRESS", percent);
        } catch (error) {
          logger.error(`Error handling loading screen: ${error}`, {}, "ERRORS", 1);
        }
      });

      // Remote session saved handler
      whatsappClient!.on("remote_session_saved", () => {
        try {
          logger.info("WhatsApp session saved to remote storage", "💾", undefined, "WHATSAPP_STATUS", "SESSION_SAVED");
          logger.updateMetric("SESSION_SAVES", 1);
        } catch (error) {
          logger.error(`Error handling session save: ${error}`, {}, "ERRORS", 1);
        }
      });

      // QR Code generation handler
      whatsappClient!.on("qr", async (qr) => {
        try {
          logger.info("Waiting for QR", "🤖", undefined, "WHATSAPP_STATUS", "WAITING_FOR_QR");
          // Registrar intento de generación de QR en el controlador de auto-reinicio
          qrAutoRestartController.registerQrGeneration();
          
          await handleQRGenerated(qr);
          logger.info("QR Code ready for scanning", "🤖", undefined, "WHATSAPP_STATUS", "QR_READY");

          if (onQRGenerated) {
            await onQRGenerated(qr);
          }
        } catch (error) {
          logger.error(`QR generation error: ${error}`, {}, "ERRORS", 1);
          logger.info("QR Code generation failed", "🤖", undefined, "WHATSAPP_STATUS", "ERROR_CONNECTION");
        }
      });

      // Authentication handlers
      whatsappClient!.on("authenticated", () => {
        try {
          console.log(`[DEBUG] ========= AUTHENTICATED EVENT TRIGGERED =========`);
          console.log(`[DEBUG] Authenticated at: ${new Date().toISOString()}`);
          console.log(`[DEBUG] About to wait for Store injection and ready event...`);
          console.log(`[DEBUG] This event should be followed by 'ready' event`);
          console.log(`[DEBUG] If ready event doesn't fire, there's an issue with Store injection or hasSynced`);
          console.log(`[DEBUG] =============================================`);
          
          logger.info("QR Code scanned successfully!", "📱", undefined, "QR_STATUS", "SCANNED");
          logger.info("WhatsApp authentication successful", "🤖", undefined, "WHATSAPP_STATUS", "AUTHENTICATED");
          logger.info("Processing session data and preparing connection", "🤖", undefined, "WHATSAPP_STATUS", "PROCESSING_SESSION");
          logger.logLifecycleStep("AUTHENTICATING");
          
          // Update authentication metrics
          logger.updateMetric("AUTH_SUCCESS", 1);
          logger.updateMetric("QR_SCANS", 1);
          
          // Registrar éxito de autenticación QR en el sistema de auto-reinicio
          qrAutoRestartController.registerQrSuccess();
          
          cleanupQRCode();
        } catch (error) {
          logger.error(`Error during authentication: ${error}`, {}, "ERRORS", 1);
          logger.info("Authentication processing failed", "🤖", undefined, "WHATSAPP_STATUS", "ERROR_AUTHENTICATION");
        }
      });

      whatsappClient!.on("auth_failure", (message) => {
        try {
          logger.error(`WhatsApp authentication failed: ${message}`, {}, "ERRORS", 1);
          logger.info("WhatsApp state: error_authentication - Authentication failed", "🤖", undefined, "WHATSAPP_STATUS", "ERROR_AUTHENTICATION");
          logger.updateMetric("AUTH_FAILURES", 1);
          reject(new Error(`WhatsApp authentication failed: ${message}`));
        } catch (error) {
          logger.error(`Error handling auth failure: ${error}`, {}, "ERRORS", 1);
          reject(new Error("WhatsApp authentication failed"));
        }
      });

      // Ready handler - this is where we resolve the promise
      whatsappClient!.on("ready", async () => {
        isWhatsAppReady = true; // Mark as ready to prevent loading events from overriding
        
        // DIAGNÓSTICO: Logging extendido para el evento ready
        console.log(`[DEBUG] ========= READY EVENT TRIGGERED =========`);
        console.log(`[DEBUG] Time: ${new Date().toISOString()}`);
        console.log(`[DEBUG] Client info available: ${whatsappClient?.info ? 'YES' : 'NO'}`);
        if (whatsappClient?.info) {
          console.log(`[DEBUG] Phone number: ${whatsappClient.info.wid?.user || 'unknown'}`);
        }
        
        // Clear loading timeout since we're now ready
        if (loadingTimeout) {
          clearTimeout(loadingTimeout);
          loadingTimeout = null;
          const totalLoadingTime = Math.round((Date.now() - loadingStartTime) / 1000);
          logger.info(`✅ Loading completed successfully in ${totalLoadingTime}s`);
        }
        
        logger.info("WhatsApp state: ready - WhatsApp client is ready", "🤖", undefined, "WHATSAPP_STATUS", "READY");
        logger.logLifecycleStep("READY");

        // CONFIGURACIÓN PARA EVITAR INTERFERENCIA CON NOTIFICACIONES DEL TELÉFONO
        try {
          logger.info("🔧 Configurando opciones para minimizar interferencia con notificaciones...");
          
          // 1. Desactivar sincronización de fondo para evitar que el bot interfiera con las notificaciones
          await whatsappClient!.setBackgroundSync(false);
          logger.info("✅ Background sync desactivado - El bot no interferirá con las notificaciones del teléfono");
          
          // 2. Configurar presencia como no disponible para minimizar detección
          whatsappClient!.sendPresenceUnavailable();
          logger.info("✅ Presencia configurada como no disponible");
          
          // 3. Desactivar auto-descarga de medios para reducir actividad
          whatsappClient!.setAutoDownloadPhotos(false);
          whatsappClient!.setAutoDownloadVideos(false);
          whatsappClient!.setAutoDownloadDocuments(false);
          whatsappClient!.setAutoDownloadAudio(false);
          logger.info("✅ Auto-descarga de medios desactivada para reducir actividad del bot");
          
          logger.info("🎯 Configuración completada - El bot ahora debería interferir menos con las notificaciones del teléfono");
          
          // CONFIGURAR USER AGENT PARA LINUX
          await configureLinuxUserAgent();
          
        } catch (configError) {
          logger.warn(`⚠️ Error aplicando configuraciones de notificación: ${configError}`);
          // No fallar el startup por esto, solo advertir
        }

        // Start monitoring browser metrics
        startBrowserMetricsMonitoring();
        
        // Start heap monitoring to prevent memory issues
        startHeapMonitoring();
        
        // Start zombie detection system
        startZombieDetection();

        // Connect modern client to route exporter
        setClient(whatsappClient);

        // Initialize Group Webhook Service
        await initializeGroupWebhookMonitoring(whatsappClient!);

        try {
          const clientInfo = whatsappClient!.info;
          if (clientInfo) {
            // Extract phone number directly from wid.user
            let phoneNumber = "0"; // fallback
            if (clientInfo.wid?.user) {
              const { cleanedPhoneNumber } = cleanAndFormatPhoneNumber(clientInfo.wid.user);
              if (cleanedPhoneNumber !== "0") {
                phoneNumber = cleanedPhoneNumber;
                logger.info(`✅ Phone number extracted: ${phoneNumber}`, "✅");
              }
            }
            
            if (phoneNumber === "0") {
              logger.info("❌ Could not extract phone number from client info", "❌");
            }
            
            logger.info(`WhatsApp connected as: ${phoneNumber}`, "✅", undefined, "WHATSAPP_CONNECTIONS", 1);
            
            // Update WhatsApp connections metric
            logger.updateMetric("WHATSAPP_CONNECTIONS", 1);
            
            // Update client metrics - phone number and pushname (only once)
            logger.updateMetric("CLIENT_PHONE", phoneNumber);
            logger.updateMetric("CLIENT_PUSHNAME", clientInfo.pushname || "Unknown");
            
            // Log the client info
            logger.info(`Client Phone: ${phoneNumber}`, "📱");
            logger.info(`Client Name: ${clientInfo.pushname || "Unknown"}`, "👤");
          }
        } catch (error) {
          logger.info(`Could not get client info: ${error}`, "⚠️");
        }

        // Resolve the promise now that the client is ready
        resolve(whatsappClient!);
      });

      // Battery info handler - shows phone battery status
      whatsappClient!.on("change_battery", (batteryInfo) => {
        try {
          logger.info(`Phone battery: ${batteryInfo.battery}% (${batteryInfo.plugged ? 'charging' : 'not charging'})`, "🔋", undefined, "WHATSAPP_STATUS", "BATTERY_UPDATE");
          logger.updateMetric("PHONE_BATTERY", batteryInfo.battery);
        } catch (error) {
          logger.error(`Error handling battery info: ${error}`, {}, "ERRORS", 1);
        }
      });

      // Disconnection handler
      whatsappClient!.on("disconnected", (reason) => {
        try {
          logger.info(`WhatsApp disconnected: ${reason}`, "🔌", undefined, "WHATSAPP_STATUS", "DISCONNECTED");
          logger.updateMetric("DISCONNECTIONS", 1);

          // Handle specific disconnection reasons
          if (reason === "LOGOUT") {
            logger.info("User logged out from WhatsApp Web", "🤖", undefined, "WHATSAPP_STATUS", "LOGOUT");
            logger.updateMetric("LOGOUTS", 1);
          } else if (reason === "CONFLICT") {
            logger.info("WhatsApp session conflict detected", "🤖", undefined, "WHATSAPP_STATUS", "CONFLICT");
            logger.updateMetric("CONFLICTS", 1);
          } else {
            logger.info(`WhatsApp disconnected with reason: ${reason}`, "🤖", undefined, "WHATSAPP_STATUS", "DISCONNECTED");
            
            // Verificar si el mensaje contiene "Max qrcode retries reached"
            if (typeof reason === 'string' && reason.includes("Max qrcode retries")) {
              // Registrar fallo específico de QR en el sistema de auto-reinicio
              qrAutoRestartController.registerQrFailure("Max QR code retries reached");
              logger.error("🚨 Max QR code retries reached - Triggering controlled restart", {}, "ERRORS", 1);
            }
          }
        } catch (error) {
          logger.error(`Error handling disconnection: ${error}`, {}, "ERRORS", 1);
        }
      });

      // Error handlers
      whatsappClient!.on("error", (error) => {
        try {
          logger.error(`WhatsApp connection error: ${error}`, {}, "ERRORS", 1);
          logger.info(`WhatsApp state: error_connection - Connection error occurred`, "🤖", undefined, "WHATSAPP_STATUS", "ERROR_CONNECTION");
          logger.updateMetric("CONNECTION_ERRORS", 1);
          reject(error);
        } catch (handlingError) {
          logger.error(`Error handling WhatsApp error: ${handlingError}`, {}, "ERRORS", 1);
          reject(error);
        }
      });
    });

    // Initialize the client
    await whatsappClient.initialize();

    // Wait for the client to be ready before continuing
    await clientReadyPromise;

    return whatsappClient;
  } catch (error) {
    logger.info("WhatsApp state: error_validation - Validation error", "🤖", undefined, "WHATSAPP_STATUS", "ERROR_VALIDATION");
    throw error;
  }
}

/**
 * Shutdown WhatsApp client
 * ULTRA-OPTIMIZED - Silent shutdown, orchestrator handles all logging
 */
export async function shutdownWhatsAppClient(): Promise<void> {
  if (!whatsappClient) {
    return; // Silent return
  }

  try {
    // Detener el sistema de monitoreo de QR
    qrAutoRestartController.stopMonitoring();
    
    // Silent state update - no logging during shutdown

    // Check if client has a destroy method and is not null
    if (whatsappClient && typeof whatsappClient.destroy === "function") {
      try {
        await whatsappClient.destroy();
      } catch (destroyError) {
        // Handle specific whatsapp-web.js internal errors
        const errorMessage =
          destroyError instanceof Error
            ? destroyError.message
            : String(destroyError);
        if (
          !errorMessage.includes("Cannot read properties of null") &&
          !errorMessage.includes("close")
        ) {
          // Only log unexpected errors
          logger.error(`Error during WhatsApp client destroy: ${errorMessage}`);
        }
      }
    }

    whatsappClient = null;
  } catch (error) {
    logger.error(`Error during WhatsApp client shutdown: ${error}`);
    whatsappClient = null;
  }
}

/**
 * Get WhatsApp client
 */
export function getWhatsAppClient(): Client | null {
  return whatsappClient;
}

/**
 * Check if WhatsApp client is ready
 */
export function isWhatsAppClientReady(): boolean {
  return whatsappClient !== null;
}

/**
 * QR Code API exports for compatibility
 */
export function getQRCode(): string | null {
  return currentQRCode;
}

export function hasQRCode(): boolean {
  return currentQRCode !== null;
}

export function getQRCodePath(): string | null {
  return qrCodePath;
}

export function getQRStatus() {
  return {
    hasCode: currentQRCode !== null,
    path: qrCodePath,
    code: currentQRCode,
  };
}

/**
 * Clean up QR code (public export for shutdown procedures)
 * ULTRA-OPTIMIZED - Silent cleanup during shutdown
 */
export function cleanupQRCodeAfterConnection(): void {
  // Only cleanup if QR code was actually generated and saved
  if (currentQRCode && qrCodePath) {
    logger.info("QR authentication completed successfully", "✅", undefined, "QR_STATUS", "COMPLETED");
    cleanupQRCode(); // Silent cleanup - no logging
  }
  // No logging during shutdown - orchestrator handles all logging
}

/**
 * Utility functions for updating WhatsApp metrics
 * These can be called from other parts of the application
 */

/**
 * Update message processing metric
 */
export function updateMessageMetric(): void {
  logger.updateMetric("MESSAGES", 1);
}

/**
 * Update message processing time metric
 */
export function updateMessageProcessingTime(timeMs: number): void {
  logger.updateMetric("MESSAGE_PROCESSING_TIME", timeMs);
}

/**
 * Update error metric
 */
export function updateErrorMetric(): void {
  logger.updateMetric("ERRORS", 1);
}

/**
 * Update browser memory usage metric
 */
export function updateBrowserMemoryMetric(memoryMB: number): void {
  logger.updateMetric("BROWSER_MEMORY", memoryMB);
}

/**
 * Update browser CPU usage metric
 */
export function updateBrowserCpuMetric(cpuPercent: number): void {
  logger.updateMetric("BROWSER_CPU", cpuPercent);
}

/**
 * Configure Linux User Agent to present the bot as a Linux browser
 */
async function configureLinuxUserAgent(): Promise<void> {
  const client = getWhatsAppClient();
  
  if (!client || !client.pupPage) {
    logger.warn("⚠️ No se pudo configurar User Agent - Cliente o página no disponible");
    return;
  }

  try {
    // Get the configured user agent from Puppeteer config
    const puppeteerOptions = puppeteerConfig.getConfiguration();
    const linuxUserAgent = puppeteerOptions.userAgent || 
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

    // Set user agent on the page
    await client.pupPage.setUserAgent(linuxUserAgent);
    
    // Override navigator properties to show Linux
    await client.pupPage.evaluateOnNewDocument(() => {
      // Override platform
      Object.defineProperty(navigator, 'platform', {
        get: () => 'Linux x86_64'
      });
      
      // Override appVersion
      Object.defineProperty(navigator, 'appVersion', {
        get: () => '5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
      });
      
      // Override userAgent (in case it gets checked in JS)
      Object.defineProperty(navigator, 'userAgent', {
        get: () => 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
      });
      
      // Override oscpu
      Object.defineProperty(navigator, 'oscpu', {
        get: () => 'Linux x86_64'
      });
    });
    
    logger.info("🐧 User Agent configurado para Linux - El bot se presentará como navegador Linux", "🐧");
    logger.info(`🌐 User Agent: ${linuxUserAgent}`, "🌐");
    
    // Verificar la configuración
    await verifyLinuxConfiguration();
    
  } catch (error) {
    logger.warn(`⚠️ Error configurando User Agent para Linux: ${error}`);
  }
}

/**
 * Verify that the browser is correctly configured as Linux
 */
async function verifyLinuxConfiguration(): Promise<void> {
  const client = getWhatsAppClient();
  
  if (!client || !client.pupPage) {
    return;
  }

  try {
    const browserInfo = await client.pupPage.evaluate(() => {
      return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        appVersion: navigator.appVersion,
        oscpu: (navigator as { oscpu?: string }).oscpu || 'N/A'
      };
    });
    
    logger.info("🔍 Verificación de configuración del navegador:", "🔍");
    logger.info(`  📱 Platform: ${browserInfo.platform}`, "📱");
    logger.info(`  🌐 User Agent: ${browserInfo.userAgent}`, "🌐");
    logger.info(`  📋 App Version: ${browserInfo.appVersion}`, "📋");
    logger.info(`  💻 OS CPU: ${browserInfo.oscpu}`, "💻");
    
    if (browserInfo.platform.includes('Linux') || browserInfo.userAgent.includes('Linux')) {
      logger.info("✅ Bot configurado exitosamente para presentarse como Linux", "✅");
    } else {
      logger.warn("⚠️ El bot podría no estar presentándose como Linux - Verificar configuración", "⚠️");
    }
    
  } catch (error) {
    logger.warn(`⚠️ Error verificando configuración del navegador: ${error}`);
  }
}

/**
 * Configure notification settings to minimize interference with phone notifications
 * Can be called dynamically to adjust bot behavior
 */
export async function configureNotificationSettings(options: {
  backgroundSync?: boolean;
  presenceAvailable?: boolean;
  autoDownloadMedia?: boolean;
} = {}): Promise<void> {
  const client = getWhatsAppClient();
  
  if (!client) {
    throw new Error("WhatsApp client not available");
  }

  try {
    logger.info("🔧 Configurando ajustes de notificación...");

    // Background sync configuration
    const backgroundSync = options.backgroundSync ?? false;
    await client.setBackgroundSync(backgroundSync);
    logger.info(`📱 Background sync: ${backgroundSync ? 'activado' : 'desactivado'}`);

    // Presence configuration
    const presenceAvailable = options.presenceAvailable ?? false;
    if (presenceAvailable) {
      client.sendPresenceAvailable();
      logger.info("👤 Presencia: disponible");
    } else {
      client.sendPresenceUnavailable();
      logger.info("👤 Presencia: no disponible");
    }

    // Auto-download media configuration
    const autoDownloadMedia = options.autoDownloadMedia ?? false;
    client.setAutoDownloadPhotos(autoDownloadMedia);
    client.setAutoDownloadVideos(autoDownloadMedia);
    client.setAutoDownloadDocuments(autoDownloadMedia);
    client.setAutoDownloadAudio(autoDownloadMedia);
    logger.info(`📥 Auto-descarga de medios: ${autoDownloadMedia ? 'activada' : 'desactivada'}`);

    logger.info("✅ Configuración de notificaciones aplicada exitosamente");
  } catch (error) {
    logger.error(`Error configurando ajustes de notificación: ${error}`);
    throw error;
  }
}

/**
 * Apply phone-friendly settings to minimize notification interference
 * This is the recommended configuration for normal phone usage
 */
export async function applyPhoneFriendlySettings(): Promise<void> {
  await configureNotificationSettings({
    backgroundSync: false,        // No interfere con notificaciones del teléfono
    presenceAvailable: false,     // Minimiza detección como dispositivo activo
    autoDownloadMedia: false      // Reduce actividad del bot
  });
  
  logger.info("📱 Configuración amigable para teléfono aplicada - Las notificaciones deberían llegar normalmente");
}

/**
 * Apply bot-optimized settings for maximum performance
 * This configuration prioritizes bot functionality over phone notifications
 */
export async function applyBotOptimizedSettings(): Promise<void> {
  await configureNotificationSettings({
    backgroundSync: true,         // Sincronización completa
    presenceAvailable: true,      // Presencia activa
    autoDownloadMedia: true       // Descarga automática de medios
  });
  
  logger.info("🤖 Configuración optimizada para bot aplicada - Máximo rendimiento del bot");
}

/**
 * Force garbage collection and memory cleanup
 */
export async function forceMemoryCleanup(client?: Client): Promise<void> {
  try {
    logger.info('🧹 Starting forced memory cleanup...');
    
    // Force garbage collection if available
    if (global.gc) {
      global.gc();
      logger.info("🗑️ Forced garbage collection executed");
    }
    
    // If client is provided, try to clean browser cache
    if (client && client.pupPage) {
      try {
        // Clear browser cache
        await client.pupPage.evaluateOnNewDocument(() => {
          // Clear caches in the browser context
          if ('caches' in window) {
            caches.keys().then(names => {
              names.forEach(name => caches.delete(name));
            });
          }
        });
        
        // Force page garbage collection in browser context
        await client.pupPage.evaluate(() => {
          if (window.gc) {
            window.gc();
          }
        });
        
        logger.info('🧹 Browser cache cleared');
      } catch (browserError) {
        logger.warn(`🧹 Browser cleanup error: ${browserError}`);
      }
    }
    
    // Log memory usage after cleanup
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const heapPercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
    
    logger.info(`💾 Memory after cleanup: ${heapUsedMB}MB/${heapTotalMB}MB (${heapPercent}%)`);
    
    // If heap usage is still above 85%, log a warning
    if (heapPercent > 85) {
      logger.warn(`⚠️ High heap usage detected: ${heapPercent}% - Consider restarting if this persists`);
    }
  } catch (error) {
    logger.error(`Error during memory cleanup: ${error}`);
  }
}

/**
 * Monitor heap usage and trigger cleanup if needed
 */
export function startHeapMonitoring(): void {
  // Monitor heap every 2 minutes
  setInterval(async () => {
    try {
      const memUsage = process.memoryUsage();
      const heapPercent = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100);
      
      // Log heap usage every 10 minutes (every 5th check)
      if (Date.now() % (10 * 60 * 1000) < 2 * 60 * 1000) {
        const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
        const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
        logger.info(`💾 Heap usage: ${heapUsedMB}MB/${heapTotalMB}MB (${heapPercent}%)`);
      }
      
      // If heap usage exceeds 90%, trigger cleanup
      if (heapPercent > 90) {
        logger.warn(`🚨 Critical heap usage: ${heapPercent}% - Triggering cleanup`);
        await forceMemoryCleanup();
      }
      // If heap usage exceeds 85%, log warning
      else if (heapPercent > 85) {
        logger.warn(`⚠️ High heap usage: ${heapPercent}% - Monitoring closely`);
      }
      
    } catch (error) {
      logger.error(`Error monitoring heap: ${error}`);
    }
  }, 2 * 60 * 1000); // Every 2 minutes
}

/**
 * Start monitoring browser metrics (CPU and Memory)
 */
export function startBrowserMetricsMonitoring(): void {
  let lastScriptDuration = 0;
  let lastMeasureTime = Date.now();
  
  // Monitor every 30 seconds
  setInterval(async () => {
    try {
      const client = getWhatsAppClient();
      if (!client || !client.pupPage) {
        // No client or page available, set metrics to 0
        updateBrowserMemoryMetric(0);
        updateBrowserCpuMetric(0);
        return;
      }

      // Get the browser and page from the WhatsApp client
      const page = client.pupPage;
      
      // Get browser process metrics (this is approximate)
      const metrics = await page.metrics();
      
      // Calculate memory usage in MB
      const memoryMB = Math.round((metrics.JSHeapUsedSize || 0) / (1024 * 1024));
      
      // CPU calculation based on script duration change over time
      const currentTime = Date.now();
      const currentScriptDuration = metrics.ScriptDuration || 0;
      
      // Calculate the change in script duration over the time interval
      const scriptDurationDelta = currentScriptDuration - lastScriptDuration;
      const timeDelta = (currentTime - lastMeasureTime) / 1000; // Convert to seconds
      
      // Calculate CPU percentage: (script time / real time) * 100
      // This gives us a more accurate representation of actual CPU usage
      let cpuPercent = 0;
      if (timeDelta > 0 && scriptDurationDelta >= 0) {
        cpuPercent = Math.min(Math.round((scriptDurationDelta / timeDelta) * 100), 100);
      }
      
      // If this is the first measurement, start with a reasonable baseline
      if (lastScriptDuration === 0) {
        // Use a small baseline based on whether there's any script activity
        cpuPercent = currentScriptDuration > 0 ? Math.min(Math.round(currentScriptDuration * 10), 15) : 0;
      }
      
      // Update for next iteration
      lastScriptDuration = currentScriptDuration;
      lastMeasureTime = currentTime;
      
      // Update metrics
      updateBrowserMemoryMetric(memoryMB);
      updateBrowserCpuMetric(cpuPercent);
      
      // Log high browser memory usage
      if (memoryMB > 300) {
        logger.warn(`🌐 High browser memory usage: ${memoryMB}MB`);
      }
      
    } catch (error) {
      // If we can't get metrics, set to 0
      updateBrowserMemoryMetric(0);
      updateBrowserCpuMetric(0);
      
      // Log error occasionally (not every time to avoid spam)
      if (Date.now() % (5 * 60 * 1000) < 30 * 1000) {
        logger.warn(`Failed to get browser metrics: ${error}`);
      }
    }
  }, 30000); // 30 seconds
}

/**
 * Start periodic health check to detect zombie states
 */
export function startZombieDetection(): void {
  let lastHealthCheck = Date.now();
  
  // Check every 5 minutes
  setInterval(async () => {
    try {
      const client = getWhatsAppClient();
      const currentTime = Date.now();
      
      // Check if we have a client and it appears to be working
      if (!client) {
        logger.warn("🧟 Zombie detection: No WhatsApp client available");
        return;
      }
      
      // Try to ping WhatsApp Web to see if it's responsive
      if (client.pupPage) {
        try {
          // Simple page evaluation to test responsiveness
          await Promise.race([
            client.pupPage.evaluate(() => window.location.href),
            new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 5000))
          ]);
          
          lastHealthCheck = currentTime;
        } catch (error) {
          const timeSinceLastCheck = currentTime - lastHealthCheck;
          logger.warn(`🧟 WhatsApp Web unresponsive for ${Math.round(timeSinceLastCheck/1000)}s: ${error}`);
          
          // If unresponsive for more than 10 minutes, restart
          if (timeSinceLastCheck > 10 * 60 * 1000) {
            logger.error("🚨 WhatsApp Web appears to be in zombie state - Restarting process");
            process.exit(1); // PM2 will restart
          }
        }
      }
      
    } catch (error) {
      logger.warn(`Zombie detection error: ${error}`);
    }
  }, 5 * 60 * 1000); // Every 5 minutes
}

/**
 * Initialize Group Webhook Monitoring
 * Sets up message listener to forward messages from monitored groups to webhooks
 */
async function initializeGroupWebhookMonitoring(client: Client): Promise<void> {
  try {
    // Initialize the service
    await groupWebhookService.initialize();
    
    const monitoredGroups = groupWebhookService.getMonitoredGroups();
    logger.info(`📡 Group Webhook Monitoring initialized with ${monitoredGroups.length} monitored groups`);
    
    // Log enabled groups
    const enabledGroups = monitoredGroups.filter(g => g.enabled);
    if (enabledGroups.length > 0) {
      logger.info(`✅ Active monitored groups:`);
      enabledGroups.forEach(group => {
        logger.info(`   - ${group.groupName || group.groupId} → ${group.webhooks.length} webhook(s)`);
      });
    } else {
      logger.info(`ℹ️ No active monitored groups. Add groups via API or config file.`);
    }
    
    // Set up message listener
    client.on('message', async (message) => {
      try {
        // Process message for webhook forwarding
        await groupWebhookService.processMessage(message);
      } catch (error) {
        logger.error(`Error processing message for webhooks: ${error}`);
      }
    });
    
    logger.info('✅ Message listener registered for group webhook forwarding');
  } catch (error) {
    logger.error(`Failed to initialize Group Webhook Monitoring: ${error}`);
    // Don't throw - allow bot to continue even if webhook monitoring fails
  }
}
