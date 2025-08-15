/**
 * PM2 Utilities - SISTEMA SIMPLIFICADO DE LOGGING
 * 
 * ═══════════════════════════════════════════════════════════════════════════════
 * FUNCIÓN PRINCIPAL: logPM2Event()
 * ═══════════════════════════════════════════════════════════════════════════════
 * 
 * API SIMPLIFICADA PARA LOGGING:
 * - logPM2Event(context, status, message, data?)
 * - alertPM2Failure(error, context, shouldRestart?)
 * - notifyPM2Shutdown(signal?, error?, reason?)
 * 
 * CONTEXTS: 'whatsapp' | 'browser' | 'validation' | 'startup' | 'shutdown' | 'api' | 'qr' | 'system'
 * STATUS: 'info' | 'success' | 'warning' | 'error'
 * 
 * EJEMPLOS:
 * - logPM2Event('whatsapp', 'success', 'WhatsApp conectado')
 * - logPM2Event('browser', 'error', 'Error al abrir Chrome')
 * - logPM2Event('startup', 'info', 'Iniciando aplicación')
 */

import { botLogger } from "./loggerWrapper";
import { logger } from '../services/LoggerService';

// ═══════════════════════════════════════════════════════════════════════════════
// CONFIGURACIÓN SIMPLIFICADA
// ═══════════════════════════════════════════════════════════════════════════════

class PM2Config {
  private static instance: PM2Config;
  private pm2WarningShown = false;
  private isInShutdownContext = false;

  static getInstance(): PM2Config {
    if (!PM2Config.instance) {
      PM2Config.instance = new PM2Config();
    }
    return PM2Config.instance;
  }

  get isShutdownContext() { return this.isInShutdownContext; }
  get hasShownPM2Warning() { return this.pm2WarningShown; }

  setShutdownContext(inShutdown: boolean): void {
    this.isInShutdownContext = inShutdown;
  }

  markPM2WarningShown(): void {
    this.pm2WarningShown = true;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS DE DATOS SIMPLIFICADOS
// ═══════════════════════════════════════════════════════════════════════════════

export interface PM2Event {
  context: 'whatsapp' | 'browser' | 'validation' | 'startup' | 'shutdown' | 'api' | 'qr' | 'system';
  status: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: string;
  details?: Record<string, unknown>;
}

export interface PM2FailureAlert {
  critical_failure: boolean;
  error_message: string;
  error_context: string;
  timestamp: string;
  should_restart: boolean;
  stack_trace?: string;
}

export interface PM2ShutdownNotification {
  graceful_shutdown: boolean;
  signal?: string;
  error?: string;
  timestamp: string;
  reason?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILIDADES SIMPLIFICADAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Obtiene emoji por contexto
 */
function getContextEmoji(context: string): string {
  const emojiMap: Record<string, string> = {
    whatsapp: '💬',
    browser: '🌐',
    validation: '🔍',
    api: '🔌',
    shutdown: '🛑',
    startup: '🚀',
    qr: '📱'
  };
  return emojiMap[context] || '📊';
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIÓN PRINCIPAL SIMPLIFICADA
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * ⭐ FUNCIÓN PRINCIPAL SIMPLIFICADA PARA LOGGING
 * 
 * Solo envía eventos simples a PM2 y hace logging a consola.
 * Sin monitoreo de steps, progress o estados complejos.
 */
export function logPM2Event(
  context: 'whatsapp' | 'browser' | 'validation' | 'startup' | 'shutdown' | 'api' | 'qr' | 'system',
  status: 'info' | 'success' | 'warning' | 'error',
  message: string,
  details?: Record<string, unknown>
): void {
  try {
    const config = PM2Config.getInstance();
    
    // Durante shutdown, solo errores
    if (config.isShutdownContext && status !== 'error') {
      return;
    }

    // Map status to pino level
    const level = status === 'error' ? 'error' :
                 status === 'warning' ? 'warn' :
                 'info';

    logger.log(level, message, { context, details });
    
    // Enviar a PM2 si está disponible
    if (isPM2Available()) {
      sendToPM2({
        context,
        status,
        message,
        timestamp: new Date().toISOString(),
        details
      });
    }
  } catch (error) {
    logger.error(error instanceof Error ? error : new Error(String(error)));
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES DE SOPORTE SIMPLIFICADAS
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Envía datos a PM2
 */
function sendToPM2(data: PM2Event | PM2FailureAlert | PM2ShutdownNotification): void {
  try {
    process.send!({
      type: "process:msg",
      data,
    });
  } catch (error) {
    console.error('❌ Error enviando a PM2:', error);
  }
}

/**
 * Verifica disponibilidad de PM2
 */
function isPM2Available(): boolean {
  const config = PM2Config.getInstance();
  
  if (!process.send) {
    if (!config.hasShownPM2Warning) {
      console.warn('⚠️ PM2 no disponible');
      config.markPM2WarningShown();
    }
    return false;
  }
  return true;
}

/**
 * Logging simplificado a consola
 */
function logToConsole(context: string, status: string, message: string): void {
  const config = PM2Config.getInstance();
  
  // Durante shutdown, solo errores
  if (config.isShutdownContext && status !== 'error') {
    return;
  }
  
  const emoji = getContextEmoji(context);
  
  switch (status) {
    case 'info':
      botLogger.info(`ℹ️ ${message}`, emoji);
      break;
    case 'success':
      botLogger.success(`✅ ${message}`);
      break;
    case 'warning':
      botLogger.warn(`⚠️ ${message}`);
      break;
    case 'error':
      botLogger.error(`❌ ${message}`);
      break;
  }
}

export function setShutdownContext(inShutdown: boolean): void {
  PM2Config.getInstance().setShutdownContext(inShutdown);
}

export function alertPM2Failure(
  error: Error, 
  context: string, 
  shouldRestart: boolean = false
): void {
  const failureData: PM2FailureAlert = {
    critical_failure: true,
    error_message: error.message,
    error_context: context,
    timestamp: new Date().toISOString(),
    should_restart: shouldRestart,
    stack_trace: error.stack
  };

  if (isPM2Available()) {
    sendToPM2(failureData);
  } else {
    botLogger.error(`🚨 FALLO CRÍTICO [${context}]: ${error.message.split('\n')[0]}`);
  }
}

export function notifyPM2Shutdown(
  signal?: string,
  error?: Error,
  reason?: string
): void {
  const shutdownData: PM2ShutdownNotification = {
    graceful_shutdown: true,
    signal: signal || 'manual',
    error: error?.message || undefined,
    timestamp: new Date().toISOString(),
    reason
  };

  if (isPM2Available()) {
    sendToPM2(shutdownData);
  } else {
    botLogger.info(`🛑 SHUTDOWN: ${reason || 'Manual'} (Señal: ${signal || 'manual'})`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTES SIMPLIFICADAS
// ═══════════════════════════════════════════════════════════════════════════════

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
