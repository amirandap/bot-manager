/**
 * Notification Settings Routes
 * API endpoints for managing WhatsApp notification interference settings
 */

import { Router } from "express";
import { 
  getNotificationSettings,
  applyPhoneFriendlyConfig,
  applyBotOptimizedConfig,
  applyCustomConfig,
  getNotificationInfo,
  getBrowserInfo,
  configureAsLinux
} from "../controllers/NotificationController";

const router = Router();

/**
 * GET /api/notifications/info
 * Get information about notification settings and available options
 */
router.get("/info", getNotificationInfo);

/**
 * GET /api/notifications/status
 * Get current notification settings status
 */
router.get("/status", getNotificationSettings);

/**
 * POST /api/notifications/apply-phone-friendly
 * Apply phone-friendly settings (recommended for normal usage)
 * Minimizes interference with phone notifications
 */
router.post("/apply-phone-friendly", applyPhoneFriendlyConfig);

/**
 * POST /api/notifications/apply-bot-optimized
 * Apply bot-optimized settings (maximum performance)
 * May interfere with phone notifications
 */
router.post("/apply-bot-optimized", applyBotOptimizedConfig);

/**
 * POST /api/notifications/configure
 * Apply custom notification settings
 * Body: {
 *   backgroundSync?: boolean,
 *   presenceAvailable?: boolean,
 *   autoDownloadMedia?: boolean
 * }
 */
router.post("/configure", applyCustomConfig);

/**
 * GET /api/notifications/browser-info
 * Get current browser information and User Agent details
 */
router.get("/browser-info", getBrowserInfo);

/**
 * POST /api/notifications/configure-linux
 * Configure browser to present as Linux system
 */
router.post("/configure-linux", configureAsLinux);

export default router;