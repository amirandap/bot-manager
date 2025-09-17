/**
 * Logger Service - Unified Logging Class
 * Contains logging class with state and configuration management
 */

import * as fs from "fs";
import * as path from "path";
import pino from 'pino';
import tx2 from 'tx2';
import { METRICS } from '../types/metrics';
import { LogLevel, LoggerConfig } from '../types/services';

// WhatsApp Lifecycle Steps - migrated from pm2Utils_unified to eliminate dependency
export const WHATSAPP_LIFECYCLE_STEPS = {
  INITIALIZING: 'whatsapp_initializing',
  BROWSER_LAUNCHING: 'whatsapp_browser_launching',
  WAITING_FOR_QR: 'whatsapp_waiting_for_qr',
  QR_READY: 'whatsapp_qr_ready',
  QR_SCANNED: 'whatsapp_qr_scanned',
  AUTHENTICATING: 'whatsapp_authenticating',
  CONNECTED: 'whatsapp_connected',
  READY: 'whatsapp_ready',
  DISCONNECTED: 'whatsapp_disconnected',
  RECONNECTING: 'whatsapp_reconnecting',
  LOADING: 'whatsapp_loading',
  ERROR_BROWSER: 'whatsapp_error_browser',
  ERROR_CHROME: 'whatsapp_error_chrome',
  ERROR_VALIDATION: 'whatsapp_error_validation',
  ERROR_CONNECTION: 'whatsapp_error_connection',
  ERROR_AUTHENTICATION: 'whatsapp_error_authentication',
  ERROR_UNKNOWN: 'whatsapp_error_unknown',
  QR_ERROR: 'whatsapp_qr_error',
  STOPPING: 'whatsapp_stopping',
  STOPPED: 'whatsapp_stopped'
} as const;

/**
 * Unified Logger Service Class
 * Manages logging state, configuration, and file operations
 */
export class LoggerService {
  private static instance: LoggerService;
  private logger: pino.Logger;
  private metrics: Map<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  private ready: boolean = false;
  private config: LoggerConfig;
  private isShutdownContext: boolean = false;

  private constructor(config?: LoggerConfig) {
    // Default config for simple usage
    this.config = config || {
      logLevel: LogLevel.INFO,
      logToFile: false,
      logToConsole: true,
      logDirectory: "./logs",
      silentMetrics: process.env.SILENT_METRICS !== "false" // Por defecto true, evitar ruido en logs
    };
    
    this.logger = pino({
      level: process.env.LOG_LEVEL || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'SYS:standard'
        }
      }
    });

    this.metrics = new Map();
    this.initializeMetrics();
  }

  private initializeMetrics(): void {
    Object.entries(METRICS).forEach(([key, metric]) => {
      switch (metric.type) {
        case 'meter':
          // Usar counter como meter no está disponible en tx2
          this.metrics.set(key, tx2.counter(metric.name));
          break;
        case 'counter':
          this.metrics.set(key, tx2.counter(metric.name));
          break;
        case 'histogram':
          // Usar metric simple como histogram no está disponible en tx2
          this.metrics.set(key, tx2.metric(metric.name, () => 0));
          break;
        case 'metric':
          this.metrics.set(key, tx2.metric(metric.name, () => 0));
          break;
      }
    });
    this.ready = true;
  }

  public static getInstance(config?: LoggerConfig): LoggerService {
    if (!LoggerService.instance) {
      LoggerService.instance = new LoggerService(config);
    }
    return LoggerService.instance;
  }

  private ensureLogDirectory(): void {
    if (!fs.existsSync(this.config.logDirectory)) {
      fs.mkdirSync(this.config.logDirectory, { recursive: true });
    }
  }

  private writeToFile(filename: string, message: string): void {
    if (!this.config.logToFile) return;

    try {
      const logFile = path.join(this.config.logDirectory, filename);
      const timestamp = new Date().toISOString();
      const formattedMessage = `${timestamp} - ${message}\n`;
      fs.appendFileSync(logFile, formattedMessage);
    } catch {
      // Silent fail for logging errors to avoid recursion
    }
  }

  // ===== CORE LOGGING METHODS =====
  public info(message: string, emoji?: string, filename?: string): void;
  public info(message: string, emoji: string, filename: string, metric: keyof typeof METRICS, value: string | number): void;
  public info(message: string, emoji?: string, filename?: string, metric?: keyof typeof METRICS, value?: string | number): void {
    const consoleMessage = emoji ? `${emoji} ${message}` : message;

    if (this.config.logToConsole) {
      console.log(consoleMessage);
    }

    if (filename) {
      this.writeToFile(filename, message);
    }

    // Update metric if provided
    if (metric !== undefined && value !== undefined) {
      this.updateMetric(metric, value);
    }
  }

  public warn(message: string, filename?: string): void;
  public warn(message: string, filename: string, metric: keyof typeof METRICS, value: string | number): void;
  public warn(message: string, filename?: string, metric?: keyof typeof METRICS, value?: string | number): void {
    const consoleMessage = `⚠️ ${message}`;

    if (this.config.logToConsole) {
      console.warn(consoleMessage);
    }

    if (filename) {
      this.writeToFile(filename, message);
    }

    // Update metric if provided
    if (metric !== undefined && value !== undefined) {
      this.updateMetric(metric, value);
    }
  }

  public success(message: string, filename?: string): void {
    this.info(message, "✅", filename);
  }

  public lifecycle(message: string): void {
    this.info(message, "🔄", "lifecycle.log");
  }

  // ===== BOT-SPECIFIC METHODS =====
  // Unified request logging
  public logRequest(endpoint: string, requestId: string, status: 'received' | 'completed' | 'failed'): void {
    const emojis = { received: "📥", completed: "✅", failed: "❌" };
    const messages = { 
      received: "received", 
      completed: "completed", 
      failed: "failed" 
    };
    
    if (status === 'failed') {
      this.error(`${endpoint} request ${requestId} ${messages[status]}`);
    } else {
      this.info(`${endpoint} request ${requestId} ${messages[status]}`, emojis[status]);
    }
  }

  // Unified processing logging
  public logProcessing(type: 'message' | 'media' | 'group' | 'phone', action: string, target: string): void {
    const emojis = { message: "💬", media: "📎", group: "🏢", phone: "📱" };
    this.info(`${action}: ${target}`, emojis[type]);
  }

  public environmentInfo(message: string): void {
    this.info(message, "📁");
  }

  public errorWithContext(message: string, error: unknown): void {
    const errorMsg = error instanceof Error ? error.message : String(error);
    this.error(`${message}: ${errorMsg}`);
  }

  // ===== STARTUP & VALIDATION METHODS =====
  public startupHeader(title: string): void {
    const separator = "=".repeat(60);
    this.info(`\n${separator}`);
    this.info(title);
    this.info(separator);
  }

  public environmentVar(name: string, value: string | number, source: string): void {
    this.info(`${name}: ${value} (${source})`, "📋");
  }

  public filePath(name: string, pathValue: string): void {
    this.info(`${name}: ${pathValue}`, "📁");
  }

  // Unified Chrome validation logging
  public logChrome(action: 'check' | 'found' | 'notFound' | 'notExecutable' | 'success' | 'alternatives', pathValue?: string, error?: unknown): void {
    switch (action) {
      case 'check':
        this.info(`Checking Chrome executable at: ${pathValue}`, "🔍");
        break;
      case 'found':
        this.info(`Found: ${pathValue}`, "   ");
        break;
      case 'notFound':
        this.error(`Chrome executable not found at: ${pathValue}`);
        break;
      case 'notExecutable':
        this.error(`Chrome executable found but not executable: ${pathValue}`);
        this.error(`   Error: ${error}`);
        break;
      case 'success':
        this.success(`Chrome executable validated successfully: ${pathValue}`);
        break;
      case 'alternatives':
        this.info("Available alternatives:", "💡");
        break;
    }
  }

  // Unified directory operations
  public logDirectory(action: 'created' | 'exists', pathValue: string): void {
    const messages = { created: "Created directory", exists: "Directory exists" };
    const emoji = action === 'created' ? "📁" : "✅";
    this.info(`${messages[action]}: ${pathValue}`, emoji);
  }

  public log(
    level: 'debug' | 'info' | 'warn' | 'error' | 'fatal',
    message: string,
    context?: Record<string, unknown>
  ): void {
    // Durante shutdown, solo permitir errores
    if (this.isShutdownContext && level !== 'error') {
      return;
    }

    this.logger[level]({ 
      context,
      timestamp: new Date().toISOString()
    }, message);
  }

  public setShutdownContext(inShutdown: boolean): void {
    this.isShutdownContext = inShutdown;
  }

  public setSilentMetrics(silent: boolean): void {
    this.config.silentMetrics = silent;
  }

  public isSilentMetrics(): boolean {
    return this.config.silentMetrics ?? true;
  }

  public error(error: Error, context?: Record<string, unknown>): void;
  public error(message: string, context?: Record<string, unknown>): void;
  public error(message: string, context: Record<string, unknown>, metric: keyof typeof METRICS, value: number): void;
  public error(errorOrMessage: string | Error, context: Record<string, unknown> = {}, metric?: keyof typeof METRICS, value?: number): void {
    this.logger.error({ context }, typeof errorOrMessage === 'string' ? errorOrMessage : errorOrMessage.message);
    
    // Send error to PM2 for monitoring
    if (errorOrMessage instanceof Error) {
      tx2.issue(errorOrMessage);
    } else {
      tx2.issue(new Error(errorOrMessage));
    }

    // Update metric if provided
    if (metric !== undefined && value !== undefined) {
      this.updateMetric(metric, value);
    }
  }

  public updateMetric(
    metricKey: keyof typeof METRICS,
    value?: number | string
  ): void {
    if (!this.ready) {
      return;
    }

    const metric = this.metrics.get(metricKey);
    if (!metric) {
      // Solo log si no estamos en modo silencioso
      if (!this.config.silentMetrics) {
        this.log('warn', `Metric ${metricKey} not found`);
      }
      return;
    }

    const metricDef = METRICS[metricKey];
    switch (metricDef.type) {
      case 'meter':
      case 'counter':
        // For counters and meters, only accept numbers
        if (typeof value === 'number') {
          if (value < 0 && metric.dec) {
            metric.dec(Math.abs(value));
          } else if (metric.inc) {
            metric.inc(value || 1);
          }
        } else if (value === undefined && metric.inc) {
          metric.inc(1);
        }
        break;
      case 'histogram':
      case 'metric':
        // For metrics, accept both strings and numbers
        if (value !== undefined && metric.set) {
          metric.set(value);
        }
        break;
    }

    // Solo logear métricas si no estamos en modo silencioso y es un error o advertencia
    if (!this.config.silentMetrics && metricDef.type === 'counter' && metricKey === 'ERRORS') {
      this.log('debug', `Metric updated: ${metricKey} = ${value}`);
    }
  }

  public logLifecycleStep(step: keyof typeof WHATSAPP_LIFECYCLE_STEPS): void {
    const timestamp = new Date().toISOString();
    this.log('info', `Lifecycle Step: ${step}`, { step, timestamp });
    
    // Update custom status based on lifecycle step
    this.updateCustomStatus(step);
    
    switch (step) {
      case 'CONNECTED':
        this.updateMetric('WHATSAPP_CONNECTIONS');
        break;
      case 'QR_READY':
        this.updateMetric('QR_CODES');
        break;
      case 'READY':
        this.updateMetric('MESSAGES');
        break;
    }
  }

  /**
   * Update custom PM2 status based on WhatsApp state
   */
  private updateCustomStatus(step: keyof typeof WHATSAPP_LIFECYCLE_STEPS): void {
    if (!this.ready) {
      return;
    }

    try {
      // Map lifecycle steps to user-friendly status messages
      const statusMap: Record<string, string> = {
        'INITIALIZING': 'Starting up',
        'BROWSER_LAUNCHING': 'Launching Chrome',
        'WAITING_FOR_QR': 'Generating QR',
        'QR_READY': 'QR Ready - Scan me!',
        'QR_SCANNED': 'QR Scanned',
        'AUTHENTICATING': 'Authenticating',
        'CONNECTED': 'WhatsApp Connected',
        'READY': 'Ready & Operational',
        'DISCONNECTED': 'Disconnected',
        'RECONNECTING': 'Reconnecting...',
        'ERROR_BROWSER': 'Chrome Error',
        'ERROR_CHROME': 'Chrome Not Found',
        'ERROR_VALIDATION': 'Validation Error',
        'ERROR_CONNECTION': 'Connection Error',
        'ERROR_AUTHENTICATION': 'Auth Failed',
        'STOPPING': 'Shutting down',
        'STOPPED': 'Stopped'
      };

      const customStatus = statusMap[step] || step;
      
      // Create or update a custom status metric
      if (!this.metrics.has('CUSTOM_STATUS')) {
        const statusMetric = tx2.metric({
          name: 'Bot Status',
          unit: 'status',
          value: customStatus
        });
        this.metrics.set('CUSTOM_STATUS', statusMetric);
      }

      const statusMetric = this.metrics.get('CUSTOM_STATUS');
      if (statusMetric && statusMetric.set) {
        statusMetric.set(customStatus);
      }
    } catch {
      // Silent fail to avoid logging recursion - no logging de métricas aquí
    }
  }

  public notifyShutdown(signal?: string, error?: Error, reason?: string): void {
    const shutdownData = {
      graceful_shutdown: true,
      signal: signal || 'manual',
      error: error?.message,
      timestamp: new Date().toISOString(),
      reason
    };
    
    this.log('info', `🛑 SHUTDOWN: ${reason || 'Manual'} (Signal: ${signal || 'manual'})`, shutdownData);
    
    if (error) {
      this.error(error, { component: 'shutdown', signal, reason });
    }
  }

  /**
   * Update client push name metric
   */
  public updateClientPushName(pushName: string): void {
    this.updateMetric('CLIENT_PUSHNAME', pushName);
    if (!this.config.silentMetrics) {
      this.log('info', `Client push name updated: ${pushName}`, { pushName, metric: 'CLIENT_PUSHNAME' });
    }
  }

  /**
   * Update client phone number metric
   */
  public updateClientPhoneNumber(phoneNumber: string): void {
    this.updateMetric('CLIENT_PHONE', phoneNumber);
    if (!this.config.silentMetrics) {
      this.log('info', `Client phone number updated: ${phoneNumber}`, { phoneNumber, metric: 'CLIENT_PHONE' });
    }
  }
}

// Export for backward compatibility
export const UnifiedLogger = LoggerService;
export const Logger = LoggerService;

// Export singleton instance
export const logger = LoggerService.getInstance();
