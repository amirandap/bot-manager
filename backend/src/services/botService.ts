import axios from 'axios';
import pm2 from 'pm2';
import { Bot, BotStatus } from '../types';
import { ConfigService } from './configService';

export class BotService {
  private configService: ConfigService;

  constructor() {
    this.configService = ConfigService.getInstance();
  }

  public async getAllBots(): Promise<Bot[]> {
    try {
      console.log('BotService: Getting all bots from config...');
      
      // First, let's see what the config service loads
      const config = this.configService.loadConfig();
      console.log('BotService: Raw config loaded:', JSON.stringify(config, null, 2));
      
      const bots = this.configService.getAllBots();
      console.log('BotService: Retrieved', bots.length, 'bots');
      console.log('BotService: Bots data:', JSON.stringify(bots, null, 2));
      
      return bots;
    } catch (error) {
      console.error('BotService: Error in getAllBots:', error);
      throw error;
    }
  }

  public async getBotsByType(type: 'whatsapp' | 'discord'): Promise<Bot[]> {
    return this.configService.getBotsByType(type);
  }

  public async getDiscordBotStatus(): Promise<BotStatus[]> {
    const discordBots = this.configService.getBotsByType('discord');
    const statuses: BotStatus[] = [];

    for (const bot of discordBots) {
      try {
        const response = await axios.get(`${bot.apiHost}:${bot.apiPort}/health`, {
          timeout: 5000
        });
        
        statuses.push({
          id: bot.id,
          name: bot.name,
          type: bot.type,
          status: response.status === 200 ? 'online' : 'offline',
          lastSeen: new Date().toISOString()
        });
      } catch (error) {
        statuses.push({
          id: bot.id,
          name: bot.name,
          type: bot.type,
          status: 'offline'
        });
      }
    }

    return statuses;
  }

  public async getWhatsAppBotStatus(): Promise<BotStatus[]> {
    const whatsappBots = this.configService.getBotsByType('whatsapp');
    const statuses: BotStatus[] = [];

    for (const bot of whatsappBots) {
      console.log(`📊 Checking status for bot: ${bot.id}`);
      
      // Get PM2 process status
      const pm2Status = await this.getPM2ProcessStatus(bot.id);
      
      // Initialize status object
      let botStatus: BotStatus = {
        id: bot.id,
        name: bot.name,
        type: bot.type,
        status: pm2Status.status,
        phoneNumber: bot.phoneNumber,
        pushName: bot.pushName,
        pm2: {
          pid: pm2Status.pid,
          cpu: pm2Status.cpu,
          memory: pm2Status.memory,
          restarts: pm2Status.restarts,
          uptime: pm2Status.uptime,
          lastRestart: pm2Status.lastRestart,
        }
      };

      // If PM2 says the process is online, try to check API connectivity
      if (pm2Status.status === 'online') {
        try {
          const startTime = Date.now();
          const response = await axios.get(`${bot.apiHost}:${bot.apiPort}/status`, {
            timeout: 5000
          });
          const responseTime = Date.now() - startTime;
          
          // Extract real bot information from API
          const realPhoneNumber = response.data.client?.wid?.user || response.data.client?.me?.user || bot.phoneNumber;
          const realPushName = response.data.client?.pushname || bot.pushName;
          
          // Determine final status based on API response
          const isConnected = response.data.connected === true || response.data.status === 'online';
          
          botStatus = {
            ...botStatus,
            status: isConnected ? 'online' : 'offline',
            lastSeen: new Date().toISOString(),
            phoneNumber: realPhoneNumber,
            pushName: realPushName,
            apiResponsive: true,
            apiResponseTime: responseTime
          };

          console.log(`✅ Bot ${bot.id}: PM2=${pm2Status.status}, API=responsive(${responseTime}ms), WhatsApp=${isConnected ? 'connected' : 'disconnected'}`);
        } catch (error) {
          // PM2 says online but API is not responsive
          botStatus = {
            ...botStatus,
            status: 'errored', // Process running but API not working
            apiResponsive: false
          };

          console.log(`⚠️  Bot ${bot.id}: PM2=${pm2Status.status}, API=unresponsive, Status=errored`);
        }
      } else {
        // PM2 process is not online
        botStatus.apiResponsive = false;
        console.log(`❌ Bot ${bot.id}: PM2=${pm2Status.status}, API=not checked`);
      }

      statuses.push(botStatus);
    }

    return statuses;
  }

  public async getBotStatus(id: string): Promise<BotStatus | null> {
    console.log('BotService: Getting status for bot ID:', id);
    
    const bot = this.configService.getBotById(id);
    console.log('BotService: Found bot:', JSON.stringify(bot, null, 2));
    
    if (!bot) {
      console.log('BotService: Bot not found with ID:', id);
      return null;
    }

    try {
      const endpoint = bot.type === 'discord' ? '/health' : '/status';
      const url = `${bot.apiHost}:${bot.apiPort}${endpoint}`;
      console.log('BotService: Checking bot status at URL:', url);
      
      const response = await axios.get(url, {
        timeout: 5000
      });
      
      console.log('BotService: Bot response:', response.status, response.data);
      
      const isOnline = bot.type === 'discord' 
        ? response.status === 200 
        : (response.data.connected === true || response.data.status === 'online');

      // Extract real bot information for WhatsApp bots
      let realPhoneNumber = bot.phoneNumber;
      let realPushName = bot.pushName;
      
      if (bot.type === 'whatsapp' && response.data.client) {
        realPhoneNumber = response.data.client.wid?.user || response.data.client.me?.user || bot.phoneNumber;
        realPushName = response.data.client.pushname || bot.pushName;
        
        // Update bot configuration with real data
        this.configService.updateBotWithRealData(
          bot.id, 
          realPhoneNumber || undefined, 
          realPushName || undefined
        );
      }

      const status: BotStatus = {
        id: bot.id,
        name: bot.name,
        type: bot.type,
        status: isOnline ? 'online' : 'offline',
        lastSeen: new Date().toISOString(),
        phoneNumber: realPhoneNumber,
        pushName: realPushName
      };
      
      console.log('BotService: Final status:', JSON.stringify(status, null, 2));
      return status;
    } catch (error) {
      console.log('BotService: Error checking bot status:', error);
      
      const offlineStatus: BotStatus = {
        id: bot.id,
        name: bot.name,
        type: bot.type,
        status: 'offline' as const,
        phoneNumber: bot.phoneNumber,
        pushName: bot.pushName
      };
      
      console.log('BotService: Returning offline status:', JSON.stringify(offlineStatus, null, 2));
      return offlineStatus;
    }
  }

  /**
   * Get detailed PM2 process status for a bot
   */
  private async getPM2ProcessStatus(botId: string): Promise<{
    status: 'online' | 'offline' | 'stopped' | 'stopping' | 'errored' | 'launching' | 'unknown';
    pid?: number;
    cpu?: number;
    memory?: number;
    restarts?: number;
    uptime?: number;
    lastRestart?: string;
  }> {
    return new Promise((resolve) => {
      pm2.connect((err) => {
        if (err) {
          console.error(`❌ Failed to connect to PM2 for status check:`, err);
          resolve({ status: 'unknown' });
          return;
        }

        pm2.describe(botId, (err, processDescription) => {
          pm2.disconnect();

          if (err) {
            console.error(`❌ PM2 describe failed for ${botId}:`, err);
            resolve({ status: 'unknown' });
            return;
          }

          if (!processDescription || processDescription.length === 0) {
            resolve({ status: 'offline' });
            return;
          }

          const proc = processDescription[0] as any;
          const pm2Env = proc.pm2_env;
          const monit = proc.monit;

          // Map PM2 status to our status types
          let status: 'online' | 'offline' | 'stopped' | 'stopping' | 'errored' | 'launching' | 'unknown' = 'unknown';
          
          switch (pm2Env?.status) {
            case 'online':
              status = 'online';
              break;
            case 'stopped':
              status = 'stopped';
              break;
            case 'stopping':
              status = 'stopping';
              break;
            case 'errored':
              status = 'errored';
              break;
            case 'launching':
              status = 'launching';
              break;
            default:
              status = 'offline';
          }

          const result = {
            status,
            pid: proc.pid || undefined,
            cpu: monit?.cpu || undefined,
            memory: monit?.memory ? Math.round(monit.memory / 1024 / 1024) : undefined, // Convert to MB
            restarts: pm2Env?.restart_time || undefined,
            uptime: pm2Env?.pm_uptime ? Date.now() - pm2Env.pm_uptime : undefined,
            lastRestart: pm2Env?.restart_time > 0 ? new Date().toISOString() : undefined,
          };

          console.log(`📊 PM2 status for ${botId}:`, result);
          resolve(result);
        });
      });
    });
  }
}
