import { BotCommunicationService } from '../botProxy/BotCommunicationService';
import { ConfigService } from '../configService';

/**
 * Interface para Twilio-compatible Verification response
 * Basado en: https://www.twilio.com/docs/verify/api/verification
 */
export interface TwilioVerificationResponse {
  sid: string;                    // Verification ID (VE + 32 chars)
  service_sid: string;           // Service ID (VA + 32 chars)
  account_sid: string;           // Account ID (AC + 32 chars)
  to: string;                    // Phone number in E.164 format
  channel: string;               // "whatsapp", "sms", "call", "email"
  status: string;                // "pending", "approved", "canceled", "failed", "expired"
  valid: boolean;                // false until verification is complete
  date_created: string;          // ISO 8601 timestamp
  date_updated: string;          // ISO 8601 timestamp
  lookup: Record<string, any>;   // Carrier lookup data (empty for now)
  amount: string | null;         // PSD2 transaction amount (null for now)
  payee: string | null;          // PSD2 payee (null for now)
  send_code_attempts: Array<{    // Array of send attempts
    time: string;
    channel: string;
    attempt_sid: string;
  }>;
  sna: Record<string, any> | null; // Silent Network Auth data (null for WhatsApp)
  url: string;                   // API URL for this verification
}

/**
 * Interface para Twilio-compatible Verification Check response
 * Basado en: https://www.twilio.com/docs/verify/api/verification-check
 */
export interface TwilioVerificationCheckResponse {
  sid: string;                    // Same as verification sid
  service_sid: string;           // Service ID
  account_sid: string;           // Account ID
  to: string;                    // Phone number
  channel: string;               // Channel used
  status: string;                // "approved" or "failed"
  valid: boolean;                // true if verification successful
  amount: string | null;         // PSD2 amount (null)
  payee: string | null;          // PSD2 payee (null)
  sna_attempts_error_codes: string[]; // SNA error codes (empty for WhatsApp)
  date_created: string;          // Original creation timestamp
  date_updated: string;          // Check timestamp
}

/**
 * Interface para almacenar códigos de verificación temporalmente
 */
interface VerificationCode {
  id: string;                    // Verification SID
  service_sid: string;           // Service SID
  account_sid: string;           // Account SID
  to: string;                    // Phone number
  channel: string;               // Channel
  code: string;                  // Generated verification code
  attempts: number;              // Number of check attempts
  max_attempts: number;          // Maximum allowed attempts
  created_at: Date;              // Creation timestamp
  expires_at: Date;              // Expiration timestamp
  status: string;                // Current status
  botId?: string;                // Bot used for sending
}

/**
 * Configuración para crear verificación
 */
export interface CreateVerificationOptions {
  to: string;                    // Phone number in E.164 format
  channel: string;               // "whatsapp" (primary), "sms" (fallback)
  custom_message?: string;       // Custom message template
  locale?: string;               // Language code (es, en, fr, etc.)
  code_length?: number;          // Code length (4-10 digits)
  botId?: string;                // Specific bot to use
  service_sid?: string;          // Service SID (optional)
  account_sid?: string;          // Account SID (optional)
}

/**
 * Configuración para verificar código
 */
export interface CheckVerificationOptions {
  code: string;                  // 4-10 digit verification code
  to?: string;                   // Phone number OR verification_sid required
  verification_sid?: string;     // Verification SID OR to required
  service_sid?: string;          // Service SID (optional)
  account_sid?: string;          // Account SID (optional)
}

/**
 * Servicio de OTP compatible con Twilio Verify API
 * Implementa la misma estructura de respuesta y comportamiento que Twilio
 */
export class TwilioCompatibleOTPService {
  private verificationCodes: Map<string, VerificationCode> = new Map();
  private phoneToVerificationMap: Map<string, string> = new Map(); // phone -> verification_sid
  private botCommunicationService: BotCommunicationService;
  private configService: ConfigService;

  // Configuración por defecto
  private readonly DEFAULT_CODE_LENGTH = 6;
  private readonly DEFAULT_MAX_ATTEMPTS = 5;
  private readonly DEFAULT_EXPIRY_MINUTES = 10;
  private readonly DEFAULT_SERVICE_SID = 'VAaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'; // Default service
  private readonly DEFAULT_ACCOUNT_SID = 'ACaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'; // Default account

  constructor() {
    this.botCommunicationService = new BotCommunicationService();
    this.configService = ConfigService.getInstance();
    
    // Limpiar códigos expirados cada minuto
    setInterval(() => {
      this.cleanupExpiredCodes();
    }, 60000);
  }

  /**
   * Crear una nueva verificación (equivalente a Twilio's create verification)
   * POST /verify/v2/Services/{ServiceSid}/Verifications
   */
  public async createVerification(options: CreateVerificationOptions): Promise<TwilioVerificationResponse> {
    const {
      to,
      channel = 'whatsapp',
      custom_message,
      locale = 'es',
      code_length = this.DEFAULT_CODE_LENGTH,
      botId,
      service_sid = this.DEFAULT_SERVICE_SID,
      account_sid = this.DEFAULT_ACCOUNT_SID
    } = options;

    // Validar número de teléfono E.164
    if (!this.isValidE164(to)) {
      throw new Error('Phone number must be in E.164 format (e.g., +1234567890)');
    }

    // Validar canal
    if (!['whatsapp', 'sms'].includes(channel)) {
      throw new Error('Channel must be whatsapp or sms');
    }

    // Cancelar verificación pendiente si existe
    const existingVerificationSid = this.phoneToVerificationMap.get(to);
    if (existingVerificationSid) {
      const existingVerification = this.verificationCodes.get(existingVerificationSid);
      if (existingVerification && existingVerification.status === 'pending') {
        existingVerification.status = 'canceled';
      }
    }

    // Generar nuevo verification SID (formato Twilio: VE + 32 chars)
    const verificationSid = 'VE' + this.generateRandomHex(32);
    
    // Generar código de verificación
    const code = this.generateVerificationCode(code_length);
    
    // Timestamps
    const now = new Date();
    const expiresAt = new Date(now.getTime() + this.DEFAULT_EXPIRY_MINUTES * 60 * 1000);

    // Crear registro de verificación
    const verification: VerificationCode = {
      id: verificationSid,
      service_sid,
      account_sid,
      to,
      channel,
      code,
      attempts: 0,
      max_attempts: this.DEFAULT_MAX_ATTEMPTS,
      created_at: now,
      expires_at: expiresAt,
      status: 'pending',
      botId
    };

    // Almacenar la verificación
    this.verificationCodes.set(verificationSid, verification);
    this.phoneToVerificationMap.set(to, verificationSid);

    // Enviar el código por WhatsApp
    try {
      const selectedBotId = botId || await this.selectAvailableBot();
      if (!selectedBotId) {
        verification.status = 'failed';
        throw new Error('No available bots for sending verification code');
      }

      verification.botId = selectedBotId;
      
      const message = this.buildVerificationMessage(code, custom_message, locale);
      
      await this.sendVerificationMessage(selectedBotId, to, message, channel);
      
      console.log(`Verification code sent successfully to ${to} via ${channel}`);
    } catch (error) {
      verification.status = 'failed';
      console.error('Failed to send verification code:', error);
      // No throw aquí - retornamos la respuesta con status failed
    }

    // Construir respuesta compatible con Twilio
    const response: TwilioVerificationResponse = {
      sid: verificationSid,
      service_sid,
      account_sid,
      to,
      channel,
      status: verification.status,
      valid: false,
      date_created: now.toISOString(),
      date_updated: now.toISOString(),
      lookup: {},
      amount: null,
      payee: null,
      send_code_attempts: [{
        time: now.toISOString(),
        channel,
        attempt_sid: 'VL' + this.generateRandomHex(32)
      }],
      sna: null,
      url: `https://verify.twilio.com/v2/Services/${service_sid}/Verifications/${verificationSid}`
    };

    return response;
  }

  /**
   * Verificar un código (equivalente a Twilio's verification check)
   * POST /verify/v2/Services/{ServiceSid}/VerificationCheck
   */
  public async checkVerification(options: CheckVerificationOptions): Promise<TwilioVerificationCheckResponse> {
    const {
      code,
      to,
      verification_sid,
      service_sid = this.DEFAULT_SERVICE_SID,
      account_sid = this.DEFAULT_ACCOUNT_SID
    } = options;

    if (!code) {
      throw new Error('Code is required');
    }

    if (!to && !verification_sid) {
      throw new Error('Either phone number (to) or verification_sid must be provided');
    }

    // Buscar la verificación
    let verification: VerificationCode | undefined;
    let actualVerificationSid: string;

    if (verification_sid) {
      verification = this.verificationCodes.get(verification_sid);
      actualVerificationSid = verification_sid;
    } else if (to) {
      actualVerificationSid = this.phoneToVerificationMap.get(to) || '';
      verification = this.verificationCodes.get(actualVerificationSid);
    } else {
      throw new Error('Verification not found');
    }

    if (!verification) {
      throw new Error('Verification not found or has expired');
    }

    // Verificar si ya expiró
    if (new Date() > verification.expires_at) {
      verification.status = 'expired';
      throw new Error('Verification has expired');
    }

    // Verificar si ya se alcanzó el máximo de intentos
    if (verification.attempts >= verification.max_attempts) {
      verification.status = 'max_attempts_reached';
      throw new Error('Maximum verification attempts reached');
    }

    // Incrementar intentos
    verification.attempts++;

    // Verificar el código
    const isValidCode = verification.code === code;
    const now = new Date();

    if (isValidCode) {
      verification.status = 'approved';
      // Limpiar de mapas (ya no es necesario)
      this.verificationCodes.delete(actualVerificationSid);
      this.phoneToVerificationMap.delete(verification.to);
    } else {
      verification.status = verification.attempts >= verification.max_attempts ? 'max_attempts_reached' : 'pending';
    }

    // Construir respuesta compatible con Twilio
    const response: TwilioVerificationCheckResponse = {
      sid: actualVerificationSid,
      service_sid,
      account_sid,
      to: verification.to,
      channel: verification.channel,
      status: isValidCode ? 'approved' : 'failed',
      valid: isValidCode,
      amount: null,
      payee: null,
      sna_attempts_error_codes: [],
      date_created: verification.created_at.toISOString(),
      date_updated: now.toISOString()
    };

    return response;
  }

  /**
   * Generar código de verificación numérico
   */
  private generateVerificationCode(length: number): string {
    const min = Math.pow(10, length - 1);
    const max = Math.pow(10, length) - 1;
    return Math.floor(Math.random() * (max - min + 1) + min).toString();
  }

  /**
   * Generar hexadecimal aleatorio para SIDs
   */
  private generateRandomHex(length: number): string {
    const chars = '0123456789abcdef';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Validar formato E.164 de número telefónico
   */
  private isValidE164(phoneNumber: string): boolean {
    const e164Regex = /^\+[1-9]\d{1,14}$/;
    return e164Regex.test(phoneNumber);
  }

  /**
   * Seleccionar bot disponible automáticamente
   */
  private async selectAvailableBot(): Promise<string | null> {
    try {
      const bots = this.configService.getAllBots();
      const onlineBots = bots.filter((bot: any) => bot.status === 'online' && bot.type === 'whatsapp' && bot.enabled);
      
      if (onlineBots.length === 0) {
        return null;
      }

      // Retornar el primer bot online disponible
      return onlineBots[0].id;
    } catch (error) {
      console.error('Error selecting available bot:', error);
      return null;
    }
  }

  /**
   * Construir mensaje de verificación con template
   */
  private buildVerificationMessage(code: string, customMessage?: string, locale: string = 'es'): string {
    if (customMessage) {
      return customMessage.replace('{{code}}', code);
    }

    // Templates por defecto por idioma
    const templates: Record<string, string> = {
      'es': `Tu código de verificación es: *${code}*\n\nEste código es válido por 10 minutos.\n\n¿No solicitaste este código? Ignora este mensaje.`,
      'en': `Your verification code is: *${code}*\n\nThis code is valid for 10 minutes.\n\nDidn't request this code? Please ignore this message.`,
      'fr': `Votre code de vérification est: *${code}*\n\nCe code est valide pendant 10 minutes.\n\nVous n'avez pas demandé ce code? Ignorez ce message.`,
      'pt': `Seu código de verificação é: *${code}*\n\nEste código é válido por 10 minutos.\n\nNão solicitou este código? Ignore esta mensagem.`
    };

    return templates[locale] || templates['es'];
  }

  /**
   * Enviar mensaje de verificación vía WhatsApp
   */
  private async sendVerificationMessage(botId: string, to: string, message: string, channel: string): Promise<void> {
    if (channel === 'whatsapp') {
      await this.botCommunicationService.forwardRequest({
        botId,
        endpoint: '/send-message',
        method: 'POST',
        requestData: {
          phoneNumber: to,
          message
        }
      });
    } else {
      // Para SMS, aquí se integraría con un proveedor SMS
      throw new Error('SMS channel not implemented yet');
    }
  }

  /**
   * Limpiar códigos expirados
   */
  private cleanupExpiredCodes(): void {
    const now = new Date();
    const expiredKeys: string[] = [];

    for (const [key, verification] of this.verificationCodes.entries()) {
      if (now > verification.expires_at) {
        expiredKeys.push(key);
        this.phoneToVerificationMap.delete(verification.to);
      }
    }

    expiredKeys.forEach(key => {
      this.verificationCodes.delete(key);
    });

    if (expiredKeys.length > 0) {
      console.log(`Cleaned up ${expiredKeys.length} expired verification codes`);
    }
  }

  /**
   * Obtener estadísticas del servicio (para debugging)
   */
  public getStats(): {
    totalActive: number;
    byStatus: Record<string, number>;
    byChannel: Record<string, number>;
  } {
    const stats = {
      totalActive: this.verificationCodes.size,
      byStatus: {} as Record<string, number>,
      byChannel: {} as Record<string, number>
    };

    for (const verification of this.verificationCodes.values()) {
      stats.byStatus[verification.status] = (stats.byStatus[verification.status] || 0) + 1;
      stats.byChannel[verification.channel] = (stats.byChannel[verification.channel] || 0) + 1;
    }

    return stats;
  }
}