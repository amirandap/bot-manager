/**
 * 🎯 MASTER LOGGER - Sistema Unificado Total
 * 
 * UNA SOLA FUNCIÓN para: Logging + Métricas PM2 + Alertas + Estados + Todo
 * 
 * Reemplaza TODAS las funciones de logging del codebase:
 * - logPM2Event()
 * - botLogger.*()
 * - alertPM2Failure()
 * - updatePM2Metrics()
 * - updatePM2System()
 * - logWhatsAppOperation()
 */

import * as io from '@pm2/io';
import * as tx2 from 'tx2';
import { botLogger } from './loggerWrapper';

// ═══════════════════════════════════════════════════════════════════════════════
// TIPOS CENTRALIZADOS
// ═══════════════════════════════════════════════════════════════════════════════

export type ComponentType = 
  | 'startup' 
  | 'whatsapp' 
  | 'api' 
  | 'system' 
  | 'shutdown' 
  | 'validation' 
  | 'browser' 
  | 'qr';

export type ActionType = 
  | 'start'      // Iniciando operación
  | 'progress'   // Progreso de operación  
  | 'success'    // Operación exitosa
  | 'error'      // Error o fallo
  | 'warning'    // Advertencia
  | 'ready';     // Componente listo/operacional

export interface UnifiedContext {
  error?: Error;                    // Error object si aplica
  progress?: number;                // Progreso 0-100
  metadata?: Record<string, any>;   // Datos adicionales
  critical?: boolean;               // Si es error crítico que requiere atención
  shouldRestart?: boolean;          // Si requiere restart del proceso
  step?: string;                    // Paso específico de la operación
}

// ═══════════════════════════════════════════════════════════════════════════════
// ESTADO INTERNO
// ═══════════════════════════════════════════════════════════════════════════════

class MasterLoggerState {
  private static instance: MasterLoggerState;
  private components: Map<ComponentType, any> = new Map();
  private pm2Metrics: Map<string, any> = new Map();
  private isInitialized = false;
  private shutdownMode = false;

  static getInstance(): MasterLoggerState {
    if (!MasterLoggerState.instance) {
      MasterLoggerState.instance = new MasterLoggerState();
    }
    return MasterLoggerState.instance;
  }

  initialize(): void {
    if (this.isInitialized) return;
    
    try {
      // Inicializar PM2.io
      io.init();
      
      // Crear métricas base para cada componente
      this.setupComponentMetrics();
      
      this.isInitialized = true;
    } catch (error) {
      // Fallback silencioso
      console.warn('PM2.io initialization failed, falling back to console logging');
    }
  }

  private setupComponentMetrics(): void {
    const components: ComponentType[] = ['startup', 'whatsapp', 'api', 'system', 'shutdown', 'validation', 'browser', 'qr'];
    
    components.forEach(component => {
      // Crear métricas PM2 para cada componente
      this.pm2Metrics.set(`${component}_status`, io.metric({
        name: `${component}_status_code`,
        value: () => this.getComponentStatusCode(component)
      }));
      
      this.pm2Metrics.set(`${component}_errors`, io.counter({
        name: `${component}_errors`
      }));
      
      this.pm2Metrics.set(`${component}_success`, io.counter({
        name: `${component}_success_count`
      }));
      
      // Estado inicial
      this.components.set(component, {
        status: 'initializing',
        errorCount: 0,
        successCount: 0,
        lastUpdate: new Date(),
        lastMessage: ''
      });
    });
  }

  updateComponent(component: ComponentType, action: ActionType, message: string): void {
    const current = this.components.get(component) || {};
    
    // Actualizar contadores
    if (action === 'error') {
      current.errorCount++;
      const counter = this.pm2Metrics.get(`${component}_errors`);
      if (counter) counter.inc();
    }
    
    if (action === 'success' || action === 'ready') {
      current.successCount++;
      const counter = this.pm2Metrics.get(`${component}_success`);
      if (counter) counter.inc();
    }
    
    // Actualizar estado
    current.status = this.mapActionToStatus(action);
    current.lastUpdate = new Date();
    current.lastMessage = message;
    
    this.components.set(component, current);
  }

  private mapActionToStatus(action: ActionType): string {
    switch (action) {
      case 'start': return 'starting';
      case 'progress': return 'running';
      case 'success': case 'ready': return 'running';
      case 'warning': return 'warning';
      case 'error': return 'error';
      default: return 'unknown';
    }
  }

  private getComponentStatusCode(component: ComponentType): number {
    const comp = this.components.get(component);
    if (!comp) return 0;
    
    switch (comp.status) {
      case 'initializing': return 0;
      case 'starting': case 'running': return 1;
      case 'warning': return 2;
      case 'error': return 3;
      case 'stopped': return 4;
      default: return 0;
    }
  }

  setShutdownMode(enabled: boolean): void {
    this.shutdownMode = enabled;
  }

  isInShutdownMode(): boolean {
    return this.shutdownMode;
  }

  getAllComponentsStatus(): Record<ComponentType, any> {
    const result: Record<string, any> = {};
    this.components.forEach((value, key) => {
      result[key] = { ...value };
    });
    return result as Record<ComponentType, any>;
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES INTERNAS
// ═══════════════════════════════════════════════════════════════════════════════

function logToPino(component: ComponentType, action: ActionType, message: string, context?: UnifiedContext): void {
  const state = MasterLoggerState.getInstance();
  
  // Durante shutdown, solo errores críticos
  if (state.isInShutdownMode() && action !== 'error') {
    return;
  }
  
  const emoji = getComponentEmoji(component);
  const prefix = getActionPrefix(action);
  const fullMessage = `${prefix} [${component.toUpperCase()}] ${message}`;
  
  switch (action) {
    case 'start':
      botLogger.info(fullMessage, emoji);
      break;
    case 'progress':
      const progressText = context?.progress ? ` (${context.progress}%)` : '';
      botLogger.info(`${fullMessage}${progressText}`, "⏳");
      break;
    case 'success':
      botLogger.success(fullMessage);
      break;
    case 'ready':
      botLogger.success(`🎉 ${fullMessage}`);
      break;
    case 'warning':
      botLogger.warn(fullMessage);
      break;
    case 'error':
      botLogger.error(fullMessage);
      if (context?.error) {
        botLogger.error(`   Details: ${context.error.message}`);
        if (context.critical) {
          botLogger.error(`   🚨 CRITICAL ERROR - Requires attention`);
        }
      }
      break;
  }
}

function sendTX2Event(component: ComponentType, action: ActionType, message: string, context?: UnifiedContext): void {
  try {
    if (action === 'error' && context?.critical) {
      // Enviar como issue crítico
      tx2.issue({
        summary: `${component.toUpperCase()}: ${message}`,
        detail: JSON.stringify({
          error: context.error?.message,
          stack: context.error?.stack,
          metadata: context.metadata,
          shouldRestart: context.shouldRestart
        }),
        tags: [component, 'critical', 'error']
      });
    } else {
      // Enviar como evento normal
      tx2.event(`${component}.${action}`, {
        message,
        progress: context?.progress,
        metadata: context?.metadata || {}
      });
    }
  } catch (error) {
    // Fallback silencioso
  }
}

function sendPM2Process(component: ComponentType, action: ActionType, message: string, context?: UnifiedContext): void {
  if (typeof process.send === 'function') {
    try {
      const eventData = {
        type: 'process:msg',
        data: {
          component,
          action,
          message,
          timestamp: new Date().toISOString(),
          progress: context?.progress,
          metadata: context?.metadata,
          error: context?.error ? {
            message: context.error.message,
            stack: context.error.stack
          } : undefined
        }
      };
      
      process.send(eventData);
    } catch (error) {
      // Fallback silencioso
    }
  }
}

function sendCriticalAlert(component: ComponentType, message: string, context: UnifiedContext): void {
  try {
    // Alert a PM2.io
    if (context.error) {
      tx2.issue({
        summary: `CRITICAL: ${component} - ${message}`,
        detail: JSON.stringify({
          error: context.error.message,
          stack: context.error.stack,
          shouldRestart: context.shouldRestart,
          metadata: context.metadata
        }),
        tags: [component, 'critical', 'alert']
      });
    }
    
    // También enviar via process.send para PM2
    sendPM2Process(component, 'error', `CRITICAL: ${message}`, context);
    
  } catch (error) {
    // Fallback: log crítico a consola
    console.error(`🚨 CRITICAL ALERT: ${component} - ${message}`);
    if (context.error) {
      console.error(`Error: ${context.error.message}`);
    }
  }
}

function getComponentEmoji(component: ComponentType): string {
  const emojis: Record<ComponentType, string> = {
    startup: '🚀',
    whatsapp: '💬',
    api: '🌐',
    system: '⚙️',
    shutdown: '🛑',
    validation: '✅',
    browser: '🌍',
    qr: '📱'
  };
  return emojis[component] || '📊';
}

function getActionPrefix(action: ActionType): string {
  const prefixes: Record<ActionType, string> = {
    start: '🚀',
    progress: '⏳',
    success: '✅',
    ready: '🎉',
    warning: '⚠️',
    error: '❌'
  };
  return prefixes[action] || 'ℹ️';
}

// ═══════════════════════════════════════════════════════════════════════════════
// API PÚBLICA - UNA SOLA FUNCIÓN PARA TODO
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * 🎯 FUNCIÓN MAESTRA UNIFICADA
 * 
 * Reemplaza TODAS las funciones de logging del codebase.
 * Una sola llamada maneja: Logging + Métricas + Alertas + Estados
 * 
 * @param component - Componente del sistema
 * @param action - Tipo de acción/estado
 * @param message - Mensaje descriptivo
 * @param context - Contexto adicional (error, progreso, etc.)
 */
export function unified(
  component: ComponentType,
  action: ActionType,
  message: string,
  context?: UnifiedContext
): void {
  try {
    const state = MasterLoggerState.getInstance();
    
    // Inicializar si es necesario
    if (!state['isInitialized']) {
      state.initialize();
    }
    
    // 1. 📝 LOGGING (Pino) - Siempre funciona
    logToPino(component, action, message, context);
    
    // 2. 📊 ACTUALIZAR ESTADO COMPONENTE
    state.updateComponent(component, action, message);
    
    // 3. 📡 EVENTOS TX2 (Para dashboard PM2.io)
    sendTX2Event(component, action, message, context);
    
    // 4. 📤 ENVIAR A PM2 (Process.send)
    sendPM2Process(component, action, message, context);
    
    // 5. 🚨 ALERTAS CRÍTICAS (Solo si es error crítico)
    if (action === 'error' && context?.critical) {
      sendCriticalAlert(component, message, context);
    }
    
  } catch (error) {
    // Fallback final: console básico
    console.error(`MasterLogger failed: ${error}`);
    console.log(`${component}: ${message}`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// FUNCIONES AUXILIARES
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Configurar modo shutdown (reduce logging durante cierre)
 */
export function setShutdownMode(enabled: boolean): void {
  MasterLoggerState.getInstance().setShutdownMode(enabled);
}

/**
 * Obtener status de todos los componentes
 */
export function getAllComponentsStatus(): Record<ComponentType, any> {
  return MasterLoggerState.getInstance().getAllComponentsStatus();
}

/**
 * Funciones de conveniencia para casos comunes
 */

// Marcar componente como listo
export const markReady = (component: ComponentType, message?: string) => 
  unified(component, 'ready', message || `${component} is ready and operational`);

// Reportar error crítico
export const criticalError = (component: ComponentType, error: Error, shouldRestart = false) =>
  unified(component, 'error', error.message, { error, critical: true, shouldRestart });

// Progreso de operación
export const progress = (component: ComponentType, message: string, percent: number) =>
  unified(component, 'progress', message, { progress: percent });

// Inicio de operación
export const starting = (component: ComponentType, operation: string) =>
  unified(component, 'start', `Starting ${operation}`);

// Operación exitosa
export const success = (component: ComponentType, message: string) =>
  unified(component, 'success', message);

// Advertencia
export const warning = (component: ComponentType, message: string) =>
  unified(component, 'warning', message);

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT DEFAULT PARA MIGRATION FÁCIL
// ═══════════════════════════════════════════════════════════════════════════════

export default unified;
