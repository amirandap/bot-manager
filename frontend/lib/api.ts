// API configuration
// Use empty string for relative URLs when NEXT_PUBLIC_API_BASE_URL is not set
// This allows nginx to proxy the requests to the backend
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

// When using relative URLs with Nginx, don't add a duplicate '/api' prefix
// The URL paths already include '/api' in their definitions below
// This allows proper proxying through Nginx config: location /api/ -> backend

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

  // 🚀 PM2 Metrics-based status endpoints (primary source - PM2 only)
  getBotStatusMetrics: (id: string) =>
    `${API_BASE_URL}/api/bots/${id}/status/metrics`,
  getBotMetrics: (id: string) => `${API_BASE_URL}/api/bots/${id}/metrics`,
  getBotHealth: (id: string) => `${API_BASE_URL}/api/bots/${id}/health`,
  getAllBotsMetrics: () => `${API_BASE_URL}/api/bots/metrics/all`,

  // Status endpoints using PM2 metrics exclusively
  getBotStatus: (id: string) => `${API_BASE_URL}/api/status/${id}`,
  getDiscordStatus: () => `${API_BASE_URL}/api/status/discord`,
  getWhatsAppStatus: () => `${API_BASE_URL}/api/status/whatsapp`,

  // PM2 Management endpoints
  restartBotPM2: (id: string) => `${API_BASE_URL}/api/bots/${id}/pm2/restart`,
  recreateBotPM2: (id: string) => `${API_BASE_URL}/api/bots/${id}/pm2/recreate`,
  getBotPM2Status: (id: string) => `${API_BASE_URL}/api/bots/${id}/pm2/status`,

  // Bot Proxy endpoints - unified access to bot operations (no direct status calls)
  proxy: {
    // Core operations (ID-based) - no HTTP status calls to bots
    getQRCode: () => `${API_BASE_URL}/api/bots/qr-code`,
    getQRCodeById: (id: string) => `${API_BASE_URL}/api/bots/${id}/qr-code`,
    getQRCodeImage: (id: string) =>
      `${API_BASE_URL}/api/bots/${id}/qr-code/image`,
    getQRCodeStatus: (id: string) =>
      `${API_BASE_URL}/api/bots/${id}/qr-code/status`,
    updateQRCode: () => `${API_BASE_URL}/api/bots/qr-code/update`,
    changeFallbackNumber: () =>
      `${API_BASE_URL}/api/bots/change-fallback-number`,
    changePort: () => `${API_BASE_URL}/api/bots/change-port`,

    // Messaging operations (botId in body)
    sendMessage: () => `${API_BASE_URL}/api/bots/send-message`,
    getGroups: () => `${API_BASE_URL}/api/bots/get-groups`,
    sendPending: () => `${API_BASE_URL}/api/bots/pending`,
    sendFollowup: () => `${API_BASE_URL}/api/bots/followup`,
    receiveImageAndJson: () =>
      `${API_BASE_URL}/api/bots/receive-image-and-json`,
    sendConfirmation: () => `${API_BASE_URL}/api/bots/confirmation`,
  },

  // Logs endpoints
  logs: {
    getBotLogs: (botId: string, params?: {lines?: number; offset?: number; type?: 'combined' | 'error' | 'out'}) => {
      const queryParams = new URLSearchParams();
      if (params?.lines) queryParams.append('lines', params.lines.toString());
      if (params?.offset) queryParams.append('offset', params.offset.toString());
      if (params?.type) queryParams.append('type', params.type);
      const query = queryParams.toString();
      return `${API_BASE_URL}/api/logs/${botId}${query ? `?${query}` : ''}`;
    },
    getTailLogs: (botId: string, params?: {lines?: number; type?: 'combined' | 'error' | 'out'}) => {
      const queryParams = new URLSearchParams();
      if (params?.lines) queryParams.append('lines', params.lines.toString());
      if (params?.type) queryParams.append('type', params.type);
      const query = queryParams.toString();
      return `${API_BASE_URL}/api/logs/${botId}/tail${query ? `?${query}` : ''}`;
    },
    getLogFiles: (botId: string) => `${API_BASE_URL}/api/logs/${botId}/files`,
    getLogStats: (botId: string) => `${API_BASE_URL}/api/logs/${botId}/stats`,
    clearBotLogs: (botId: string, type?: 'combined' | 'error' | 'out') => {
      const query = type ? `?type=${type}` : '';
      return `${API_BASE_URL}/api/logs/${botId}/clear${query}`;
    },
  },
};
