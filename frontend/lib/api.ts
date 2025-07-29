import type { Bot } from "./types";

// API configuration
// Use empty string for relative URLs when NEXT_PUBLIC_API_BASE_URL is not set
// This allows nginx to proxy the requests to the backend
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

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

  // PM2 Management endpoints
  restartBotPM2: (id: string) => `${API_BASE_URL}/api/bots/${id}/pm2/restart`,
  recreateBotPM2: (id: string) => `${API_BASE_URL}/api/bots/${id}/pm2/recreate`,
  getBotPM2Status: (id: string) => `${API_BASE_URL}/api/bots/${id}/pm2/status`,

  // Bot Proxy endpoints - unified access to all bot operations
  proxy: {
    // Core operations
    getStatus: () => `${API_BASE_URL}/api/bots/status`,
    getQRCode: () => `${API_BASE_URL}/api/bots/qr-code`,
    updateQRCode: () => `${API_BASE_URL}/api/bots/qr-code/update`,
    restart: () => `${API_BASE_URL}/api/bots/restart`,
    changeFallbackNumber: () =>
      `${API_BASE_URL}/api/bots/change-fallback-number`,
    changePort: () => `${API_BASE_URL}/api/bots/change-port`,

    // Messaging operations
    sendMessage: () => `${API_BASE_URL}/api/bots/send-message`,
    getGroups: () => `${API_BASE_URL}/api/bots/get-groups`,
    sendPending: () => `${API_BASE_URL}/api/bots/pending`,
    sendFollowup: () => `${API_BASE_URL}/api/bots/followup`,
    receiveImageAndJson: () =>
      `${API_BASE_URL}/api/bots/receive-image-and-json`,
    sendConfirmation: () => `${API_BASE_URL}/api/bots/confirmation`,
  },
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
