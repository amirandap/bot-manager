/**
 * =================
 * MIDDLEWARE TYPES
 * =================
 * 
 * All middleware-related types centralized
 */

import { Request } from "express";

// =================
// BOT MIDDLEWARE
// =================

/**
 * Extended Request interface to include bot-specific data
 */
export interface BotRequest extends Request {
  bot?: {
    requestId: string;
    client: unknown; // WhatsApp Web Client - external library type
    startTime: number;
  };
}