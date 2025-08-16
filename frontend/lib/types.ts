export interface LogEntry {
  timestamp: string;
  level: string;
  message: string;
}

export interface Bot {
  id: string;
  name: string;
  type?: "whatsapp" | "discord"; // Made optional to handle cases where type might be undefined
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

export interface BotStatus {
  id: string;
  name: string;
  type?: "whatsapp" | "discord"; // Made optional to handle cases where type might be undefined
  status: // Standard states
  | "online"
    | "offline"
    | "stopped"
    | "stopping"
    | "errored"
    | "launching"
    | "unknown"
    // Lifecycle states from bot
    | "initializing"
    | "browser_launching"
    | "waiting_for_qr"
    | "qr_ready"
    | "qr_scanned"
    | "authenticating"
    | "ready"
    | "connected"
    | "disconnected"
    | "reconnecting"
    | "error_browser"
    | "error_connection"
    | "error_authentication"
    | "error_unknown";
  lastSeen?: string;
  phoneNumber?: string | null;
  pushName?: string | null;
  // PM2 process information - now dynamic to support all metrics
  pm2?: {
    // Core PM2 metrics
    name?: string;
    status?: string;
    pid?: number;
    cpu?: number;
    memory?: number; // in MB
    restarts?: number;
    uptime?: number; // in seconds
    lastRestart?: string;
    
    // Advanced PM2 metrics
    activeHandles?: number;
    activeRequests?: number;
    eventLoopLatency?: string | number; // in milliseconds
    heapUsage?: number; // percentage
    heapSize?: string;
    usedHeapSize?: string;
    errorCount?: number;
    httpRequests?: number;
    
    // Bot-specific custom metrics (dynamic from PM2 axm_monitor)
    botStatus?: string;
    clientPhoneNumber?: string;
    clientPushName?: string;
    browserCpuUsage?: number;
    browserMemoryUsage?: number;
    messageProcessingTime?: number;
    qrCodeStatus?: string;
    qrCodesGenerated?: number;
    apiServerStatus?: string | number;
    whatsappStatus?: string;
    whatsappConnections?: number;
    messagesProcessed?: number;
    eventLoopLatencyP95?: string;
    httpP95Latency?: number;
    httpMeanLatency?: number;
    nodeVersion?: string;
    logPath?: string;
    errorLogPath?: string;
    outLogPath?: string;
    
    // Allow any additional dynamic metrics
    [key: string]: string | number | boolean | undefined;
  };
  // API connectivity
  apiResponsive?: boolean;
  apiResponseTime?: number; // in milliseconds
  // Lifecycle information
  lifecycle?: {
    currentState: string;
    lastStateChange?: {
      timestamp: string;
      state: string;
      details?: string;
      error?: string;
    };
    stateHistory?: Array<{
      timestamp: string;
      state: string;
      details?: string;
      error?: string;
    }>;
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
