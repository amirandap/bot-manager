export interface Bot {
  id: string;
  name: string;
  type: 'whatsapp' | 'discord';
  pm2ServiceId: string;
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
  type: 'whatsapp' | 'discord';
  status: 'online' | 'offline' | 'unknown';
  lastSeen?: string;
  phoneNumber?: string | null;
  pushName?: string | null;
}

// Legacy interface for backward compatibility
export interface LegacyBot {
    id: string
    name: string
    type: string
    status: string
    uptime: string | null
    port: number | string
    rootFolder: string
    QrCode: string
    client: {
      wid: {
        _serialized: string
        user: string
        server: string
      }
      pushname: string
    }
}

export interface Bots {
    discord: LegacyBot[];
    whatsapp: LegacyBot[];
}