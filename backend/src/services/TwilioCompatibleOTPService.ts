import crypto from 'crypto';
import { logger } from './LoggerService';
import { ConfigService } from './configService';
import { RedisOTPService } from './RedisOTPService';
import {
  CreateVerificationRequest,
  CheckVerificationRequest,
  VerificationResponse,
  StoredVerification,
  OTPServiceConfig
} from '../types/verification.types';

/**
 * Twilio-Compatible OTP Service
 * 
 * Provides 100% compatible OTP verification functionality with Twilio Verify API.
 * Supports WhatsApp message delivery via bot system with Redis persistence.
 */
export class TwilioCompatibleOTPService {
  private configService: ConfigService;
  private redisService: RedisOTPService;
  private config: OTPServiceConfig;

  constructor() {
    this.configService = ConfigService.getInstance();
    this.redisService = new RedisOTPService();
    
    this.config = {
      codeLength: 6,
      expirationMinutes: 10,
      maxAttempts: 5,
      accountSid: this.generateAccountSid(),
      messageTemplates: {
        en: 'Your verification code is: {{code}}. Valid for 10 minutes.',
        es: 'Tu código de verificación es: {{code}}. Válido por 10 minutos.'
      }
    };

    // Start cleanup interval (every 5 minutes) - Redis TTL handles most cleanup
    setInterval(() => {
      this.cleanupExpiredVerifications();
    }, 5 * 60 * 1000);

    logger.getPinoLogger().info({
      service: 'TwilioCompatibleOTPService',
      accountSid: this.config.accountSid,
      storage: 'Redis'
    }, 'OTP Service initialized with Redis storage');
  }

  /**
   * Create a new verification (send OTP code)
   */
  async createVerification(request: CreateVerificationRequest): Promise<VerificationResponse> {
    try {
      // Validate phone number
      const formattedPhone = this.formatPhoneNumber(request.to);
      if (!this.isValidPhoneNumber(formattedPhone)) {
        throw new Error('Invalid phone number format');
      }

      // Check if there's an existing pending verification for this number
      const existingVerification = await this.redisService.getVerificationByPhone(formattedPhone);
      if (existingVerification && !this.isExpired(existingVerification.expiresAt)) {
        // Return existing verification if still valid
        return this.buildVerificationResponse(existingVerification);
      }

      // Generate verification details
      const verificationSid = this.generateVerificationSid();
      const code = this.generateCode();
      const now = new Date();
      const expiresAt = this.getExpirationTime();

      // Create verification record
      const verification: StoredVerification = {
        sid: verificationSid,
        serviceSid: request.serviceSid,
        phoneNumber: formattedPhone,
        code,
        channel: request.channel,
        status: 'pending',
        attempts: 0,
        createdAt: now,
        expiresAt
      };

      // Store verification in Redis
      await this.redisService.storeVerification(verification);

      // Send message via WhatsApp
      await this.sendVerificationMessage(verification, request.customMessage, request.locale);

      logger.getPinoLogger().info({
        verificationSid,
        phoneNumber: formattedPhone,
        channel: request.channel,
        serviceSid: request.serviceSid
      }, 'Verification created and sent');

      return this.buildVerificationResponse(verification);

    } catch (error) {
      logger.getPinoLogger().error({ error, request }, 'Error creating verification');
      throw error;
    }
  }

  /**
   * Check a verification code
   */
  async checkVerification(request: CheckVerificationRequest): Promise<VerificationResponse> {
    try {
      let verification: StoredVerification | null = null;

      // Find verification by SID or phone number
      if (request.verificationSid) {
        verification = await this.redisService.getVerification(request.verificationSid);
      } else if (request.to) {
        const formattedPhone = this.formatPhoneNumber(request.to);
        verification = await this.redisService.getVerificationByPhone(formattedPhone);
      }

      if (!verification) {
        throw new Error('Verification not found');
      }

      // Check if verification is expired
      if (this.isExpired(verification.expiresAt)) {
        verification.status = 'failed';
        this.updateVerification(verification);
        throw new Error('Verification expired');
      }

      // Check if max attempts exceeded
      if (verification.attempts >= this.config.maxAttempts) {
        verification.status = 'failed';
        this.updateVerification(verification);
        throw new Error('Too many attempts');
      }

      // Validate code
      const isValidCode = this.validateCode(verification, request.code);
      verification.attempts += 1;

      if (isValidCode) {
        verification.status = 'approved';
        verification.valid = true;
        logger.getPinoLogger().info({
          verificationSid: verification.sid,
          phoneNumber: verification.phoneNumber,
          attempts: verification.attempts
        }, 'Verification approved');
      } else {
        if (verification.attempts >= this.config.maxAttempts) {
          verification.status = 'failed';
        }
        logger.getPinoLogger().warn({
          verificationSid: verification.sid,
          phoneNumber: verification.phoneNumber,
          attempts: verification.attempts,
          maxAttempts: this.config.maxAttempts
        }, 'Invalid verification code');
      }

      this.updateVerification(verification);

      if (!isValidCode) {
        throw new Error('Invalid code');
      }

      return this.buildVerificationResponse(verification);

    } catch (error) {
      logger.getPinoLogger().error({ error, request }, 'Error checking verification');
      throw error;
    }
  }

  /**
   * Get verification details by SID (public method)
   */
  async getVerificationDetails(sid: string): Promise<VerificationResponse | null> {
    const verification = await this.redisService.getVerification(sid);
    
    if (!verification) {
      return null;
    }

    return this.buildVerificationResponse(verification);
  }

  /**
   * Generate a random 6-digit verification code
   */
  private generateCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Generate a Twilio-compatible verification SID
   */
  private generateVerificationSid(): string {
    return 'VE' + crypto.randomBytes(16).toString('hex');
  }

  /**
   * Generate a Twilio-compatible account SID
   */
  private generateAccountSid(): string {
    return 'AC' + crypto.randomBytes(16).toString('hex');
  }

  /**
   * Get expiration time (current time + 10 minutes)
   */
  private getExpirationTime(): Date {
    return new Date(Date.now() + this.config.expirationMinutes * 60 * 1000);
  }

  /**
   * Check if a verification is expired
   */
  private isExpired(expirationTime: Date): boolean {
    return new Date() > expirationTime;
  }

  /**
   * Format phone number to E.164 format
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters except +
    let cleaned = phoneNumber.replace(/[^\d+]/g, '');
    
    // Add + if not present
    if (!cleaned.startsWith('+')) {
      cleaned = '+' + cleaned;
    }
    
    return cleaned;
  }

  /**
   * Validate phone number format
   */
  private isValidPhoneNumber(phoneNumber: string): boolean {
    // Basic E.164 validation: + followed by 1-15 digits
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phoneNumber);
  }

  /**
   * Store verification in Redis (replaced by direct Redis calls)
   */
  private async storeVerification(verification: StoredVerification): Promise<void> {
    await this.redisService.storeVerification(verification);
  }

  /**
   * Update verification in Redis (replaced by direct Redis calls)
   */
  private async updateVerification(verification: StoredVerification): Promise<void> {
    await this.redisService.updateVerification(verification);
  }

  /**
   * Get verification from Redis (private method)
   */
  private async getVerificationFromStorage(sid: string): Promise<StoredVerification | null> {
    return await this.redisService.getVerification(sid);
  }

  /**
   * Find verification by phone number
   */
  private async findVerificationByPhone(phoneNumber: string): Promise<StoredVerification | null> {
    return await this.redisService.getVerificationByPhone(phoneNumber);
  }

  /**
   * Validate verification code
   */
  private validateCode(verification: StoredVerification, inputCode: string): boolean {
    // Check if expired
    if (this.isExpired(verification.expiresAt)) {
      return false;
    }

    // Check if max attempts exceeded
    if (verification.attempts >= this.config.maxAttempts) {
      return false;
    }

    // Simple code comparison (consider timing-safe comparison for production)
    return verification.code === inputCode.trim();
  }

  /**
   * Send verification message via WhatsApp
   */
  private async sendVerificationMessage(
    verification: StoredVerification,
    customMessage?: string,
    locale: string = 'en'
  ): Promise<void> {
    try {
      // Get available bots
      const availableBots = this.configService.getAllBots()
        .filter(bot => bot.status === 'online' && bot.type === 'whatsapp');

      if (availableBots.length === 0) {
        throw new Error('No available bots for verification');
      }

      // Select first available bot
      const selectedBot = availableBots[0];
      verification.botId = selectedBot.id;

      // Format message
      const message = this.formatMessage(verification.code, locale, customMessage);

      // Send message via HTTP request to bot endpoint
      const botUrl = `http://localhost:${selectedBot.apiPort}`;
      const response = await fetch(`${botUrl}/send-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          phoneNumber: verification.phoneNumber,
          message,
          type: 'text'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`Failed to send verification message: ${errorData.error || response.statusText}`);
      }

      logger.getPinoLogger().info({
        verificationSid: verification.sid,
        botId: selectedBot.id,
        phoneNumber: verification.phoneNumber,
        botPort: selectedBot.apiPort
      }, 'Verification message sent via WhatsApp');

    } catch (error) {
      logger.getPinoLogger().error({
        error,
        verificationSid: verification.sid,
        phoneNumber: verification.phoneNumber
      }, 'Failed to send verification message');
      throw error;
    }
  }

  /**
   * Format verification message
   */
  private formatMessage(code: string, locale: string, customMessage?: string): string {
    if (customMessage) {
      return customMessage.replace('{{code}}', code);
    }

    const template = this.config.messageTemplates[locale] || this.config.messageTemplates.en;
    return template.replace('{{code}}', code);
  }

  /**
   * Build Twilio-compatible verification response
   */
  private buildVerificationResponse(verification: StoredVerification): VerificationResponse {
    return {
      sid: verification.sid,
      service_sid: verification.serviceSid,
      account_sid: this.config.accountSid,
      to: verification.phoneNumber,
      channel: verification.channel,
      status: verification.status,
      valid: verification.status === 'approved',
      date_created: verification.createdAt.toISOString(),
      date_updated: (verification.updatedAt || verification.createdAt).toISOString()
    };
  }

  /**
   * Clean up expired verifications (delegated to Redis)
   */
  private async cleanupExpiredVerifications(): Promise<void> {
    try {
      const cleanedCount = await this.redisService.cleanupExpired();
      
      if (cleanedCount > 0) {
        logger.getPinoLogger().info({
          cleanedCount,
          service: 'TwilioCompatibleOTPService'
        }, 'Cleaned up expired verifications via Redis');
      }
    } catch (error) {
      logger.getPinoLogger().error({
        error,
        service: 'TwilioCompatibleOTPService'
      }, 'Failed to cleanup expired verifications');
    }
  }

  /**
   * Clean up a specific verification
   */
  private async cleanupVerification(sid: string): Promise<void> {
    try {
      await this.redisService.deleteVerification(sid);
    } catch (error) {
      logger.getPinoLogger().error({
        error,
        verificationSid: sid
      }, 'Failed to cleanup specific verification');
    }
  }

  /**
   * Get verification count (for monitoring)
   */
  public async getVerificationCount(): Promise<number> {
    try {
      const stats = await this.redisService.getStats();
      return stats.totalActive;
    } catch (error) {
      logger.getPinoLogger().error({ error }, 'Failed to get verification count');
      return 0;
    }
  }

  /**
   * Get service statistics
   */
  public async getStats(): Promise<{
    totalVerifications: number;
    pendingVerifications: number;
    approvedVerifications: number;
    failedVerifications: number;
  }> {
    try {
      const redisStats = await this.redisService.getStats();
      
      return {
        totalVerifications: redisStats.totalActive,
        pendingVerifications: redisStats.pendingCount,
        approvedVerifications: redisStats.approvedCount,
        failedVerifications: redisStats.failedCount
      };
    } catch (error) {
      logger.getPinoLogger().error({ error }, 'Failed to get service statistics');
      return {
        totalVerifications: 0,
        pendingVerifications: 0,
        approvedVerifications: 0,
        failedVerifications: 0
      };
    }
  }
}