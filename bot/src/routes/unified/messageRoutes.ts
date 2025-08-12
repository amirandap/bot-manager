/**
 * Refactored routes using centralized MessageController
 * This replaces the individual route files with unified controller methods
 */

import express from "express";
import multer from "multer";
import { MessageController } from "../../controllers/MessageController";

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB limit
  },
});

// ============================================================================
// UNIFIED MESSAGE ENDPOINTS
// ============================================================================

/**
 * POST /send-to-phone
 * Send message to phone numbers only
 */
router.post(
  "/send-to-phone",
  upload.single("file"),
  MessageController.sendToPhone
);

/**
 * POST /send-to-group
 * Send message to groups only
 */
router.post(
  "/send-to-group",
  upload.single("file"),
  MessageController.sendToGroup
);

/**
 * POST /send-broadcast
 * Send message to both phones and groups
 */
router.post(
  "/send-broadcast",
  upload.single("file"),
  MessageController.sendBroadcast
);

/**
 * POST /send-message
 * Simple message sending (legacy compatibility)
 */
router.post(
  "/send-message",
  upload.single("media"),
  MessageController.sendSimpleMessage
);

// ============================================================================
// MEDIA ENDPOINTS
// ============================================================================

/**
 * POST /send-image
 * Send image with optional caption
 */
router.post("/send-image", upload.single("file"), (req, res) => {
  MessageController.sendMedia(req, res, "image");
});

/**
 * POST /send-document
 * Send document with optional message
 */
router.post("/send-document", upload.single("file"), (req, res) => {
  MessageController.sendMedia(req, res, "document");
});

/**
 * POST /send-audio
 * Send audio file with optional message
 */
router.post("/send-audio", upload.single("file"), (req, res) => {
  MessageController.sendMedia(req, res, "audio");
});

/**
 * POST /send-video
 * Send video with optional caption
 */
router.post("/send-video", upload.single("file"), (req, res) => {
  MessageController.sendMedia(req, res, "video");
});

export default router;

/**
 * Setup all routes with the provided app
 */
export function setupRoutes(app: express.Application): void {
  app.use(router);
}
