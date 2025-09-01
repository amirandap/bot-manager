/**
 * Monitoring Service
 * Handles system monitoring, memory management, and zombie detection
 */

import { Client } from "whatsapp-web.js";
import { logger } from "./LoggerService";
import { cleanBrowserCache, cleanCache } from "./CacheService";

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
export function startBrowserMetricsMonitoring(getWhatsAppClient: () => Client | null): void {
  let lastScriptDuration = 0;
  let lastMeasureTime = Date.now();
  
  // Monitor every 30 seconds
  setInterval(async () => {
    try {
      const client = getWhatsAppClient();
      if (!client || !client.pupPage) {
        // No client or page available, set metrics to 0
        logger.updateMetric("BROWSER_MEMORY", 0);
        logger.updateMetric("BROWSER_CPU", 0);
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
      logger.updateMetric("BROWSER_MEMORY", memoryMB);
      logger.updateMetric("BROWSER_CPU", cpuPercent);
      
      // Log high browser memory usage
      if (memoryMB > 300) {
        logger.warn(`🌐 High browser memory usage: ${memoryMB}MB`);
      }
      
    } catch (error) {
      // If we can't get metrics, set to 0
      logger.updateMetric("BROWSER_MEMORY", 0);
      logger.updateMetric("BROWSER_CPU", 0);
      
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
export function startZombieDetection(getWhatsAppClient: () => Client | null): void {
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
          
          // Try cache cleanup first before restarting (after 5 minutes of unresponsiveness)
          if (timeSinceLastCheck > 5 * 60 * 1000 && timeSinceLastCheck < 7 * 60 * 1000) {
            logger.info('🧹 Attempting cache cleanup to recover from zombie state...');
            await cleanBrowserCache(client);
            await cleanCache();
          }
          
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
