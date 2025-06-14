import type { Bot } from "./types";

// API configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL;

// Validate API_BASE_URL is set
if (!API_BASE_URL) {
  throw new Error(
    "NEXT_PUBLIC_API_BASE_URL environment variable is required but not set. " +
      "Please check your .env file or environment configuration."
  );
}

// API helpers
export const api = {
  // Base URL for manual construction
  base: API_BASE_URL,

  // Bots endpoints
  getBots: () => `${API_BASE_URL}/api/bots`,
  getBot: (id: string) => `${API_BASE_URL}/api/bots/${id}`,
  createBot: () => `${API_BASE_URL}/api/bots`,
  updateBot: (id: string) => `${API_BASE_URL}/api/bots/${id}`,
  deleteBot: (id: string) => `${API_BASE_URL}/api/bots/${id}`,
  sendMessage: (id: string) => `${API_BASE_URL}/api/bots/${id}/send`,

  // Bot spawning endpoints
  spawnWhatsAppBot: () => `${API_BASE_URL}/api/bots/spawn/whatsapp`,
  terminateBot: (id: string) => `${API_BASE_URL}/api/bots/${id}/terminate`,

  // Deployment endpoints
  deployStatus: () => `${API_BASE_URL}/api/deploy/status`,
  deployTrigger: () => `${API_BASE_URL}/api/deploy/trigger`,
  deployWebhook: () => `${API_BASE_URL}/api/deploy/webhook`,
  deployHealth: () => `${API_BASE_URL}/api/deploy/health`,
  deployHistory: (limit?: number) =>
    `${API_BASE_URL}/api/deploy/history${limit ? `?limit=${limit}` : ""}`,

  // Status endpoints
  getBotStatus: (id: string) => `${API_BASE_URL}/api/status/${id}`,
  getDiscordStatus: () => `${API_BASE_URL}/api/status/discord`,
  getWhatsAppStatus: () => `${API_BASE_URL}/api/status/whatsapp`,
};

// Bot API helpers - for direct communication with bots
export const botApi = {
  // WhatsApp Bot endpoints
  getWhatsAppStatus: (bot: Bot) => `${bot.apiHost}:${bot.apiPort}/status`,
  getWhatsAppQR: (bot: Bot) => `${bot.apiHost}:${bot.apiPort}/qr-code`,
  sendWhatsAppMessage: (bot: Bot) =>
    `${bot.apiHost}:${bot.apiPort}/send-message`,

  // Discord Bot endpoints
  getDiscordHealth: (bot: Bot) => `${bot.apiHost}:${bot.apiPort}/health`,
  sendDiscordMessage: (bot: Bot) =>
    `${bot.apiHost}:${bot.apiPort}/send-message`,
};
