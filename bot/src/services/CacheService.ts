/**
 * Cache Service
 * Handles all cache management operations for WhatsApp bot
 */

import * as fs from 'fs';
import * as path from 'path';
import { logger } from './LoggerService';
import { Client } from 'whatsapp-web.js';

/**
 * Cache status interface
 */
export interface CacheStatus {
  wwebjsCache: { path: string; sizeMB: number; exists: boolean };
  sessionCache: { path: string; sizeMB: number; exists: boolean };
}

/**
 * Cache corruption analysis result
 */
export interface CorruptionAnalysis {
  corruptionType: string;
  likelyCause: string;
  recommendation: string;
}

/**
 * Get cache directory sizes and status
 */
export async function getCacheStatus(): Promise<CacheStatus> {
  const botId = process.env.BOT_ID || 'unknown';
  const wwebjsCachePath = path.join(__dirname, '../../.wwebjs_cache');
  const sessionCachePath = path.join(__dirname, `../../../data/sessions/${botId}/.wwebjs_cache`);

  const getDirectorySize = (dirPath: string): number => {
    if (!fs.existsSync(dirPath)) return 0;
    
    let totalSize = 0;
    try {
      const items = fs.readdirSync(dirPath);
      for (const item of items) {
        const itemPath = path.join(dirPath, item);
        const stats = fs.statSync(itemPath);
        if (stats.isDirectory()) {
          totalSize += getDirectorySize(itemPath);
        } else {
          totalSize += stats.size;
        }
      }
    } catch (error) {
      logger.warn(`Error calculating directory size for ${dirPath}: ${error}`);
    }
    return totalSize;
  };

  return {
    wwebjsCache: {
      path: wwebjsCachePath,
      sizeMB: Math.round(getDirectorySize(wwebjsCachePath) / (1024 * 1024)),
      exists: fs.existsSync(wwebjsCachePath)
    },
    sessionCache: {
      path: sessionCachePath,
      sizeMB: Math.round(getDirectorySize(sessionCachePath) / (1024 * 1024)),
      exists: fs.existsSync(sessionCachePath)
    }
  };
}

/**
 * Analyze cache corruption causes for better diagnosis
 */
export async function analyzeCacheCorruption(cacheStatus: CacheStatus): Promise<CorruptionAnalysis> {
  try {
    // Analyze corruption patterns
    if (cacheStatus.wwebjsCache.sizeMB > 100) {
      return {
        corruptionType: 'OVERSIZED_CACHE',
        likelyCause: 'Infinite download loop or failed cleanup',
        recommendation: 'Check network stability and download interruptions'
      };
    }
    
    if (cacheStatus.wwebjsCache.exists) {
      const wwebjsPath = cacheStatus.wwebjsCache.path;
      
      // Check for incomplete files (common sign of interrupted writes)
      try {
        const files = fs.readdirSync(wwebjsPath);
        const incompleteFiles = files.filter(file => file.endsWith('.tmp') || file.endsWith('.partial'));
        
        if (incompleteFiles.length > 0) {
          return {
            corruptionType: 'INCOMPLETE_DOWNLOAD',
            likelyCause: 'Process interrupted during cache writing',
            recommendation: 'Implement graceful shutdown and verify disk space'
          };
        }
        
        // Check for extremely old cache (>7 days)
        const stats = fs.statSync(wwebjsPath);
        const cacheAge = Date.now() - stats.mtime.getTime();
        const sevenDays = 7 * 24 * 60 * 60 * 1000;
        
        if (cacheAge > sevenDays) {
          return {
            corruptionType: 'STALE_CACHE',
            likelyCause: 'WhatsApp Web version mismatch',
            recommendation: 'Cache is outdated due to WhatsApp updates'
          };
        }
        
      } catch (fileError) {
        logger.warn(`File system error during cache analysis: ${fileError}`);
        return {
          corruptionType: 'FILESYSTEM_ERROR',
          likelyCause: 'Permission issues or filesystem corruption',
          recommendation: 'Check file permissions and disk health'
        };
      }
    }
    
    return {
      corruptionType: 'NONE',
      likelyCause: 'Cache appears healthy',
      recommendation: 'No action needed'
    };
    
  } catch (error) {
    return {
      corruptionType: 'ANALYSIS_ERROR',
      likelyCause: `Failed to analyze: ${error}`,
      recommendation: 'Check system resources and permissions'
    };
  }
}

/**
 * Clean corrupted or oversized wwebjs cache (conservative thresholds)
 */
export async function cleanWwebjsCache(cacheStatus: CacheStatus): Promise<boolean> {
  try {
    logger.info('🧹 Starting wwebjs cache cleanup...');
    
    // Clean main wwebjs cache only if significantly oversized (>20MB indicates real corruption)
    if (cacheStatus.wwebjsCache.exists && cacheStatus.wwebjsCache.sizeMB > 20) {
      logger.warn(`🗑️ wwebjs cache is ${cacheStatus.wwebjsCache.sizeMB}MB (>20MB), cleaning...`);
      fs.rmSync(cacheStatus.wwebjsCache.path, { recursive: true, force: true });
      logger.info('✅ Main wwebjs cache cleaned');
    }
    
    // Clean session wwebjs cache only if extremely large (>50MB)
    if (cacheStatus.sessionCache.exists && cacheStatus.sessionCache.sizeMB > 50) {
      logger.warn(`🗑️ Session wwebjs cache is ${cacheStatus.sessionCache.sizeMB}MB (>50MB), cleaning...`);
      fs.rmSync(cacheStatus.sessionCache.path, { recursive: true, force: true });
      logger.info('✅ Session wwebjs cache cleaned');
    } else if (cacheStatus.wwebjsCache.sizeMB <= 20 && cacheStatus.sessionCache.sizeMB <= 50) {
      logger.info('✅ Cache sizes are normal, no cleaning needed');
    }
    
    return true;
  } catch (error) {
    logger.error(`❌ Cache cleanup failed: ${error}`);
    return false;
  }
}

/**
 * Clean browser cache programmatically
 */
export async function cleanBrowserCache(client: Client): Promise<boolean> {
  try {
    if (!client || !client.pupPage) {
      logger.warn('⚠️ No browser page available for cache cleanup');
      return false;
    }

    logger.info('🧹 Cleaning browser cache...');

    // Clear various browser caches
    await client.pupPage.evaluate(async () => {
      // Clear localStorage
      if (typeof localStorage !== 'undefined') {
        localStorage.clear();
      }
      
      // Clear sessionStorage
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.clear();
      }
      
      // Clear IndexedDB
      if ('indexedDB' in window) {
        try {
          const databases = await indexedDB.databases();
          await Promise.all(
            databases.map(db => {
              if (db.name) {
                return new Promise<void>((resolve, reject) => {
                  const deleteReq = indexedDB.deleteDatabase(db.name!);
                  deleteReq.onsuccess = () => resolve();
                  deleteReq.onerror = () => reject(deleteReq.error);
                });
              }
            })
          );
        } catch (e) {
          console.warn('IndexedDB cleanup failed:', e);
        }
      }
      
      // Clear service worker cache
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(cacheNames.map(name => caches.delete(name)));
        } catch (e) {
          console.warn('Service worker cache cleanup failed:', e);
        }
      }
    });

    logger.info('✅ Browser cache cleaned');
    return true;
  } catch (error) {
    logger.error(`❌ Browser cache cleanup failed: ${error}`);
    return false;
  }
}

/**
 * Smart cache cleanup: Clean old cache only when new session starts
 */
export async function cleanOldCacheOnNewSession(): Promise<void> {
  try {
    const cacheStatus = await getCacheStatus();
    
    // If there's existing cache, check if it's from a previous session
    if (cacheStatus.wwebjsCache.exists) {
      // Check if cache is from a previous run (more than 1 hour old)
      const wwebjsPath = cacheStatus.wwebjsCache.path;
      const stats = fs.statSync(wwebjsPath);
      const cacheAge = Date.now() - stats.mtime.getTime();
      const oneHour = 60 * 60 * 1000;
      
      if (cacheAge > oneHour) {
        logger.info(`🧹 Cleaning old cache (${Math.round(cacheAge/oneHour * 10)/10}h old) before new session...`);
        fs.rmSync(wwebjsPath, { recursive: true, force: true });
        logger.info('✅ Old cache cleaned, fresh session will create new cache');
      } else {
        logger.info('✅ Recent cache detected, reusing existing cache');
      }
    }
  } catch (error) {
    logger.warn(`Old cache cleanup failed: ${error}`);
  }
}

/**
 * Validate cache integrity and clean ONLY if corrupted (not routine)
 */
export async function validateAndCleanCache(client?: Client): Promise<void> {
  try {
    logger.info('🔍 Validating cache integrity...');
    
    const cacheStatus = await getCacheStatus();
    
    // Analyze corruption causes
    const analysis = await analyzeCacheCorruption(cacheStatus);
    
    // Log cache status for monitoring
    logger.info(`📊 Cache status: wwebjs=${cacheStatus.wwebjsCache.sizeMB}MB, session=${cacheStatus.sessionCache.sizeMB}MB`);
    
    if (analysis.corruptionType !== 'NONE') {
      logger.warn(`🚨 Cache issue detected: ${analysis.corruptionType} - ${analysis.likelyCause}`);
      logger.info(`💡 Recommendation: ${analysis.recommendation}`);
    }
    
    // Only clean if there are REAL corruption indicators:
    const corruptionSigns = {
      oversized: cacheStatus.wwebjsCache.sizeMB > 50 || cacheStatus.sessionCache.sizeMB > 100,
    };
    
    if (corruptionSigns.oversized) {
      logger.warn('🚨 Cache corruption detected (oversized), performing targeted cleanup...');
      await cleanWwebjsCache(cacheStatus);
      if (client) {
        await cleanBrowserCache(client);
      }
    } else {
      logger.info('✅ Cache appears healthy, no cleanup needed');
    }
    
  } catch (error) {
    logger.error(`Cache validation failed: ${error}`);
  }
}

/**
 * Wrapper function to clean cache with current status
 */
export async function cleanCache(): Promise<boolean> {
  const cacheStatus = await getCacheStatus();
  return cleanWwebjsCache(cacheStatus);
}

/**
 * Start cache management with smart invalidation (not routine expiration)
 */
export function startCacheMaintenance(): void {
  // Only monitor for corruption signs, don't expire routinely
  setInterval(async () => {
    try {
      const cacheStatus = await getCacheStatus();
      
      // Only clean if cache shows corruption signs:
      const isCorrupted = 
        cacheStatus.wwebjsCache.sizeMB > 50 ||     // Abnormally large
        cacheStatus.sessionCache.sizeMB > 100;     // Session cache bloated
      
      if (isCorrupted) {
        logger.warn('🚨 Cache corruption detected by size anomaly, cleaning...');
        await cleanWwebjsCache(cacheStatus);
      }
      
      // Log cache status every 2 hours for monitoring (not cleaning)
      if (Date.now() % (2 * 60 * 60 * 1000) < 5 * 60 * 1000) {
        logger.info(`📊 Cache health: wwebjs=${cacheStatus.wwebjsCache.sizeMB}MB, session=${cacheStatus.sessionCache.sizeMB}MB`);
      }
      
    } catch (error) {
      logger.warn(`Cache monitoring error: ${error}`);
    }
  }, 5 * 60 * 1000); // Check every 5 minutes, but only clean if corrupted
}
