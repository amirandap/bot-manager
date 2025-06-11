import type { Bot } from './types';

// API configuration
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

// API helpers
export const api = {
  // Bots endpoints
  getBots: () => `${API_BASE_URL}/api/bots`,
  getBot: (id: string) => `${API_BASE_URL}/api/bots/${id}`,
  createBot: () => `${API_BASE_URL}/api/bots`,
  updateBot: (id: string) => `${API_BASE_URL}/api/bots/${id}`,
  deleteBot: (id: string) => `${API_BASE_URL}/api/bots/${id}`,
  sendMessage: (id: string) => `${API_BASE_URL}/api/bots/${id}/send`,
  
  // Status endpoints
  getBotStatus: (id: string) => `${API_BASE_URL}/api/status/${id}`,
  getDiscordStatus: () => `${API_BASE_URL}/api/status/discord`,
  getWhatsAppStatus: () => `${API_BASE_URL}/api/status/whatsapp`,
};

// Bot API helpers - for direct communication with bots
export const botApi = {
  // WhatsApp Bot endpoints
  getWhatsAppStatus: (bot: Bot) => 
    `${bot.apiHost}:${bot.apiPort}/status`,
  getWhatsAppQR: (bot: Bot) => 
    `${bot.apiHost}:${bot.apiPort}/qr-code`,
  sendWhatsAppMessage: (bot: Bot) => 
    `${bot.apiHost}:${bot.apiPort}/send-message`,
  
  // Discord Bot endpoints  
  getDiscordHealth: (bot: Bot) => 
    `${bot.apiHost}:${bot.apiPort}/health`,
  sendDiscordMessage: (bot: Bot) => 
    `${bot.apiHost}:${bot.apiPort}/send-message`,
};
