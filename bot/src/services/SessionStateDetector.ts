/**
 * SessionStateDetector - Detecta el estado de la sesión para tomar decisiones inteligentes
 * sobre cuándo permitir QR infinitos vs cuándo reiniciar
 */

import * as fs from "fs";
import * as path from "path";
import { logger } from "./LoggerService";
import { SessionState } from "../types/services";

export class SessionStateDetector {
  private static instance: SessionStateDetector;

  private constructor() {}

  public static getInstance(): SessionStateDetector {
    if (!SessionStateDetector.instance) {
      SessionStateDetector.instance = new SessionStateDetector();
    }
    return SessionStateDetector.instance;
  }

  /**
   * Detecta el estado completo de la sesión para un bot
   */
  public detectSessionState(sessionPath: string, botId: string): SessionState {
    try {
      logger.info(`🔍 Detectando estado de sesión para bot ${botId}`, "🔍");
      
      const sessionExists = fs.existsSync(sessionPath);
      
      if (!sessionExists) {
        logger.info("📋 No hay directorio de sesión - Primera configuración detectada");
        return {
          hasExistingSession: false,
          sessionPath,
          sessionFiles: [],
          isFirstTime: true,
          isSessionCorrupted: false
        };
      }

      // Leer contenido del directorio de sesión
      const sessionFiles = this.getSessionFiles(sessionPath);
      const hasSessionFiles = sessionFiles.length > 0;
      
      if (!hasSessionFiles) {
        logger.info("📋 Directorio de sesión vacío - Primera configuración detectada");
        return {
          hasExistingSession: false,
          sessionPath,
          sessionFiles: [],
          isFirstTime: true,
          isSessionCorrupted: false
        };
      }

      // Analizar archivos de sesión existentes
      const sessionTimestamp = this.getLatestSessionTimestamp(sessionPath, sessionFiles);
      const isCorrupted = this.checkSessionCorruption(sessionPath, sessionFiles);

      const state: SessionState = {
        hasExistingSession: true,
        sessionPath,
        lastSessionTimestamp: sessionTimestamp,
        sessionFiles,
        isFirstTime: false,
        isSessionCorrupted: isCorrupted
      };

      if (isCorrupted) {
        logger.warn("⚠️ Sesión corrupta detectada");
      } else {
        logger.info(`✅ Sesión válida detectada (${sessionFiles.length} archivos, última modificación: ${sessionTimestamp?.toISOString()})`);
      }

      return state;

    } catch (error) {
      logger.error(`Error detectando estado de sesión: ${error}`);
      return {
        hasExistingSession: false,
        sessionPath,
        sessionFiles: [],
        isFirstTime: true,
        isSessionCorrupted: false
      };
    }
  }

  /**
   * Obtiene la lista de archivos de sesión
   */
  private getSessionFiles(sessionPath: string): string[] {
    try {
      const allFiles = fs.readdirSync(sessionPath, { recursive: true });
      
      // Filtrar solo archivos importantes de sesión
      return allFiles
        .filter(file => typeof file === 'string')
        .filter(file => {
          return file.includes('session') || 
                 file.includes('.json') || 
                 file.includes('Default') ||
                 file.includes('Local Storage') ||
                 file.includes('IndexedDB');
        })
        .map(file => file.toString());
    } catch (error) {
      logger.warn(`Error leyendo archivos de sesión: ${error}`);
      return [];
    }
  }

  /**
   * Obtiene el timestamp del archivo de sesión más reciente
   */
  private getLatestSessionTimestamp(sessionPath: string, sessionFiles: string[]): Date | undefined {
    try {
      let latestTimestamp: Date | undefined;

      for (const file of sessionFiles) {
        const filePath = path.join(sessionPath, file);
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          if (!latestTimestamp || stats.mtime > latestTimestamp) {
            latestTimestamp = stats.mtime;
          }
        }
      }

      return latestTimestamp;
    } catch (error) {
      logger.warn(`Error obteniendo timestamp de sesión: ${error}`);
      return undefined;
    }
  }

  /**
   * Verifica si la sesión está corrupta
   */
  private checkSessionCorruption(sessionPath: string, sessionFiles: string[]): boolean {
    try {
      // Verificar archivos críticos
      const criticalFiles = sessionFiles.filter(file => 
        file.includes('session') || file.includes('Local Storage')
      );

      if (criticalFiles.length === 0) {
        return true; // No hay archivos críticos
      }

      // Verificar integridad de archivos críticos
      for (const file of criticalFiles) {
        const filePath = path.join(sessionPath, file);
        try {
          if (fs.existsSync(filePath)) {
            const stats = fs.statSync(filePath);
            
            // Archivo vacío o muy pequeño
            if (stats.size < 100) {
              logger.warn(`Archivo de sesión muy pequeño: ${file} (${stats.size} bytes)`);
              return true;
            }

            // Archivo muy antiguo (más de 30 días)
            const daysSinceModified = (Date.now() - stats.mtime.getTime()) / (1000 * 60 * 60 * 24);
            if (daysSinceModified > 30) {
              logger.warn(`Archivo de sesión muy antiguo: ${file} (${daysSinceModified.toFixed(1)} días)`);
              return true;
            }
          }
        } catch (error) {
          logger.warn(`Error verificando archivo ${file}: ${error}`);
          return true;
        }
      }

      return false; // Sesión parece válida
    } catch (error) {
      logger.error(`Error verificando corrupción de sesión: ${error}`);
      return true; // Asumir corrupta en caso de error
    }
  }

  /**
   * Limpia una sesión corrupta
   */
  public async cleanCorruptedSession(sessionPath: string, botId: string): Promise<void> {
    try {
      logger.info(`🧹 Limpiando sesión corrupta para bot ${botId}`);
      
      if (fs.existsSync(sessionPath)) {
        const files = fs.readdirSync(sessionPath);
        let cleanedFiles = 0;

        for (const file of files) {
          const filePath = path.join(sessionPath, file);
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

        logger.info(`✅ Sesión limpiada: ${cleanedFiles} archivos/directorios eliminados`);
      }

      // Recrear directorio limpio
      if (!fs.existsSync(sessionPath)) {
        fs.mkdirSync(sessionPath, { recursive: true });
      }

    } catch (error) {
      logger.error(`❌ Error limpiando sesión corrupta: ${error}`);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de la sesión
   */
  public getSessionStats(sessionPath: string): { exists: boolean; files: number; size: number; age?: number } {
    try {
      if (!fs.existsSync(sessionPath)) {
        return { exists: false, files: 0, size: 0 };
      }

      const files = this.getSessionFiles(sessionPath);
      let totalSize = 0;
      let oldestFile: Date | undefined;

      for (const file of files) {
        const filePath = path.join(sessionPath, file);
        if (fs.existsSync(filePath)) {
          const stats = fs.statSync(filePath);
          totalSize += stats.size;
          
          if (!oldestFile || stats.mtime < oldestFile) {
            oldestFile = stats.mtime;
          }
        }
      }

      const age = oldestFile ? Math.floor((Date.now() - oldestFile.getTime()) / (1000 * 60 * 60 * 24)) : undefined;

      return {
        exists: true,
        files: files.length,
        size: totalSize,
        age
      };
    } catch (error) {
      logger.error(`Error obteniendo estadísticas de sesión: ${error}`);
      return { exists: false, files: 0, size: 0 };
    }
  }
}

// Exportar instancia singleton
export const sessionStateDetector = SessionStateDetector.getInstance();