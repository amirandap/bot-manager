export interface Bot {
  id: string;
  name: string;
  type: "whatsapp" | "discord";
  pm2ServiceId?: string; // Optional - only for PM2-managed bots
  isExternal?: boolean; // Flag to indicate if bot is external (not managed by our PM2)
  status?: "spawning" | "online" | "error" | "stopped" | "unknown"; // Bot lifecycle status
  statusMessage?: string; // Additional status information
  apiHost: string;
  apiPort: number;
  phoneNumber: string | null;
  pushName: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BotConfig {
  bots: Bot[];
}

export interface BotStatus {
  id: string;
  name: string;
  type: "whatsapp" | "discord";
  status?:
    | "online"
    | "offline"
    | "stopped"
    | "stopping"
    | "errored"
    | "launching"
    | "unknown";
  lastSeen?: string;
  phoneNumber?: string | null;
  pushName?: string | null;
  // PM2 process information
  pm2?: {
    pid?: number;
    cpu?: number;
    memory?: number; // in MB
    restarts?: number;
    uptime?: number; // in milliseconds
    lastRestart?: string;
    // Advanced PM2 metrics
    status?: "online" | "stopped" | "errored" | "launching" | "unknown";
    activeHandles?: number;
    activeRequests?: number;
    eventLoopLatency?: number;
    heapUsage?: number;
    errorCount?: number;
    httpRequests?: number;
    // Bot-specific custom metrics
    botStatus?: string;
    browserCpuUsage?: number;
    browserMemoryUsage?: number;
    messageProcessingTime?: number;
    qrCodeStatus?: string;
    qrCodesGenerated?: number;
    apiServerStatus?: number;
    whatsappStatus?: string;
  };
  // API connectivity
  apiResponsive?: boolean;
  apiResponseTime?: number; // in milliseconds
  // Health evaluation
  health?: {
    status: "healthy" | "warning" | "critical" | "unknown";
    score: number; // 0-100
    issues: string[];
  };
}

// Legacy interface for backward compatibility
export interface LegacyBot {
  id: string;
  name: string;
  type: string;
  status: string;
  uptime: string | null;
  port: number | string;
  rootFolder: string;
  QrCode: string;
  client: {
    wid: {
      _serialized: string;
      user: string;
      server: string;
    };
    pushname: string;
  };
}

export interface Bots {
  discord: LegacyBot[];
  whatsapp: LegacyBot[];
}
