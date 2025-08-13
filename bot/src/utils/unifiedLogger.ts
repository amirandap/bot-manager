/**
 * Unified Logger & Metrics System
 * 
 * Combina nuestro logger Pino actual con métricas de PM2.io para crear
 * un sistema unificado de logging, métricas y status tracking
 */

import * as io from '@pm2/io';
import * as tx2 from 'tx2';
import { botLogger } from './loggerWrapper';

// Tipos para el sistema unificado
export type ComponentStatus = 'initializing' | 'running' | 'warning' | 'error' | 'stopped';
export type LogLevel = 'info' | 'success' | 'warning' | 'error';
export type ComponentType = 'startup' | 'whatsapp' | 'api' | 'system' | 'shutdown' | 'validation';

interface ComponentMetrics {
  status: ComponentStatus;
  lastUpdate: Date;
  errorCount: number;
  warningCount: number;
  successCount: number;
  metadata?: Record<string, unknown>;
}

/**
 * Unified Logger Class - Singleton
 */
class UnifiedLogger {
  private static instance: UnifiedLogger;
  private components: Map<ComponentType, ComponentMetrics> = new Map();
  private pm2Metrics: Map<string, unknown> = new Map();
  private isInitialized = false;

  constructor() {
    this.initializePM2();
  }

  public static getInstance(): UnifiedLogger {
    if (!UnifiedLogger.instance) {
      UnifiedLogger.instance = new UnifiedLogger();
    }
    return UnifiedLogger.instance;
  }

  /**
   * Inicializar PM2.io y TX2
   */
  private initializePM2(): void {
    try {
      // Inicializar PM2.io con configuración básica
      io.init();

      // Crear métricas personalizadas para cada componente
      this.setupComponentMetrics();
      
      this.isInitialized = true;
    } catch (error) {
      botLogger.error(`Failed to initialize PM2.io: ${error}`);
    }
  }

  /**
   * Configurar métricas PM2 para cada componente
   */
  private setupComponentMetrics(): void {
    const componentTypes: ComponentType[] = ['startup', 'whatsapp', 'api', 'system', 'shutdown', 'validation'];
    
    componentTypes.forEach(component => {
      // Métrica de status para cada componente (como número)
      const statusMetric = io.metric({
        name: `${component}_status_code`,
        value: () => this.getComponentStatusCode(component)
      });

      // Contador de errores
      const errorCounter = io.counter({
        name: `${component}_errors`
      });

      this.pm2Metrics.set(`${component}_status`, statusMetric);
      this.pm2Metrics.set(`${component}_errors`, errorCounter);

      // Inicializar estado del componente
      this.components.set(component, {
        status: 'initializing',
        lastUpdate: new Date(),
        errorCount: 0,
        warningCount: 0,
        successCount: 0
      });
    });
  }

  /**
   * Log unificado con métricas automáticas
   */
  public log(component: ComponentType, level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    // 1. Log tradicional con Pino
    this.logToPino(level, message, { component, ...metadata });
    
    // 2. Actualizar métricas del componente
    this.updateComponentMetrics(component, level, metadata);
    
    // 3. Reportar a PM2.io si está disponible
    if (this.isInitialized) {
      this.reportToPM2(component, level, message, metadata);
    }
    
    // 4. Actualizar status del componente
    this.updateComponentStatus(component, level);
  }

  /**
   * Método tradicional de logging con Pino
   */
  private logToPino(level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    const metadataStr = metadata ? ` | ${JSON.stringify(metadata)}` : '';
    const fullMessage = `${message}${metadataStr}`;
    
    switch (level) {
      case 'info':
        botLogger.info(fullMessage);
        break;
      case 'success':
        botLogger.success(fullMessage);
        break;
      case 'warning':
        botLogger.warn(fullMessage);
        break;
      case 'error':
        botLogger.error(fullMessage);
        break;
    }
  }

  /**
   * Actualizar métricas del componente
   */
  private updateComponentMetrics(component: ComponentType, level: LogLevel, metadata?: Record<string, unknown>): void {
    const componentMetrics = this.components.get(component);
    if (!componentMetrics) return;

    // Actualizar contadores
    switch (level) {
      case 'error':
        componentMetrics.errorCount++;
        // Incrementar contador PM2
        const errorCounter = this.pm2Metrics.get(`${component}_errors`);
        if (errorCounter && typeof (errorCounter as { inc: () => void }).inc === 'function') {
          (errorCounter as { inc: () => void }).inc();
        }
        break;
      case 'warning':
        componentMetrics.warningCount++;
        break;
      case 'success':
        componentMetrics.successCount++;
        break;
    }

    componentMetrics.lastUpdate = new Date();
    componentMetrics.metadata = { ...componentMetrics.metadata, ...metadata };
  }

  /**
   * Reportar evento a PM2.io
   */
  private reportToPM2(component: ComponentType, level: LogLevel, message: string, metadata?: Record<string, unknown>): void {
    try {
      // Usar TX2 para eventos específicos
      if (level === 'error') {
        tx2.issue({
          summary: `${component.toUpperCase()}: ${message}`,
          detail: JSON.stringify(metadata || {}),
          tags: [component, level]
        });
      } else {
        tx2.event(`${component}.${level}`, {
          message,
          metadata: metadata || {}
        });
      }
    } catch (error) {
      // Fallback silencioso
    }
  }

  /**
   * Actualizar status del componente basado en el nivel de log
   */
  private updateComponentStatus(component: ComponentType, level: LogLevel): void {
    const componentMetrics = this.components.get(component);
    if (!componentMetrics) return;

    switch (level) {
      case 'error':
        componentMetrics.status = 'error';
        break;
      case 'warning':
        if (componentMetrics.status !== 'error') {
          componentMetrics.status = 'warning';
        }
        break;
      case 'success':
        if (componentMetrics.status === 'initializing' || componentMetrics.status === 'warning') {
          componentMetrics.status = 'running';
        }
        break;
    }
  }

  /**
   * Obtener status actual de un componente
   */
  public getComponentStatus(component: ComponentType): string {
    const componentMetrics = this.components.get(component);
    return componentMetrics?.status || 'unknown';
  }

  /**
   * Obtener status actual de un componente como código numérico para PM2
   */
  private getComponentStatusCode(component: ComponentType): number {
    const status = this.getComponentStatus(component);
    switch (status) {
      case 'initializing': return 0;
      case 'running': return 1;
      case 'warning': return 2;
      case 'error': return 3;
      case 'stopped': return 4;
      default: return -1;
    }
  }

  /**
   * Obtener métricas de todos los componentes
   */
  public getAllComponentsStatus(): Record<ComponentType, ComponentMetrics> {
    const status: Record<string, ComponentMetrics> = {};
    this.components.forEach((metrics, component) => {
      status[component] = { ...metrics };
    });
    return status as Record<ComponentType, ComponentMetrics>;
  }

  /**
   * Reportar falla crítica
   */
  public reportFailure(error: Error, component: ComponentType, isCritical: boolean = false): void {
    this.log(component, 'error', `Critical failure: ${error.message}`, {
      error: error.message,
      stack: error.stack,
      critical: isCritical
    });

    if (this.isInitialized && isCritical) {
      tx2.issue({
        summary: `CRITICAL FAILURE in ${component.toUpperCase()}`,
        detail: `${error.message}\n\nStack trace:\n${error.stack}`,
        tags: [component, 'critical', 'failure']
      });
    }
  }

  /**
   * Marcar componente como completado exitosamente
   */
  public markComponentReady(component: ComponentType, message?: string): void {
    this.log(component, 'success', message || `${component} is ready and operational`);
    
    const componentMetrics = this.components.get(component);
    if (componentMetrics) {
      componentMetrics.status = 'running';
    }
  }

  /**
   * Shutdown del sistema de métricas
   */
  public shutdown(): void {
    if (this.isInitialized) {
      try {
        // TX2 cleanup si es necesario
        this.log('system', 'info', 'Unified logger shutting down');
      } catch (error) {
        botLogger.error(`Error during unified logger shutdown: ${error}`);
      }
    }
  }
}

// Singleton instance
export const unifiedLogger = UnifiedLogger.getInstance();

// Funciones de conveniencia para migración gradual
export const logEvent = (component: ComponentType, level: LogLevel, message: string, metadata?: Record<string, unknown>) => {
  unifiedLogger.log(component, level, message, metadata);
};

export const reportFailure = (error: Error, component: ComponentType, isCritical: boolean = false) => {
  unifiedLogger.reportFailure(error, component, isCritical);
};

export const markComponentReady = (component: ComponentType, message?: string) => {
  unifiedLogger.markComponentReady(component, message);
};

export const getComponentStatus = (component: ComponentType): string => {
  return unifiedLogger.getComponentStatus(component);
};

export const getAllComponentsStatus = () => {
  return unifiedLogger.getAllComponentsStatus();
};
