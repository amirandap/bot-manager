/**
 * Notification Settings Controller
 * Manages WhatsApp notification interference settings
 */

import { Request, Response } from "express";
import { logger } from "../services/LoggerService";
import { 
  configureNotificationSettings, 
  applyPhoneFriendlySettings, 
  applyBotOptimizedSettings,
  getWhatsAppClient 
} from "../utils/whatsAppUtils";

/**
 * Get current notification settings status
 */
export const getNotificationSettings = async (req: Request, res: Response): Promise<void> => {
  try {
    const client = getWhatsAppClient();
    
    if (!client) {
      res.status(503).json({
        success: false,
        error: "WhatsApp client not available"
      });
      return;
    }

    // Note: WhatsApp Web.js doesn't provide getters for these settings
    // So we return the last known configuration state
    res.json({
      success: true,
      data: {
        status: "configured",
        message: "Configuración actual no disponible para consulta directa",
        note: "whatsapp-web.js no proporciona métodos getter para estos ajustes",
        availableActions: [
          "apply-phone-friendly",
          "apply-bot-optimized", 
          "configure-custom"
        ]
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error getting notification settings: ${errorMessage}`);
    
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
};

/**
 * Apply phone-friendly settings (recommended for normal usage)
 */
export const applyPhoneFriendlyConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    await applyPhoneFriendlySettings();
    
    logger.info("📱 Phone-friendly settings applied via API");
    
    res.json({
      success: true,
      data: {
        message: "Configuración amigable para teléfono aplicada",
        settings: {
          backgroundSync: false,
          presenceAvailable: false,
          autoDownloadMedia: false
        },
        effect: "Las notificaciones deberían llegar normalmente al teléfono"
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error applying phone-friendly settings: ${errorMessage}`);
    
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
};

/**
 * Apply bot-optimized settings (maximum performance)
 */
export const applyBotOptimizedConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    await applyBotOptimizedSettings();
    
    logger.info("🤖 Bot-optimized settings applied via API");
    
    res.json({
      success: true,
      data: {
        message: "Configuración optimizada para bot aplicada",
        settings: {
          backgroundSync: true,
          presenceAvailable: true,
          autoDownloadMedia: true
        },
        effect: "Máximo rendimiento del bot, puede interferir con notificaciones del teléfono"
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error applying bot-optimized settings: ${errorMessage}`);
    
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
};

/**
 * Apply custom notification settings
 */
export const applyCustomConfig = async (req: Request, res: Response): Promise<void> => {
  try {
    const { backgroundSync, presenceAvailable, autoDownloadMedia } = req.body;
    
    // Validate input
    const options: { [key: string]: boolean } = {};
    
    if (typeof backgroundSync === 'boolean') {
      options.backgroundSync = backgroundSync;
    }
    
    if (typeof presenceAvailable === 'boolean') {
      options.presenceAvailable = presenceAvailable;
    }
    
    if (typeof autoDownloadMedia === 'boolean') {
      options.autoDownloadMedia = autoDownloadMedia;
    }
    
    if (Object.keys(options).length === 0) {
      res.status(400).json({
        success: false,
        error: "No se proporcionaron configuraciones válidas",
        validOptions: {
          backgroundSync: "boolean - Control de sincronización de fondo",
          presenceAvailable: "boolean - Estado de presencia",
          autoDownloadMedia: "boolean - Descarga automática de medios"
        }
      });
      return;
    }
    
    await configureNotificationSettings(options);
    
    logger.info(`🔧 Custom notification settings applied: ${JSON.stringify(options)}`);
    
    res.json({
      success: true,
      data: {
        message: "Configuración personalizada aplicada",
        settings: options,
        effect: "Configuración aplicada según los parámetros especificados"
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error applying custom settings: ${errorMessage}`);
    
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
};

/**
 * Get browser information and User Agent details
 */
export const getBrowserInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    const client = getWhatsAppClient();
    
    if (!client || !client.pupPage) {
      res.status(503).json({
        success: false,
        error: "WhatsApp client or browser page not available"
      });
      return;
    }

    const browserInfo = await client.pupPage.evaluate(() => {
      return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        appVersion: navigator.appVersion,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine,
        oscpu: (navigator as any).oscpu || 'N/A',
        vendor: navigator.vendor || 'N/A'
      };
    });
    
    const isLinux = browserInfo.platform.includes('Linux') || browserInfo.userAgent.includes('Linux');
    
    res.json({
      success: true,
      data: {
        browserInfo,
        analysis: {
          appearsAsLinux: isLinux,
          platformDetected: browserInfo.platform,
          osFromUserAgent: browserInfo.userAgent.includes('Windows') ? 'Windows' : 
                          browserInfo.userAgent.includes('Mac') ? 'macOS' : 
                          browserInfo.userAgent.includes('Linux') ? 'Linux' : 'Unknown'
        },
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error getting browser info: ${errorMessage}`);
    
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
};

/**
 * Configure browser to present as Linux
 */
export const configureAsLinux = async (req: Request, res: Response): Promise<void> => {
  try {
    const client = getWhatsAppClient();
    
    if (!client || !client.pupPage) {
      res.status(503).json({
        success: false,
        error: "WhatsApp client or browser page not available"
      });
      return;
    }

    const linuxUserAgent = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

    // Set user agent
    await client.pupPage.setUserAgent(linuxUserAgent);
    
    // Override navigator properties
    await client.pupPage.evaluate(() => {
      Object.defineProperty(navigator, 'platform', {
        get: () => 'Linux x86_64'
      });
      
      Object.defineProperty(navigator, 'appVersion', {
        get: () => '5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
      });
      
      Object.defineProperty(navigator, 'userAgent', {
        get: () => 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'
      });
      
      Object.defineProperty(navigator, 'oscpu', {
        get: () => 'Linux x86_64'
      });
    });
    
    // Verify the configuration
    const verificationInfo = await client.pupPage.evaluate(() => {
      return {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        appVersion: navigator.appVersion
      };
    });
    
    logger.info("🐧 Browser configured to present as Linux via API");
    
    res.json({
      success: true,
      data: {
        message: "Navegador configurado para presentarse como Linux",
        previousConfig: "Configuración anterior sobrescrita",
        newConfig: {
          userAgent: linuxUserAgent,
          platform: "Linux x86_64"
        },
        verification: verificationInfo,
        effect: "El bot ahora se presenta como un navegador corriendo en Linux"
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error configuring Linux user agent: ${errorMessage}`);
    
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
};

/**
 * Get notification configuration info and recommendations
 */
export const getNotificationInfo = async (req: Request, res: Response): Promise<void> => {
  try {
    res.json({
      success: true,
      data: {
        problem: "El bot puede interferir con las notificaciones del teléfono",
        cause: "WhatsApp detecta que el bot ha recibido los mensajes y no envía notificaciones al teléfono",
        solutions: {
          phoneFriendly: {
            description: "Configuración amigable para teléfono",
            settings: {
              backgroundSync: false,
              presenceAvailable: false,
              autoDownloadMedia: false
            },
            effect: "Minimiza la interferencia con notificaciones del teléfono",
            endpoint: "/api/notifications/apply-phone-friendly"
          },
          botOptimized: {
            description: "Configuración optimizada para bot",
            settings: {
              backgroundSync: true,
              presenceAvailable: true,
              autoDownloadMedia: true
            },
            effect: "Máximo rendimiento del bot, puede interferir con notificaciones",
            endpoint: "/api/notifications/apply-bot-optimized"
          },
          custom: {
            description: "Configuración personalizada",
            method: "POST",
            endpoint: "/api/notifications/configure",
            body: {
              backgroundSync: "boolean (opcional)",
              presenceAvailable: "boolean (opcional)",
              autoDownloadMedia: "boolean (opcional)"
            }
          }
        },
        recommendation: "Usar 'phone-friendly' para uso normal, 'bot-optimized' solo cuando necesites máximo rendimiento"
      }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error(`Error getting notification info: ${errorMessage}`);
    
    res.status(500).json({
      success: false,
      error: errorMessage
    });
  }
};