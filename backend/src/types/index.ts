export interface Bot {
  id: string;
  name: string;
  type: "whatsapp" | "discord";
  pm2ServiceId?: string; // Optional - only for PM2-managed bots
  isExternal?: boolean; // Flag to indicate if bot is external (not managed by our PM2)
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
  status:
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
  };
  // API connectivity
  apiResponsive?: boolean;
  apiResponseTime?: number; // in milliseconds
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
