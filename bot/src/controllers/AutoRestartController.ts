/**
 * QR Code Auto-Restart Controller
 * 
 * Este controlador monitorea y gestiona el ciclo de vida del QR code,
 * implementando un sistema de auto-reinicio cuando se detecta que
 * WhatsApp alcanza el máximo de intentos de generación de QR.
 * Incluye limpieza automática del cache universal cuando es necesario.
 * 
 * NUEVA LÓGICA INTELIGENTE:
 * - Si no hay sesión guardada: permite QR infinitos (primera vez)
 * - Si hay sesión pero falla: limpia cache y reintenta
 * - Si sigue fallando después de limpiar: entonces reinicia
 */

import { logger } from "../services/LoggerService";
import { cacheManager } from "../services/CacheManager";
import { sessionStateDetector } from "../services/SessionStateDetector";
import { SessionState } from "../types/services";

/**
 * Clase que implementa un sistema de auto-reinicio para cuando los QR codes fallan
 */
export class AutoRestartController {
  private static instance: AutoRestartController;
  private qrGenerationCount: number = 0;
  private lastQrTimestamp: number = 0;
  private maxQrRetries: number = 10; // Aumentado para lógica inteligente
  private qrFailureDetected: boolean = false;
  private monitorInterval: NodeJS.Timeout | null = null;
  private restartScheduled: boolean = false;
  
  // Nuevas propiedades para lógica inteligente
  private currentSessionState: SessionState | null = null;
  private sessionPath: string | null = null;
  private botId: string | null = null;
  private cacheCleanupAttempted: boolean = false;
  private sessionCleanupAttempted: boolean = false;

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
   * Inicializar el contexto de sesión para la lógica inteligente
   */
  public initializeSessionContext(sessionPath: string, botId: string): void {
    this.sessionPath = sessionPath;
    this.botId = botId;
    this.currentSessionState = sessionStateDetector.detectSessionState(sessionPath, botId);
    
    logger.info(`🔍 Contexto de sesión inicializado para bot ${botId}:`);
    logger.info(`   📁 Ruta: ${sessionPath}`);
    logger.info(`   🆕 Primera vez: ${this.currentSessionState.isFirstTime}`);
    logger.info(`   💾 Sesión existente: ${this.currentSessionState.hasExistingSession}`);
    logger.info(`   ⚠️ Sesión corrupta: ${this.currentSessionState.isSessionCorrupted}`);
    
    if (this.currentSessionState.hasExistingSession) {
      const stats = sessionStateDetector.getSessionStats(sessionPath);
      logger.info(`   📊 Archivos: ${stats.files}, Tamaño: ${(stats.size / 1024).toFixed(1)}KB, Edad: ${stats.age || 0} días`);
    }
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
   * NUEVA LÓGICA INTELIGENTE: Decide qué hacer basado en el estado de la sesión
   */
  public registerQrFailure(reason: string): void {
    logger.error(`❌ QR failure detected: ${reason}`, {}, "ERRORS", 1);
    this.qrFailureDetected = true;
    
    // Verificar contexto de sesión
    if (!this.currentSessionState || !this.sessionPath || !this.botId) {
      logger.warn("⚠️ Contexto de sesión no inicializado, usando lógica legacy");
      this.scheduleRestart();
      return;
    }

    // DECISIÓN INTELIGENTE basada en el estado de la sesión
    this.handleQrFailureIntelligently(reason);
  }

  /**
   * Maneja el fallo de QR de manera inteligente basado en el contexto
   */
  private async handleQrFailureIntelligently(reason: string): Promise<void> {
    try {
      // CASO 1: Primera vez (no hay sesión) - Permitir QR infinitos
      if (this.currentSessionState!.isFirstTime || !this.currentSessionState!.hasExistingSession) {
        logger.info("🆕 Primera configuración detectada - Permitiendo QR infinitos");
        logger.info("💡 El bot esperará indefinidamente hasta que escanees el QR");
        
        // Resetear contadores para permitir más intentos
        this.resetCountersForInfiniteQr();
        return;
      }

      // CASO 2: Hay sesión pero está corrupta - Limpiar y reintentar
      if (this.currentSessionState!.isSessionCorrupted && !this.sessionCleanupAttempted) {
        logger.warn("🧹 Sesión corrupta detectada - Limpiando sesión y reintentando");
        await this.cleanupSessionAndRetry();
        return;
      }

      // CASO 3: Sesión limpia pero cache podría estar mal - Limpiar cache y reintentar
      if (!this.cacheCleanupAttempted) {
        logger.warn("🗂️ Limpiando cache universal y reintentando");
        await this.cleanupCacheAndRetry();
        return;
      }

      // CASO 4: Todo lo demás falló - Reiniciar como último recurso
      logger.error("🚨 Todos los intentos de recuperación fallaron - Reiniciando bot", {}, "ERRORS", 1);
      this.scheduleRestart();

    } catch (error) {
      logger.error(`Error en manejo inteligente de fallo QR: ${error}`, {}, "ERRORS", 1);
      this.scheduleRestart();
    }
  }

  /**
   * Resetea contadores para permitir QR infinitos en primera configuración
   */
  private resetCountersForInfiniteQr(): void {
    this.qrGenerationCount = 0;
    this.qrFailureDetected = false;
    this.lastQrTimestamp = Date.now();
    logger.info("🔄 Contadores reseteados - QR infinitos habilitados para primera configuración");
  }

  /**
   * Limpia la sesión corrupta y permite reintentar
   */
  private async cleanupSessionAndRetry(): Promise<void> {
    try {
      this.sessionCleanupAttempted = true;
      
      await sessionStateDetector.cleanCorruptedSession(this.sessionPath!, this.botId!);
      
      // Actualizar estado de sesión después de la limpieza
      this.currentSessionState = sessionStateDetector.detectSessionState(this.sessionPath!, this.botId!);
      
      // Resetear para permitir nuevos intentos
      this.resetCountersForInfiniteQr();
      
      logger.info("✅ Sesión limpiada - El bot puede generar QR nuevamente");
      
    } catch (error) {
      logger.error(`Error limpiando sesión: ${error}`, {}, "ERRORS", 1);
      this.scheduleRestart();
    }
  }

  /**
   * Limpia el cache universal y permite reintentar
   */
  private async cleanupCacheAndRetry(): Promise<void> {
    try {
      this.cacheCleanupAttempted = true;
      
      await cacheManager.cleanUniversalCache("Fallo de QR con sesión existente");
      
      // Resetear contadores para permitir nuevos intentos
      this.resetCountersForInfiniteQr();
      
      logger.info("✅ Cache universal limpiado - El bot puede generar QR nuevamente");
      
    } catch (error) {
      logger.error(`Error limpiando cache: ${error}`, {}, "ERRORS", 1);
      this.scheduleRestart();
    }
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
    setTimeout(async () => {
      logger.info("🔄 Executing controlled restart now");
      
      // Verificar y limpiar cache si está corrupto antes del reinicio
      try {
        if (await cacheManager.isCacheCorrupted()) {
          logger.warn("🧹 Cache corrupto detectado antes del reinicio, limpiando...");
          await cacheManager.cleanUniversalCache("Cache corrupto antes de reinicio por QR");
        }
      } catch (error) {
        logger.error(`Error durante limpieza de cache en reinicio: ${error}`);
      }
      
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
    this.cacheCleanupAttempted = false;
    this.sessionCleanupAttempted = false;
    this.restartScheduled = false;
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

  /**
   * Forzar limpieza del cache universal en casos críticos
   */
  public async forceCacheCleanup(reason: string = "Manual cleanup"): Promise<void> {
    try {
      logger.info(`🧹 Forzando limpieza del cache universal. Razón: ${reason}`);
      await cacheManager.cleanUniversalCache(reason);
      
      // Resetear contadores después de limpieza forzada
      this.resetCounters();
      this.restartScheduled = false;
      
      logger.info("✅ Limpieza forzada del cache completada");
    } catch (error) {
      logger.error(`❌ Error en limpieza forzada del cache: ${error}`, {}, "ERRORS", 1);
      throw error;
    }
  }

  /**
   * Obtener estadísticas del cache para debugging
   */
  public getCacheInfo(): { exists: boolean; size: number; files: number } {
    return cacheManager.getCacheStats();
  }
}

// Exportar una instancia lista para usar
export const qrAutoRestartController = AutoRestartController.getInstance();
