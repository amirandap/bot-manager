/**
 * QR Code Auto-Restart Controller
 * 
 * Este controlador monitorea y gestiona el ciclo de vida del QR code,
 * implementando un sistema de auto-reinicio cuando se detecta que
 * WhatsApp alcanza el máximo de intentos de generación de QR.
 */

import { logger } from "../services/LoggerService";

/**
 * Clase que implementa un sistema de auto-reinicio para cuando los QR codes fallan
 */
export class AutoRestartController {
  private static instance: AutoRestartController;
  private qrGenerationCount: number = 0;
  private lastQrTimestamp: number = 0;
  private maxQrRetries: number = 5;
  private qrFailureDetected: boolean = false;
  private monitorInterval: NodeJS.Timeout | null = null;
  private restartScheduled: boolean = false;

  private constructor() {
    // Constructor privado para singleton
  }

  /**
   * Obtener la instancia única del controlador
   */
  public static getInstance(): AutoRestartController {
    if (!AutoRestartController.instance) {
      AutoRestartController.instance = new AutoRestartController();
    }
    return AutoRestartController.instance;
  }

  /**
   * Iniciar el monitoreo del estado de QR
   */
  public startMonitoring(): void {
    logger.info("🔄 QR auto-restart controller initialized", "🤖");

    // Monitorear cada 30 segundos
    this.monitorInterval = setInterval(() => this.checkQrHealth(), 30000);
  }

  /**
   * Registrar un nuevo intento de generación de QR
   */
  public registerQrGeneration(): void {
    this.qrGenerationCount++;
    this.lastQrTimestamp = Date.now();

    logger.info(`QR generation attempt #${this.qrGenerationCount}`, "🔢");
    
    // Si superamos el 75% del límite, advertir
    if (this.qrGenerationCount >= Math.floor(this.maxQrRetries * 0.75)) {
      logger.warn(`⚠️ QR generation count is high: ${this.qrGenerationCount}/${this.maxQrRetries}`);
    }
  }

  /**
   * Registrar un escaneo exitoso de QR
   */
  public registerQrSuccess(): void {
    logger.info(`✅ QR scan successful after ${this.qrGenerationCount} attempts`, "🔢");
    this.resetCounters();
  }

  /**
   * Registrar un fallo explícito de QR (Max retries reached)
   */
  public registerQrFailure(reason: string): void {
    logger.error(`❌ QR failure detected: ${reason}`, {}, "ERRORS", 1);
    this.qrFailureDetected = true;
    
    // Iniciar proceso de reinicio controlado
    this.scheduleRestart();
  }

  /**
   * Verificar el estado de salud del sistema de QR
   */
  private checkQrHealth(): void {
    try {
      const currentTime = Date.now();
      const minutesSinceLastQr = (currentTime - this.lastQrTimestamp) / (1000 * 60);
      
      // Si tenemos muchos intentos de QR y no hay actividad reciente (5+ minutos)
      if (this.qrGenerationCount >= this.maxQrRetries && minutesSinceLastQr >= 5) {
        logger.warn(`⚠️ QR system may be stuck: ${this.qrGenerationCount} generations, last activity ${Math.round(minutesSinceLastQr)} minutes ago`);
        
        // Si no tenemos un reinicio ya programado, programarlo
        if (!this.restartScheduled) {
          logger.error("🔄 QR system detected as stuck - scheduling restart", {}, "ERRORS", 1);
          this.scheduleRestart();
        }
      }
      
      // Si se detectó fallo explícito de QR, iniciar reinicio
      if (this.qrFailureDetected && !this.restartScheduled) {
        this.scheduleRestart();
      }
      
    } catch (error) {
      logger.error(`Error in QR health check: ${error}`, {}, "ERRORS", 1);
    }
  }

  /**
   * Programar un reinicio controlado del proceso
   */
  private scheduleRestart(): void {
    if (this.restartScheduled) {
      return; // Evitar múltiples reinicios
    }
    
    this.restartScheduled = true;
    logger.warn("🔄 Scheduling controlled restart due to QR issues...");
    
    // Dar tiempo para completar operaciones pendientes
    setTimeout(() => {
      logger.info("🔄 Executing controlled restart now");
      
      // Limpiar intervalos
      if (this.monitorInterval) {
        clearInterval(this.monitorInterval);
      }
      
      // Reiniciar el proceso - PM2 lo gestionará
      process.exit(0);
    }, 5000); // 5 segundos de delay para limpieza
  }

  /**
   * Resetear contadores después de una autenticación exitosa
   */
  private resetCounters(): void {
    this.qrGenerationCount = 0;
    this.qrFailureDetected = false;
    this.lastQrTimestamp = Date.now();
    logger.info("🔄 QR counters reset after successful authentication", "🤖");
  }

  /**
   * Detener el monitoreo (para cierre controlado)
   */
  public stopMonitoring(): void {
    if (this.monitorInterval) {
      clearInterval(this.monitorInterval);
      this.monitorInterval = null;
    }
  }
}

// Exportar una instancia lista para usar
export const qrAutoRestartController = AutoRestartController.getInstance();
