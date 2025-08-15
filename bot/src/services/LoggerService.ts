/**
 * Logger Service - Unified Logging Class
 * Contains logging class with state and configuration management
 */

import * as fs from "fs";
import * as path from "path";
import pino from 'pino';
import io from '@pm2/io';
import { METRICS, MetricDefinition } from '../types/metrics';
import { WHATSAPP_LIFECYCLE_STEPS } from '../utils/pm2Utils_unified';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

export interface LoggerConfig {
  logLevel: LogLevel;
  logToFile: boolean;
  logToConsole: boolean;
  logDirectory: string;
}

/**
 * Unified Logger Service Class
 * Manages logging state, configuration, and file operations
 */
export class LoggerService {
  private static instance: LoggerService;
  private logger: pino.Logger;
  private metrics: Map<string, any>;
  private ready: boolean = false;

  private constructor(config?: LoggerConfig) {
    // Default config for simple usage
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
          this.metrics.set(key, io.meter({
            name: metric.name,
            id: metric.id
          }));
          break;
        case 'counter':
          this.metrics.set(key, io.counter({
            name: metric.name,
            id: metric.id
          }));
          break;
        case 'histogram':
          this.metrics.set(key, io.histogram({
            name: metric.name,
            id: metric.id,
            measurement: 'median'
          }));
          break;
        case 'metric':
          this.metrics.set(key, io.metric({
            name: metric.name,
            id: metric.id,
            unit: metric.unit
          }));
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
    } catch (error) {
      // Silent fail for logging errors to avoid recursion
    }
  }

  // ===== CORE LOGGING METHODS =====
  public info(message: string, emoji?: string, filename?: string): void {
    const consoleMessage = emoji ? `${emoji} ${message}` : message;

    if (this.config.logToConsole) {
      // eslint-disable-next-line no-console
      console.log(consoleMessage);
    }

    if (filename) {
      this.writeToFile(filename, message);
    }
  }

  public error(message: string, filename?: string): void {
    const consoleMessage = `❌ ${message}`;

    if (this.config.logToConsole) {
      // eslint-disable-next-line no-console
      console.error(consoleMessage);
    }

    if (filename) {
      this.writeToFile(filename, message);
    }
  }

  public warn(message: string, filename?: string): void {
    const consoleMessage = `⚠️ ${message}`;

    if (this.config.logToConsole) {
      // eslint-disable-next-line no-console
      console.warn(consoleMessage);
    }

    if (filename) {
      this.writeToFile(filename, message);
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
    this.logger[level]({ 
      context,
      timestamp: new Date().toISOString()
    }, message);
  }

  public error(error: Error, context?: Record<string, unknown>): void {
    this.logger.error({ 
      error,
      context,
      timestamp: new Date().toISOString(),
      stack: error.stack
    }, error.message);

    io.notifyError(error);
    this.updateMetric('ERRORS');
  }

  public updateMetric(
    metricKey: keyof typeof METRICS,
    value?: number
  ): void {
    if (!this.ready) return;

    const metric = this.metrics.get(metricKey);
    if (!metric) {
      this.log('warn', `Metric ${metricKey} not found`);
      return;
    }

    const metricDef = METRICS[metricKey];
    switch (metricDef.type) {
      case 'meter':
        metric.mark();
        break;
      case 'counter':
        metric.inc(value || 1);
        break;
      case 'histogram':
      case 'metric':
        if (value !== undefined) {
          metric.set(value);
        }
        break;
    }
  }

  public logLifecycleStep(step: keyof typeof WHATSAPP_LIFECYCLE_STEPS): void {
    const timestamp = new Date().toISOString();
    this.log('info', `Lifecycle Step: ${step}`, { step, timestamp });
    
    switch (step) {
      case 'CONNECTED':
        this.updateMetric('WHATSAPP_CONNECTIONS');
        break;
      case 'QR_READY':
        this.updateMetric('QR_CODES');
        break;
      case 'MESSAGE_RECEIVED':
        this.updateMetric('MESSAGES');
        break;
    }
  }
}

// Export for backward compatibility
export const UnifiedLogger = LoggerService;
export const Logger = LoggerService;

// Export singleton instance
export const logger = LoggerService.getInstance();
