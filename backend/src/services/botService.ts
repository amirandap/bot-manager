import axios from 'axios';
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
      try {
        const response = await axios.get(`${bot.apiHost}:${bot.apiPort}/status`, {
          timeout: 5000
        });
        
        // Extract real bot information
        const realPhoneNumber = response.data.client?.wid?.user || response.data.client?.me?.user || bot.phoneNumber;
        const realPushName = response.data.client?.pushname || bot.pushName;
        
        statuses.push({
          id: bot.id,
          name: bot.name,
          type: bot.type,
          status: (response.data.connected === true || response.data.status === 'online') ? 'online' : 'offline',
          lastSeen: new Date().toISOString(),
          phoneNumber: realPhoneNumber,
          pushName: realPushName
        });
      } catch (error) {
        statuses.push({
          id: bot.id,
          name: bot.name,
          type: bot.type,
          status: 'offline',
          phoneNumber: bot.phoneNumber,
          pushName: bot.pushName
        });
      }
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
}
