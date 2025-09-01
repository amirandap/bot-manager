/**
 * WhatsApp Client Management Utilities
 * CENTRALIZED - Unified utility functions for WhatsApp client lifecycle
 * Now includes internal QR code management
 */

import { Client, LocalAuth } from "whatsapp-web.js";
import * as path from "path";
import { cleanAndFormatPhoneNumber } from "./cleanAndFormatPhoneNumber";
import { logger } from "../services/LoggerService";
import { puppeteerConfig } from "../config/PuppeteerConfig";
import { EnvironmentConfig } from "../types/types";
import { setClient } from "../config/clientExporter";
import { 
  validateAndCleanCache, 
  cleanOldCacheOnNewSession, 
  startCacheMaintenance,
  cleanCache,
  cleanBrowserCache
} from "../services/CacheService";
import { 
  initializeQRCodePath,
  handleQRGenerated,
  cleanupQRCode
} from "../services/QRCodeService";
import { 
  startHeapMonitoring,
  startBrowserMetricsMonitoring,
  startZombieDetection
} from "../services/MonitoringService";
import { whatsAppSyncMonitor } from "../services/WhatsAppSyncMonitorService";

// Global error handlers for critical issues
process.on('uncaughtException', (error) => {
  logger.error(`❌ CRITICAL: Uncaught Exception - ${error.message}`, { 
    stack: error.stack, 
    name: error.name,
    timestamp: new Date().toISOString() 
  }, "CRASH", 1);
  logger.logLifecycleStep("CRASHED_UNCAUGHT_EXCEPTION");
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error(`❌ CRITICAL: Unhandled Promise Rejection`, { 
    reason: reason,
    promise: promise,
    timestamp: new Date().toISOString() 
  }, "CRASH", 1);
  logger.logLifecycleStep("CRASHED_UNHANDLED_REJECTION");
  process.exit(1);
});

process.on('SIGINT', () => {
  logger.info("🛑 Received SIGINT, gracefully shutting down...", "🛑", undefined, "LIFECYCLE", "SIGINT_SHUTDOWN");
  process.exit(0);
});

process.on('SIGTERM', () => {
  logger.info("🛑 Received SIGTERM, gracefully shutting down...", "🛑", undefined, "LIFECYCLE", "SIGTERM_SHUTDOWN");
  process.exit(0);
});

// Memory monitoring for critical thresholds
const monitorCriticalMemory = () => {
  const usage = process.memoryUsage();
  const heapUsedMB = Math.round(usage.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(usage.heapTotal / 1024 / 1024);
  const rssMB = Math.round(usage.rss / 1024 / 1024);
  
  // Alert if memory usage is critical (>400MB heap or >500MB RSS)
  if (heapUsedMB > 400 || rssMB > 500) {
    logger.error(`⚠️ CRITICAL MEMORY WARNING: Heap: ${heapUsedMB}MB, RSS: ${rssMB}MB`, {
      heapUsed: heapUsedMB,
      heapTotal: heapTotalMB,
      rss: rssMB,
      external: Math.round(usage.external / 1024 / 1024),
      timestamp: new Date().toISOString()
    }, "MEMORY_CRITICAL", 1);
  }
};

// Monitor memory every 30 seconds
setInterval(monitorCriticalMemory, 30000);

/**
 * Clean corrupted session when sync fails
 */
export async function cleanCorruptedSession(): Promise<void> {
  try {
    const fs = await import('fs/promises');
    const sessionPath = path.join(process.cwd(), 'sessions');
    
    logger.info("🧹 Attempting to clean corrupted session...", "🧹", undefined, "SESSION_CLEANUP", "STARTING");
    
    // Check if session directory exists
    try {
      await fs.access(sessionPath);
      
      // Remove session directory and all contents
      await fs.rm(sessionPath, { recursive: true, force: true });
      logger.info("✅ Corrupted session removed successfully", "🧹", undefined, "SESSION_CLEANUP", "SUCCESS");
      
      // Also clean cache to be safe
      await cleanCache();
      logger.info("✅ Cache cleaned after session removal", "🧹", undefined, "SESSION_CLEANUP", "CACHE_CLEANED");
      
    } catch {
      logger.info("ℹ️ No session directory found, skipping cleanup", "🧹", undefined, "SESSION_CLEANUP", "NO_SESSION");
    }
    
  } catch (error) {
    logger.error(`❌ Failed to clean corrupted session: ${error}`, { error }, "SESSION_CLEANUP_ERROR", 1);
  }
}

// State management
let whatsappClient: Client | null = null;

/**
 * Initialize WhatsApp client with proper configuration
 * Now handles QR code management internally and waits for client to be ready
 */
export async function initializeWhatsAppClient(
  config: EnvironmentConfig,
  onQRGenerated?: (qr: string) => Promise<void>
): Promise<Client> {
  if (whatsappClient) {
    logger.info("WhatsApp client already initialized", "ℹ️");
    return whatsappClient;
  }

  try {
    logger.info("WHATSAPP CLIENT INITIALIZATION", "🚀");
    logger.info("WhatsApp state: browser_launching - Starting WhatsApp Web browser", "🤖", undefined, "WHATSAPP_STATUS", "BROWSER_LAUNCHING");
    
    // Clean old cache only if starting new session
    await cleanOldCacheOnNewSession();
    
    // Validate current cache integrity (but don't clean unless corrupted)
    await validateAndCleanCache();
    logger.logLifecycleStep("BROWSER_LAUNCHING");

    // Initialize QR code path internally
    initializeQRCodePath(config.BOT_ID);

    // Get pre-validated Puppeteer configuration (Chromium already validated in startup)
    const puppeteerOptions = puppeteerConfig.getConfiguration();

    // Log Puppeteer configuration details (Chromium path already shown in startup)
    logger.info(`Puppeteer config for ${process.platform}`, "⚙️");

    whatsappClient = new Client({
      authStrategy: new LocalAuth({
        clientId: config.BOT_ID,
        dataPath: config.SESSION_PATH,
      }),
      puppeteer: puppeteerOptions,
      webVersionCache: {
        type: "local",
        path: path.join(config.SESSION_PATH, '.wwebjs_cache')
      },
      // Memory optimization settings
      qrMaxRetries: 3,
      takeoverOnConflict: true,
    });

    // Create a promise that resolves when the client is ready
    const clientReadyPromise = new Promise<Client>((resolve, reject) => {
      // Enhanced state change handler with detailed sync monitoring
      whatsappClient!.on("change_state", (state) => {
        try {
          logger.info(`🔄 WhatsApp state transition: ${state}`, "🔄", undefined, "WHATSAPP_STATUS", state);
          
          // Detailed state transition logging
          switch (state) {
            case "CONFLICT":
              logger.warn("⚠️ WhatsApp Web conflict detected - Will attempt takeover", "⚠️");
              break;
            case "CONNECTED":
              logger.info("🌐 WhatsApp Web connected to servers", "🌐");
              logger.updateMetric("WHATSAPP_CONNECTIONS", 1);
              break;
            case "DEPRECATED_VERSION":
              logger.error("❌ WhatsApp Web version deprecated - Update required", {}, "VERSION_ERROR", 1);
              break;
            case "OPENING":
              logger.info("🚀 WhatsApp Web opening connection", "🚀");
              break;
            case "PAIRING":
              logger.info("📱 WhatsApp Web pairing mode - Ready for QR scan", "📱");
              logger.updateMetric("PAIRING_ATTEMPTS", 1);
              break;
            case "TIMEOUT":
              logger.warn("⏰ WhatsApp Web connection timeout", "⏰");
              break;
            case "UNPAIRED":
              logger.info("📱 WhatsApp Web unpaired - QR scan required", "📱");
              break;
            case "UNPAIRED_IDLE":
              logger.info("💤 WhatsApp Web unpaired idle state", "💤");
              break;
            default:
              logger.info(`🔄 Unknown WhatsApp state: ${state}`, "🔄");
          }
          
          // Handle specific problematic states
          if (state === "DEPRECATED_VERSION" || state === "TIMEOUT") {
            logger.error(`🚨 Problematic WhatsApp state detected: ${state}`, {
              state: state,
              timestamp: new Date().toISOString(),
              memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
            }, "WHATSAPP_STATE_ERROR", 1);
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

      // Enhanced loading screen handler with sync state monitoring
      whatsappClient!.on("loading_screen", (percent, message) => {
        try {
          // Only update to LOADING if we're not already READY
          if (!isWhatsAppReady) {
            const currentProgress = typeof percent === 'string' ? parseInt(percent) : percent;
            
            // Enhanced progress logging with sync phase detection
            let syncPhase = "INITIALIZING";
            if (currentProgress >= 0 && currentProgress < 30) {
              syncPhase = "CONNECTING";
            } else if (currentProgress >= 30 && currentProgress < 60) {
              syncPhase = "AUTHENTICATING";
            } else if (currentProgress >= 60 && currentProgress < 90) {
              syncPhase = "SYNCING_CHATS";
            } else if (currentProgress >= 90 && currentProgress < 100) {
              syncPhase = "FINALIZING_SYNC";
            }
            
            logger.info(`WhatsApp loading: ${currentProgress}% - ${message} [${syncPhase}]`, 
              "⏳", undefined, "WHATSAPP_STATUS", "LOADING");
            
            // Detailed logging for critical phases
            if (currentProgress >= 90) {
              logger.info(`🔄 Critical sync phase: ${currentProgress}% - Finalizing WhatsApp sync process`, 
                "🔄", undefined, "SYNC_CRITICAL", "FINALIZING");
            }
            
            // Check if progress is stuck with enhanced monitoring
            if (currentProgress === lastLoadingProgress) {
              stuckProgressCount++;
              
              // Progressive warnings for stuck sync
              if (stuckProgressCount === 10) {
                logger.warn(`⚠️ Sync potentially stuck at ${currentProgress}% for 10 updates`);
              } else if (stuckProgressCount === 20) {
                logger.warn(`🚨 Sync stuck at ${currentProgress}% for 20 updates - Monitoring closely`);
              } else if (stuckProgressCount > 30) {
                logger.error(`� CRITICAL: Sync completely stuck at ${currentProgress}% for ${stuckProgressCount} updates`, {
                  stuckAt: currentProgress,
                  phase: syncPhase,
                  duration: Math.round((Date.now() - loadingStartTime) / 1000),
                  memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
                }, "SYNC_STUCK", 1);
              }
            } else {
              // Progress resumed
              if (stuckProgressCount > 0) {
                logger.info(`✅ Sync resumed from ${lastLoadingProgress}% to ${currentProgress}% after ${stuckProgressCount} stuck updates`);
              }
              stuckProgressCount = 0;
              lastLoadingProgress = currentProgress;
            }
            
            // Enhanced timeout with phase-specific handling
            if (!loadingTimeout) {
              loadingTimeout = setTimeout(async () => {
                const loadingTime = Math.round((Date.now() - loadingStartTime) / 1000);
                logger.error(`🚨 SYNC TIMEOUT: Loading failed after ${loadingTime}s at ${currentProgress}% [${syncPhase}]`, {
                  loadingTimeSeconds: loadingTime,
                  lastProgress: currentProgress,
                  syncPhase: syncPhase,
                  stuckCount: stuckProgressCount,
                  sessionPath: path.join(process.cwd(), 'sessions'),
                  timestamp: new Date().toISOString(),
                  possibleCause: currentProgress >= 90 ? "WhatsApp sync finalization failure" : "Network or session corruption"
                }, "SYNC_FAILURE", 1);
                
                logger.logLifecycleStep("SYNC_TIMEOUT_CRASH");
                
                // Log detailed memory and system state
                const memUsage = process.memoryUsage();
                logger.info(`💾 System state at sync timeout: Heap ${Math.round(memUsage.heapUsed/1024/1024)}MB, RSS ${Math.round(memUsage.rss/1024/1024)}MB, Phase: ${syncPhase}`);
                
                // Progressive cleanup based on sync phase
                try {
                  const client = getWhatsAppClient();
                  
                  if (currentProgress >= 90) {
                    // Final phase failure - likely WhatsApp sync issue
                    logger.info("🔧 Final phase failure detected - Applying deep cleanup");
                    await cleanCache();
                    await cleanBrowserCache(client);
                    await cleanCorruptedSession();
                  } else {
                    // Early phase failure - lighter cleanup first
                    logger.info("🔧 Early phase failure detected - Applying cache cleanup");
                    await cleanCache();
                    if (client) {
                      await cleanBrowserCache(client);
                    }
                  }
                  
                  logger.info("🧹 Emergency cleanup completed for sync failure");
                } catch (cleanupError) {
                  logger.error(`❌ Emergency cleanup failed: ${cleanupError}`, {}, "CLEANUP_FAILED", 1);
                }
                
                logger.error(`🚨 FORCING RESTART: WhatsApp sync timeout in ${syncPhase} phase`, {}, "FORCED_RESTART", 1);
                process.exit(1);
                
              }, 4 * 60 * 1000); // Reduced to 4 minutes for faster recovery
            }
          } else {
            // Log post-ready loading events for debugging
            logger.info(`📊 Post-ready loading event: ${percent}% - ${message}`, "📊");
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
          logger.info("QR Code scanned successfully!", "📱", undefined, "QR_STATUS", "SCANNED");
          logger.info("WhatsApp authentication successful", "🤖", undefined, "WHATSAPP_STATUS", "AUTHENTICATED");
          logger.info("Processing session data and preparing connection", "🤖", undefined, "WHATSAPP_STATUS", "PROCESSING_SESSION");
          logger.logLifecycleStep("AUTHENTICATING");
          
          // Set a timeout for session processing (3 minutes max)
          const sessionTimeout = setTimeout(async () => {
            logger.error(`🚨 CRITICAL: Session processing timeout after 3 minutes`, {
              timestamp: new Date().toISOString(),
              phase: "PROCESSING_SESSION",
              memoryMB: Math.round(process.memoryUsage().heapUsed / 1024 / 1024)
            }, "SESSION_TIMEOUT", 1);
            
            logger.logLifecycleStep("SESSION_PROCESSING_TIMEOUT");
            
            // Clean corrupted session before restart
            try {
              await cleanCorruptedSession();
              logger.info("🧹 Corrupted session cleaned before restart");
            } catch (cleanError) {
              logger.error(`❌ Failed to clean session before restart: ${cleanError}`, {}, "SESSION_CLEANUP_ERROR", 1);
            }
            
            logger.error(`🚨 FORCING RESTART: Session processing stuck, likely sync failure`, {}, "FORCED_RESTART", 1);
            process.exit(1);
          }, 3 * 60 * 1000); // 3 minutes for session processing
          
          // Clear timeout when ready
          whatsappClient!.once("ready", () => {
            clearTimeout(sessionTimeout);
          });
          
          // Update authentication metrics
          logger.updateMetric("AUTH_SUCCESS", 1);
          logger.updateMetric("QR_SCANS", 1);
          
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
        
        // Clear loading timeout since we're now ready
        if (loadingTimeout) {
          clearTimeout(loadingTimeout);
          loadingTimeout = null;
          const totalLoadingTime = Math.round((Date.now() - loadingStartTime) / 1000);
          logger.info(`✅ Loading completed successfully in ${totalLoadingTime}s`);
        }
        
        logger.info("WhatsApp state: ready - WhatsApp client is ready", "🤖", undefined, "WHATSAPP_STATUS", "READY");
        logger.logLifecycleStep("READY");

        // Start monitoring browser metrics
        startBrowserMetricsMonitoring(() => getWhatsAppClient());
        
        // Start heap monitoring to prevent memory issues
        startHeapMonitoring();
        
        // Start zombie detection system
        startZombieDetection(() => getWhatsAppClient());
        
        // Start periodic cache maintenance
        startCacheMaintenance();

        // Initialize advanced sync monitoring
        whatsAppSyncMonitor.initialize(whatsappClient!);

        // Add enhanced sync monitoring events (available in whatsapp-web.js v1.32.0+)
        try {
          // Monitor for offline message synchronization progress
          await whatsappClient!.pupPage?.evaluate(() => {
            // WhatsApp Web internal objects interface
            interface WhatsAppWindow extends Window {
              Store?: {
                AuthStore?: {
                  Cmd?: {
                    on: (event: string, callback: () => void) => void;
                  };
                  OfflineMessageHandler?: {
                    getOfflineDeliveryProgress?: () => number;
                  };
                  AppState?: {
                    on: (event: string, callback: () => void) => void;
                    hasSynced?: boolean;
                  };
                };
                Conn?: {
                  on: (event: string, callback: (state: string) => void) => void;
                };
              };
            }
            
            const windowWithStore = window as WhatsAppWindow;
            
            if (windowWithStore.Store?.AuthStore?.Cmd?.on) {
              windowWithStore.Store.AuthStore.Cmd.on('offline_progress_update', () => {
                const progress = windowWithStore.Store?.AuthStore?.OfflineMessageHandler?.getOfflineDeliveryProgress?.();
                if (progress !== undefined) {
                  console.log(`[WhatsApp-Sync] Offline message sync progress: ${progress}%`);
                }
              });
            }
            
            // Monitor for sync completion
            if (windowWithStore.Store?.AuthStore?.AppState?.on) {
              windowWithStore.Store.AuthStore.AppState.on('change:hasSynced', () => {
                const hasSynced = windowWithStore.Store?.AuthStore?.AppState?.hasSynced;
                console.log(`[WhatsApp-Sync] Sync state changed: ${hasSynced ? 'SYNCED' : 'NOT_SYNCED'}`);
              });
            }
            
            // Add state monitoring for connection quality
            if (windowWithStore.Store?.Conn?.on) {
              windowWithStore.Store.Conn.on('change:state', (state: string) => {
                console.log(`[WhatsApp-Connection] Connection state: ${state}`);
              });
            }
            
            return true;
          });
          
          logger.info("🔍 Enhanced sync monitoring activated", "🔍");
        } catch (error) {
          logger.warn(`⚠️ Enhanced sync monitoring setup failed: ${error}`);
        }

        // Connect modern client to route exporter
        setClient(whatsappClient);

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
