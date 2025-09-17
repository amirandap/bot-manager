/**
 * CacheManager - Gestión centralizada del cache de WhatsApp Web
 * Maneja un cache universal compartido entre todos los bots
 */

import * as fs from "fs";
import * as path from "path";
import { logger } from "./LoggerService";

export class CacheManager {
  private static instance: CacheManager;
  private readonly UNIVERSAL_CACHE_PATH: string;
  private readonly CACHE_LOCK_FILE: string;

  private constructor() {
    // Cache universal en el directorio raíz de datos
    this.UNIVERSAL_CACHE_PATH = path.join("/home/linuxuser/bot-manager/data", "universal-whatsapp-cache");
    this.CACHE_LOCK_FILE = path.join(this.UNIVERSAL_CACHE_PATH, ".cache.lock");
    this.ensureCacheDirectory();
  }

  public static getInstance(): CacheManager {
    if (!CacheManager.instance) {
      CacheManager.instance = new CacheManager();
    }
    return CacheManager.instance;
  }

  /**
   * Obtiene la ruta del cache universal para todos los bots
   */
  public getUniversalCachePath(): string {
    return this.UNIVERSAL_CACHE_PATH;
  }

  /**
   * Limpia el cache universal cuando se detectan problemas
   */
  public async cleanUniversalCache(reason: string = "Manual cleanup"): Promise<void> {
    try {
      logger.info(`🧹 Iniciando limpieza del cache universal. Razón: ${reason}`);
      
      // Verificar si hay lock file (otro proceso usando el cache)
      if (await this.isCacheLocked()) {
        logger.warn("⚠️ Cache está siendo usado por otro proceso, esperando...");
        await this.waitForCacheUnlock();
      }

      // Crear lock file
      await this.createCacheLock();

      if (fs.existsSync(this.UNIVERSAL_CACHE_PATH)) {
        // Limpiar todo el contenido del cache
        const files = fs.readdirSync(this.UNIVERSAL_CACHE_PATH);
        let cleanedFiles = 0;

        for (const file of files) {
          if (file === ".cache.lock") continue; // No borrar el lock file
          
          const filePath = path.join(this.UNIVERSAL_CACHE_PATH, file);
          try {
            if (fs.statSync(filePath).isDirectory()) {
              fs.rmSync(filePath, { recursive: true, force: true });
            } else {
              fs.unlinkSync(filePath);
            }
            cleanedFiles++;
          } catch (error) {
            logger.warn(`No se pudo limpiar ${filePath}: ${error}`);
          }
        }

        logger.info(`✅ Cache universal limpiado: ${cleanedFiles} archivos/directorios eliminados`);
      } else {
        logger.info("📁 Cache universal no existía, creando directorio limpio");
      }

      // Recrear directorio limpio
      this.ensureCacheDirectory();

    } catch (error) {
      logger.error(`❌ Error limpiando cache universal: ${error}`, {}, "ERRORS", 1);
      throw error;
    } finally {
      // Siempre liberar el lock
      await this.releaseCacheLock();
    }
  }

  /**
   * Detecta si el cache está corrupto o en mal estado
   */
  public async isCacheCorrupted(): Promise<boolean> {
    try {
      if (!fs.existsSync(this.UNIVERSAL_CACHE_PATH)) {
        return false; // No corrupto, simplemente no existe
      }

      // Verificar si hay archivos de lock antiguos (más de 10 minutos)
      if (fs.existsSync(this.CACHE_LOCK_FILE)) {
        const lockStats = fs.statSync(this.CACHE_LOCK_FILE);
        const lockAge = Date.now() - lockStats.mtime.getTime();
        if (lockAge > 10 * 60 * 1000) { // 10 minutos
          logger.warn("🔒 Lock file antiguo detectado, posible cache corrupto");
          return true;
        }
      }

      // Verificar integridad de archivos importantes del cache
      const criticalPaths = [
        path.join(this.UNIVERSAL_CACHE_PATH, "Default"),
        path.join(this.UNIVERSAL_CACHE_PATH, "Default/IndexedDB"),
      ];

      for (const criticalPath of criticalPaths) {
        if (fs.existsSync(criticalPath)) {
          try {
            // Intentar leer el directorio para verificar permisos
            fs.readdirSync(criticalPath);
          } catch {
            logger.warn(`🚨 Cache corrupto detectado en: ${criticalPath}`);
            return true;
          }
        }
      }

      return false;
    } catch (error) {
      logger.error(`Error verificando integridad del cache: ${error}`);
      return true; // Asumir corrupto en caso de error
    }
  }

  /**
   * Gestión automática del cache antes de inicializar un bot
   */
  public async prepareCache(botId: string): Promise<void> {
    logger.info(`🔧 Preparando cache universal para bot ${botId}`);

    // Verificar si el cache está corrupto
    if (await this.isCacheCorrupted()) {
      logger.warn(`⚠️ Cache corrupto detectado, limpiando para bot ${botId}`);
      await this.cleanUniversalCache(`Cache corrupto detectado para bot ${botId}`);
    }

    // Asegurar que el directorio existe
    this.ensureCacheDirectory();

    logger.info(`✅ Cache universal preparado para bot ${botId}`);
  }

  /**
   * Obtiene estadísticas del cache
   */
  public getCacheStats(): { exists: boolean; size: number; files: number } {
    try {
      if (!fs.existsSync(this.UNIVERSAL_CACHE_PATH)) {
        return { exists: false, size: 0, files: 0 };
      }

      let totalSize = 0;
      let totalFiles = 0;

      const calculateSize = (dirPath: string): void => {
        const files = fs.readdirSync(dirPath);
        for (const file of files) {
          const filePath = path.join(dirPath, file);
          const stats = fs.statSync(filePath);
          if (stats.isDirectory()) {
            calculateSize(filePath);
          } else {
            totalSize += stats.size;
            totalFiles++;
          }
        }
      };

      calculateSize(this.UNIVERSAL_CACHE_PATH);

      return {
        exists: true,
        size: totalSize,
        files: totalFiles
      };
    } catch (error) {
      logger.error(`Error obteniendo estadísticas del cache: ${error}`);
      return { exists: false, size: 0, files: 0 };
    }
  }

  // Métodos privados para gestión de locks

  private async isCacheLocked(): Promise<boolean> {
    return fs.existsSync(this.CACHE_LOCK_FILE);
  }

  private async createCacheLock(): Promise<void> {
    const lockData = {
      pid: process.pid,
      timestamp: new Date().toISOString(),
      botId: process.env.BOT_ID || "unknown"
    };
    fs.writeFileSync(this.CACHE_LOCK_FILE, JSON.stringify(lockData, null, 2));
  }

  private async releaseCacheLock(): Promise<void> {
    if (fs.existsSync(this.CACHE_LOCK_FILE)) {
      fs.unlinkSync(this.CACHE_LOCK_FILE);
    }
  }

  private async waitForCacheUnlock(maxWaitMs: number = 30000): Promise<void> {
    const startTime = Date.now();
    while (await this.isCacheLocked() && (Date.now() - startTime) < maxWaitMs) {
      await new Promise(resolve => setTimeout(resolve, 1000)); // Esperar 1 segundo
    }
    
    if (await this.isCacheLocked()) {
      logger.warn("⚠️ Timeout esperando liberación del cache, forzando limpieza");
      await this.releaseCacheLock();
    }
  }

  private ensureCacheDirectory(): void {
    if (!fs.existsSync(this.UNIVERSAL_CACHE_PATH)) {
      fs.mkdirSync(this.UNIVERSAL_CACHE_PATH, { recursive: true });
      logger.info(`📁 Directorio de cache universal creado: ${this.UNIVERSAL_CACHE_PATH}`);
    }
  }
}

// Exportar instancia singleton
export const cacheManager = CacheManager.getInstance();