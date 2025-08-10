/* eslint-disable no-console */
import express from "express";
import multer from "multer";
import { MessageController } from "../controllers/MessageController";
import {
  addRequestId,
  validateClient,
  logRequest,
  handleBotError,
  BotRequest,
} from "../middleware/botMiddleware";

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Apply middleware
router.use(addRequestId);
router.use(validateClient);
router.use(logRequest);

/**
 * POST /
 * Send message to phone numbers only
 * Uses the new centralized MessageController
 */
router.post("/", upload.single("file"), MessageController.sendToPhone);

// Apply error handling middleware
router.use(handleBotError);

export default router;
