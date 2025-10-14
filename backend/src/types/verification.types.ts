// Types for Twilio-compatible OTP Service

export interface CreateVerificationRequest {
  to: string;
  channel: 'whatsapp' | 'sms';
  serviceSid: string;
  customMessage?: string;
  locale?: string;
}

export interface CheckVerificationRequest {
  code: string;
  to?: string;
  verificationSid?: string;
  serviceSid: string;
}

export interface VerificationResponse {
  sid: string;
  service_sid: string;
  account_sid: string;
  to: string;
  channel: 'whatsapp' | 'sms';
  status: 'pending' | 'approved' | 'failed' | 'canceled';
  valid: boolean;
  date_created: string;
  date_updated: string;
}

export interface StoredVerification {
  sid: string;
  serviceSid: string;
  phoneNumber: string;
  code: string;
  channel: 'whatsapp' | 'sms';
  status: 'pending' | 'approved' | 'failed' | 'canceled';
  attempts: number;
  createdAt: Date;
  expiresAt: Date;
  updatedAt?: Date;
  valid?: boolean;
  botId?: string;
}

export interface VerificationTemplate {
  en: string;
  es: string;
  [key: string]: string;
}

export interface OTPServiceConfig {
  codeLength: number;
  expirationMinutes: number;
  maxAttempts: number;
  messageTemplates: VerificationTemplate;
  accountSid: string;
}