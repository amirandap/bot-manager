/**
 * Group Webhook Service
 * 
 * Automatically forwards messages and attachments from specific WhatsApp groups to external webhooks.
 * 
 * Features:
 * - Monitor specific groups by ID or name
 * - Forward messages with metadata (sender, timestamp, group info)
 * - Download and forward attachments (images, documents, audio, video)
 * - Support multiple webhooks per group
 * - Configurable retry logic
 * - Error handling and logging
 */

import axios from 'axios';
import { Message, GroupChat } from 'whatsapp-web.js';
import { logger } from './LoggerService';
import * as fs from 'fs/promises';
import * as path from 'path';

// Configuration file path
const CONFIG_PATH = path.join(process.cwd(), 'config', 'monitored-groups.json');

export interface MonitoredGroup {
  groupId: string;
  groupName?: string;
  webhooks: string[];
  enabled: boolean;
  includeAttachments: boolean;
  includeMetadata: boolean;
}

export interface WebhookPayload {
  messageId: string;
  groupId: string;
  groupName: string;
  senderId: string;
  senderName: string;
  timestamp: number;
  message: string;
  messageType: 'text' | 'image' | 'document' | 'audio' | 'video' | 'sticker' | 'other';
  hasMedia: boolean;
  isForwarded: boolean;
  isReply: boolean;
  quotedMessage?: {
    senderId: string;
    message: string;
  };
  attachment?: {
    filename: string;
    mimetype: string;
    data: string; // base64 encoded
    size: number;
  };
  metadata?: {
    botId: string;
    botName: string;
    forwardedAt: string;
  };
}

export class GroupWebhookService {
  private static instance: GroupWebhookService;
  private config: MonitoredGroup[] = [];
  private initialized = false;

  private constructor() {}

  public static getInstance(): GroupWebhookService {
    if (!GroupWebhookService.instance) {
      GroupWebhookService.instance = new GroupWebhookService();
    }
    return GroupWebhookService.instance;
  }

  /**
   * Initialize the service and load configuration
   */
  public async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      await this.loadConfig();
      this.initialized = true;
      logger.info(`📡 Group Webhook Service initialized with ${this.config.length} monitored groups`);
    } catch (error) {
      logger.error(`Failed to initialize Group Webhook Service: ${error}`);
      throw error;
    }
  }

  /**
   * Load configuration from file
   */
  private async loadConfig(): Promise<void> {
    try {
      const data = await fs.readFile(CONFIG_PATH, 'utf-8');
      this.config = JSON.parse(data);
      logger.info(`✅ Loaded ${this.config.length} monitored groups from config`);
    } catch (error: unknown) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        // Config file doesn't exist, create default
        logger.info('⚠️ No monitored groups config found, creating default');
        this.config = [];
        await this.saveConfig();
      } else {
        logger.error(`Error loading monitored groups config: ${error}`);
        throw error;
      }
    }
  }

  /**
   * Save configuration to file
   */
  private async saveConfig(): Promise<void> {
    try {
      // Ensure config directory exists
      const configDir = path.dirname(CONFIG_PATH);
      await fs.mkdir(configDir, { recursive: true });
      
      await fs.writeFile(CONFIG_PATH, JSON.stringify(this.config, null, 2));
      logger.info('💾 Monitored groups config saved');
    } catch (error) {
      logger.error(`Error saving monitored groups config: ${error}`);
      throw error;
    }
  }

  /**
   * Add a group to monitor
   */
  public async addMonitoredGroup(
    groupId: string,
    webhookUrl: string,
    options: {
      groupName?: string;
      includeAttachments?: boolean;
      includeMetadata?: boolean;
    } = {}
  ): Promise<void> {
    // Check if group already exists
    const existingGroup = this.config.find(g => g.groupId === groupId);
    
    if (existingGroup) {
      // Add webhook if not already present
      if (!existingGroup.webhooks.includes(webhookUrl)) {
        existingGroup.webhooks.push(webhookUrl);
        logger.info(`📡 Added webhook to existing monitored group: ${groupId}`);
      } else {
        logger.info(`ℹ️ Webhook already exists for group: ${groupId}`);
        return;
      }
    } else {
      // Create new monitored group
      const newGroup: MonitoredGroup = {
        groupId,
        groupName: options.groupName,
        webhooks: [webhookUrl],
        enabled: true,
        includeAttachments: options.includeAttachments ?? true,
        includeMetadata: options.includeMetadata ?? true,
      };
      this.config.push(newGroup);
      logger.info(`✅ Added new monitored group: ${groupId}`);
    }

    await this.saveConfig();
  }

  /**
   * Remove a group from monitoring
   */
  public async removeMonitoredGroup(groupId: string, webhookUrl?: string): Promise<void> {
    if (webhookUrl) {
      // Remove specific webhook from group
      const group = this.config.find(g => g.groupId === groupId);
      if (group) {
        group.webhooks = group.webhooks.filter(w => w !== webhookUrl);
        
        // If no webhooks left, remove the group entirely
        if (group.webhooks.length === 0) {
          this.config = this.config.filter(g => g.groupId !== groupId);
          logger.info(`🗑️ Removed monitored group (no webhooks left): ${groupId}`);
        } else {
          logger.info(`🗑️ Removed webhook from monitored group: ${groupId}`);
        }
      }
    } else {
      // Remove entire group
      this.config = this.config.filter(g => g.groupId !== groupId);
      logger.info(`🗑️ Removed monitored group: ${groupId}`);
    }

    await this.saveConfig();
  }

  /**
   * Get all monitored groups
   */
  public getMonitoredGroups(): MonitoredGroup[] {
    return [...this.config];
  }

  /**
   * Check if a group is being monitored
   */
  public isGroupMonitored(groupId: string): boolean {
    const group = this.config.find(g => g.groupId === groupId);
    return !!group && group.enabled;
  }

  /**
   * Process incoming message and forward to webhooks if applicable
   */
  public async processMessage(message: Message): Promise<void> {
    try {
      const chat = await message.getChat();
      
      // Only process group messages
      if (!chat.isGroup) {
        return;
      }

      const groupId = chat.id._serialized;
      
      // Check if this group is being monitored
      const monitoredGroup = this.config.find(g => g.groupId === groupId && g.enabled);
      
      if (!monitoredGroup) {
        return;
      }

      logger.info(`📩 Processing message from monitored group: ${chat.name || groupId}`);

      // Build webhook payload (cast to GroupChat as we've already verified it's a group)
      const payload = await this.buildWebhookPayload(message, chat as GroupChat, monitoredGroup);

      // Send to all configured webhooks
      await Promise.all(
        monitoredGroup.webhooks.map(webhookUrl => 
          this.sendToWebhook(webhookUrl, payload)
        )
      );

    } catch (error) {
      logger.error(`Error processing message for webhooks: ${error}`);
    }
  }

  /**
   * Build webhook payload from message
   */
  private async buildWebhookPayload(
    message: Message,
    chat: GroupChat,
    config: MonitoredGroup
  ): Promise<WebhookPayload> {
    const contact = await message.getContact();
    
    // Determine message type
    let messageType: WebhookPayload['messageType'] = 'text';
    if (message.hasMedia) {
      if (message.type === 'image') messageType = 'image';
      else if (message.type === 'document') messageType = 'document';
      else if (message.type === 'audio' || message.type === 'ptt') messageType = 'audio';
      else if (message.type === 'video') messageType = 'video';
      else if (message.type === 'sticker') messageType = 'sticker';
      else messageType = 'other';
    }

    const payload: WebhookPayload = {
      messageId: message.id._serialized,
      groupId: chat.id._serialized,
      groupName: chat.name || 'Unknown Group',
      senderId: contact.id._serialized,
      senderName: contact.pushname || contact.number,
      timestamp: message.timestamp,
      message: message.body,
      messageType,
      hasMedia: message.hasMedia,
      isForwarded: message.isForwarded,
      isReply: message.hasQuotedMsg,
    };

    // Add quoted message if present
    if (message.hasQuotedMsg) {
      try {
        const quotedMsg = await message.getQuotedMessage();
        const quotedContact = await quotedMsg.getContact();
        payload.quotedMessage = {
          senderId: quotedContact.id._serialized,
          message: quotedMsg.body,
        };
      } catch (error) {
        logger.warn(`Could not fetch quoted message: ${error}`);
      }
    }

    // Add attachment if present and enabled
    if (message.hasMedia && config.includeAttachments) {
      try {
        const media = await message.downloadMedia();
        if (media) {
          payload.attachment = {
            filename: media.filename || `attachment_${message.timestamp}`,
            mimetype: media.mimetype,
            data: media.data, // base64 encoded
            size: Buffer.from(media.data, 'base64').length,
          };
          logger.info(`📎 Attachment included: ${payload.attachment.filename} (${(payload.attachment.size / 1024).toFixed(2)} KB)`);
        }
      } catch (error) {
        logger.error(`Failed to download media: ${error}`);
      }
    }

    // Add metadata if enabled
    if (config.includeMetadata) {
      payload.metadata = {
        botId: process.env.BOT_ID || 'unknown',
        botName: process.env.BOT_NAME || 'WhatsApp Bot',
        forwardedAt: new Date().toISOString(),
      };
    }

    return payload;
  }

  /**
   * Send payload to webhook with retry logic
   */
  private async sendToWebhook(
    webhookUrl: string,
    payload: WebhookPayload,
    retries = 3
  ): Promise<void> {
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        logger.info(`📤 Sending to webhook: ${webhookUrl} (attempt ${attempt}/${retries})`);
        
        const response = await axios.post(webhookUrl, payload, {
          headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'WhatsApp-Bot-Webhook/1.0',
          },
          timeout: 10000, // 10 seconds
        });

        if (response.status >= 200 && response.status < 300) {
          logger.info(`✅ Webhook delivered successfully: ${webhookUrl} (${response.status})`);
          return;
        } else {
          logger.warn(`⚠️ Webhook returned non-success status: ${response.status}`);
        }
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        
        if (attempt === retries) {
          logger.error(`❌ Failed to send to webhook after ${retries} attempts: ${webhookUrl}`);
          logger.error(`   Error: ${errorMessage}`);
        } else {
          logger.warn(`⚠️ Webhook attempt ${attempt} failed, retrying... (${errorMessage})`);
          // Wait before retry (exponential backoff)
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }
  }

  /**
   * Enable/disable a monitored group
   */
  public async toggleMonitoredGroup(groupId: string, enabled: boolean): Promise<void> {
    const group = this.config.find(g => g.groupId === groupId);
    if (group) {
      group.enabled = enabled;
      await this.saveConfig();
      logger.info(`${enabled ? '✅ Enabled' : '⏸️ Disabled'} monitoring for group: ${groupId}`);
    }
  }

  /**
   * Update group configuration
   */
  public async updateGroupConfig(
    groupId: string,
    updates: Partial<Omit<MonitoredGroup, 'groupId'>>
  ): Promise<void> {
    const group = this.config.find(g => g.groupId === groupId);
    if (group) {
      Object.assign(group, updates);
      await this.saveConfig();
      logger.info(`🔄 Updated configuration for group: ${groupId}`);
    }
  }

  /**
   * Test webhook connectivity
   */
  public async testWebhook(webhookUrl: string): Promise<{ success: boolean; message: string }> {
    try {
      const testPayload = {
        test: true,
        message: 'This is a test webhook from WhatsApp Bot',
        timestamp: Date.now(),
      };

      const response = await axios.post(webhookUrl, testPayload, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 5000,
      });

      if (response.status >= 200 && response.status < 300) {
        return {
          success: true,
          message: `Webhook responded with status ${response.status}`,
        };
      } else {
        return {
          success: false,
          message: `Webhook returned status ${response.status}`,
        };
      }
    } catch (error: unknown) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance
export const groupWebhookService = GroupWebhookService.getInstance();
