# 📊 PM2 Métricas Integration - Configuración Completa

## 🎯 Objetivo: Métricas Visibles en PM2 Dashboard

### **Lo que queremos lograr:**
- ✅ **Status en tiempo real** de cada componente visible en PM2
- ✅ **Contadores automáticos** (errores, éxitos, warnings)
- ✅ **Estados numéricos** para cada componente (0-4)
- ✅ **Alertas automáticas** cuando los thresholds se superan
- ✅ **Dashboard PM2** con métricas custom

---

## 🏗️ Arquitectura de Métricas PM2

### **📈 Tipos de Métricas Generadas:**

```typescript
// Para cada componente (startup, whatsapp, api, system, etc.)
{
  // 🎯 STATUS PRINCIPAL (0-4)
  `${component}_status`: number,           // Estado actual del componente
  
  // 📊 CONTADORES AUTOMÁTICOS  
  `${component}_total_events`: number,     // Total de eventos
  `${component}_success_count`: number,    // Contador de éxitos
  `${component}_error_count`: number,      // Contador de errores
  `${component}_warning_count`: number,    // Contador de warnings
  
  // ⏱️ TIMING Y PERFORMANCE
  `${component}_last_event_time`: number,  // Timestamp último evento
  `${component}_uptime_seconds`: number,   // Tiempo funcionando
  
  // 🔢 MÉTRICAS ESPECÍFICAS (opcionales)
  `whatsapp_messages_sent`: number,        // Mensajes enviados (WhatsApp)
  `api_requests_handled`: number,          // Requests manejados (API)
  `startup_progress_percent`: number       // Progreso startup (0-100)
}
```

### **🎨 Estados de Componente (0-4):**

```typescript
enum ComponentStatus {
  INITIALIZING = 0,    // 🔄 Iniciando
  RUNNING = 1,         // ✅ Funcionando correctamente
  WARNING = 2,         // ⚠️ Con advertencias
  ERROR = 3,           // ❌ Con errores activos
  STOPPED = 4          // 🛑 Detenido/Fallido
}
```

---

## 🔧 Implementación Técnica

### **PASO 1: Configuración Base PM2.io**

```typescript
// src/utils/pm2MetricsManager.ts
import * as io from '@pm2/io';
import * as tx2 from 'tx2';

interface ComponentMetrics {
  status: io.Metric;
  totalEvents: io.Metric;
  successCount: io.Metric;
  errorCount: io.Metric;
  warningCount: io.Metric;
  lastEventTime: io.Metric;
  uptimeSeconds: io.Metric;
  customMetrics?: Map<string, io.Metric>;
}

class PM2MetricsManager {
  private static instance: PM2MetricsManager;
  private metrics: Map<string, ComponentMetrics> = new Map();
  private startTime: number = Date.now();
  private isInitialized = false;

  private constructor() {
    this.initializePM2();
  }

  public static getInstance(): PM2MetricsManager {
    if (!PM2MetricsManager.instance) {
      PM2MetricsManager.instance = new PM2MetricsManager();
    }
    return PM2MetricsManager.instance;
  }

  /**
   * 🚀 Inicializar PM2.io y crear métricas base
   */
  private initializePM2(): void {
    try {
      // Inicializar PM2.io
      io.init({
        // Configuración para máxima visibilidad
        network: true,       // Monitoreo de red
        ports: true,         // Monitoreo de puertos
        transactions: true,  // Transacciones HTTP
        http: true          // Requests HTTP
      });

      // Crear métricas para cada componente
      this.createComponentMetrics();
      
      // Configurar acciones personalizadas
      this.setupCustomActions();
      
      this.isInitialized = true;
      console.log('✅ PM2.io metrics initialized successfully');
      
    } catch (error) {
      console.error('❌ Failed to initialize PM2.io:', error);
      // No fallar si PM2 no está disponible
    }
  }

  /**
   * 📊 Crear métricas para todos los componentes
   */
  private createComponentMetrics(): void {
    const components = ['startup', 'whatsapp', 'api', 'system', 'shutdown', 'validation', 'browser', 'qr'];
    
    components.forEach(component => {
      const metrics: ComponentMetrics = {
        // 🎯 STATUS PRINCIPAL (más importante)
        status: io.metric({
          name: `${component}_status`,
          value: 0, // Inicializa en INITIALIZING
          unit: 'status',
          historic: true  // Mantener historial
        }),

        // 📊 CONTADORES AUTOMÁTICOS
        totalEvents: io.metric({
          name: `${component}_total_events`,
          value: 0,
          unit: 'events'
        }),

        successCount: io.metric({
          name: `${component}_success_count`,
          value: 0,
          unit: 'count'
        }),

        errorCount: io.metric({
          name: `${component}_error_count`,
          value: 0,
          unit: 'errors'
        }),

        warningCount: io.metric({
          name: `${component}_warning_count`,
          value: 0,
          unit: 'warnings'
        }),

        // ⏱️ TIMING
        lastEventTime: io.metric({
          name: `${component}_last_event_time`,
          value: 0,
          unit: 'timestamp'
        }),

        uptimeSeconds: io.metric({
          name: `${component}_uptime_seconds`,
          value: 0,
          unit: 'seconds'
        })
      };

      // Guardar métricas del componente
      this.metrics.set(component, metrics);

      // 🎯 MÉTRICAS ESPECÍFICAS POR COMPONENTE
      this.createSpecificMetrics(component, metrics);
    });
  }

  /**
   * 🎯 Crear métricas específicas por componente
   */
  private createSpecificMetrics(component: string, metrics: ComponentMetrics): void {
    if (!metrics.customMetrics) {
      metrics.customMetrics = new Map();
    }

    switch (component) {
      case 'whatsapp':
        // Métricas específicas de WhatsApp
        metrics.customMetrics.set('messages_sent', io.metric({
          name: 'whatsapp_messages_sent',
          value: 0,
          unit: 'messages'
        }));
        
        metrics.customMetrics.set('qr_generated_count', io.metric({
          name: 'whatsapp_qr_generated_count',
          value: 0,
          unit: 'count'
        }));
        
        metrics.customMetrics.set('connection_attempts', io.metric({
          name: 'whatsapp_connection_attempts',
          value: 0,
          unit: 'attempts'
        }));
        break;

      case 'api':
        // Métricas específicas del API
        metrics.customMetrics.set('requests_handled', io.metric({
          name: 'api_requests_handled',
          value: 0,
          unit: 'requests'
        }));
        
        metrics.customMetrics.set('active_connections', io.metric({
          name: 'api_active_connections',
          value: 0,
          unit: 'connections'
        }));
        break;

      case 'startup':
        // Métricas específicas de startup
        metrics.customMetrics.set('progress_percent', io.metric({
          name: 'startup_progress_percent',
          value: 0,
          unit: 'percent'
        }));
        
        metrics.customMetrics.set('steps_completed', io.metric({
          name: 'startup_steps_completed',
          value: 0,
          unit: 'steps'
        }));
        break;

      case 'browser':
        // Métricas específicas del browser
        metrics.customMetrics.set('chrome_memory_mb', io.metric({
          name: 'browser_chrome_memory_mb',
          value: 0,
          unit: 'MB'
        }));
        break;
    }
  }

  /**
   * 🎛️ Configurar acciones personalizadas para PM2
   */
  private setupCustomActions(): void {
    // Acción: Obtener status de todos los componentes
    io.action('get_all_status', (reply) => {
      const status = this.getAllComponentsStatus();
      reply(status);
    });

    // Acción: Reset de contadores de errores
    io.action('reset_error_counts', (reply) => {
      this.resetErrorCounts();
      reply({ success: true, message: 'Error counts reset' });
    });

    // Acción: Forzar update de métricas
    io.action('refresh_metrics', (reply) => {
      this.updateUptimeMetrics();
      reply({ success: true, message: 'Metrics refreshed' });
    });

    // Acción: Get component details
    io.action('get_component_details', { comment: 'Get details for specific component' }, (param, reply) => {
      const component = param.component;
      const details = this.getComponentDetails(component);
      reply(details);
    });
  }

  /**
   * 🔄 Actualizar métricas cuando ocurre un evento
   */
  public updateMetrics(
    component: string, 
    action: 'start' | 'progress' | 'success' | 'error' | 'warning' | 'ready',
    context?: {
      progress?: number;
      metadata?: any;
      error?: Error;
    }
  ): void {
    if (!this.isInitialized || !this.metrics.has(component)) {
      return;
    }

    const metrics = this.metrics.get(component)!;
    const now = Date.now();

    // 📊 CONTADORES AUTOMÁTICOS
    metrics.totalEvents.set(metrics.totalEvents.val() + 1);
    metrics.lastEventTime.set(now);

    // 🎯 ACTUALIZAR STATUS SEGÚN ACCIÓN
    switch (action) {
      case 'start':
        metrics.status.set(ComponentStatus.INITIALIZING);
        break;
        
      case 'progress':
        metrics.status.set(ComponentStatus.RUNNING);
        // Actualizar progreso si está disponible
        if (context?.progress !== undefined && metrics.customMetrics?.has('progress_percent')) {
          metrics.customMetrics.get('progress_percent')!.set(context.progress);
        }
        break;
        
      case 'success':
        metrics.successCount.set(metrics.successCount.val() + 1);
        metrics.status.set(ComponentStatus.RUNNING);
        break;
        
      case 'ready':
        metrics.status.set(ComponentStatus.RUNNING);
        // Para startup, marcar progreso como 100%
        if (component === 'startup' && metrics.customMetrics?.has('progress_percent')) {
          metrics.customMetrics.get('progress_percent')!.set(100);
        }
        break;
        
      case 'warning':
        metrics.warningCount.set(metrics.warningCount.val() + 1);
        metrics.status.set(ComponentStatus.WARNING);
        break;
        
      case 'error':
        metrics.errorCount.set(metrics.errorCount.val() + 1);
        metrics.status.set(ComponentStatus.ERROR);
        
        // 🚨 Enviar issue crítico a TX2 para alertas
        if (context?.error) {
          tx2.issue({
            summary: `${component.toUpperCase()}: Error occurred`,
            detail: context.error.message,
            stack: context.error.stack,
            tags: [component, 'error', 'auto-generated']
          });
        }
        break;
    }

    // 📈 MÉTRICAS ESPECÍFICAS POR COMPONENTE
    this.updateSpecificMetrics(component, action, context);
    
    // ⏱️ ACTUALIZAR UPTIME
    this.updateUptimeMetrics();
  }

  /**
   * 📈 Actualizar métricas específicas por componente
   */
  private updateSpecificMetrics(
    component: string, 
    action: string, 
    context?: any
  ): void {
    const metrics = this.metrics.get(component);
    if (!metrics?.customMetrics) return;

    switch (component) {
      case 'whatsapp':
        if (action === 'success' && context?.metadata?.messagesSent) {
          const currentCount = metrics.customMetrics.get('messages_sent')?.val() || 0;
          metrics.customMetrics.get('messages_sent')?.set(currentCount + context.metadata.messagesSent);
        }
        if (action === 'progress' && context?.metadata?.qrGenerated) {
          const currentCount = metrics.customMetrics.get('qr_generated_count')?.val() || 0;
          metrics.customMetrics.get('qr_generated_count')?.set(currentCount + 1);
        }
        if (action === 'start' && context?.metadata?.connectionAttempt) {
          const currentCount = metrics.customMetrics.get('connection_attempts')?.val() || 0;
          metrics.customMetrics.get('connection_attempts')?.set(currentCount + 1);
        }
        break;

      case 'api':
        if (action === 'success' && context?.metadata?.requestsHandled) {
          const currentCount = metrics.customMetrics.get('requests_handled')?.val() || 0;
          metrics.customMetrics.get('requests_handled')?.set(currentCount + context.metadata.requestsHandled);
        }
        break;

      case 'startup':
        if (context?.metadata?.stepsCompleted) {
          metrics.customMetrics.get('steps_completed')?.set(context.metadata.stepsCompleted);
        }
        break;
    }
  }

  /**
   * ⏱️ Actualizar métricas de uptime
   */
  private updateUptimeMetrics(): void {
    const uptimeSeconds = Math.floor((Date.now() - this.startTime) / 1000);
    
    this.metrics.forEach((metrics) => {
      metrics.uptimeSeconds.set(uptimeSeconds);
    });
  }

  /**
   * 📊 Obtener status de todos los componentes
   */
  public getAllComponentsStatus(): Record<string, any> {
    const status: Record<string, any> = {};
    
    this.metrics.forEach((metrics, component) => {
      status[component] = {
        status: this.getStatusName(metrics.status.val()),
        statusCode: metrics.status.val(),
        totalEvents: metrics.totalEvents.val(),
        successCount: metrics.successCount.val(),
        errorCount: metrics.errorCount.val(),
        warningCount: metrics.warningCount.val(),
        lastEventTime: new Date(metrics.lastEventTime.val()).toISOString(),
        uptimeSeconds: metrics.uptimeSeconds.val()
      };

      // Agregar métricas específicas
      if (metrics.customMetrics) {
        status[component].customMetrics = {};
        metrics.customMetrics.forEach((metric, name) => {
          status[component].customMetrics[name] = metric.val();
        });
      }
    });

    return status;
  }

  /**
   * 📊 Obtener detalles de un componente específico
   */
  public getComponentDetails(component: string): any {
    if (!this.metrics.has(component)) {
      return { error: `Component ${component} not found` };
    }

    const metrics = this.metrics.get(component)!;
    const details = {
      component,
      status: this.getStatusName(metrics.status.val()),
      statusCode: metrics.status.val(),
      counters: {
        total: metrics.totalEvents.val(),
        success: metrics.successCount.val(),
        errors: metrics.errorCount.val(),
        warnings: metrics.warningCount.val()
      },
      timing: {
        lastEvent: new Date(metrics.lastEventTime.val()).toISOString(),
        uptime: metrics.uptimeSeconds.val()
      }
    };

    // Agregar métricas específicas si existen
    if (metrics.customMetrics && metrics.customMetrics.size > 0) {
      (details as any).customMetrics = {};
      metrics.customMetrics.forEach((metric, name) => {
        (details as any).customMetrics[name] = metric.val();
      });
    }

    return details;
  }

  /**
   * 🔄 Reset contadores de errores
   */
  public resetErrorCounts(): void {
    this.metrics.forEach((metrics) => {
      metrics.errorCount.set(0);
      metrics.warningCount.set(0);
      // Reset status a RUNNING si estaba en ERROR
      if (metrics.status.val() === ComponentStatus.ERROR) {
        metrics.status.set(ComponentStatus.RUNNING);
      }
    });
  }

  /**
   * 📝 Convertir código de status a nombre
   */
  private getStatusName(statusCode: number): string {
    switch (statusCode) {
      case 0: return 'initializing';
      case 1: return 'running';
      case 2: return 'warning';
      case 3: return 'error';
      case 4: return 'stopped';
      default: return 'unknown';
    }
  }

  /**
   * 🎯 Método público para incrementar métricas custom
   */
  public incrementCustomMetric(component: string, metricName: string, value: number = 1): void {
    const metrics = this.metrics.get(component);
    if (metrics?.customMetrics?.has(metricName)) {
      const currentValue = metrics.customMetrics.get(metricName)!.val();
      metrics.customMetrics.get(metricName)!.set(currentValue + value);
    }
  }

  /**
   * 🎯 Método público para set métricas custom
   */
  public setCustomMetric(component: string, metricName: string, value: number): void {
    const metrics = this.metrics.get(component);
    if (metrics?.customMetrics?.has(metricName)) {
      metrics.customMetrics.get(metricName)!.set(value);
    }
  }
}

// Singleton export
export const pm2MetricsManager = PM2MetricsManager.getInstance();
export { ComponentStatus };
```

---

## 🔄 Integración con Unified Logger

### **PASO 2: Modificar el Unified Logger**

```typescript
// src/utils/masterLogger.ts - Agregar integración con métricas
import { pm2MetricsManager } from './pm2MetricsManager';

export function unified(
  component: ComponentType,
  action: ActionType,
  message: string,
  context?: UnifiedContext
): void {
  try {
    // 1. 📝 LOGGING TRADICIONAL (Pino)
    logToPino(component, action, message, context);
    
    // 2. 📊 ACTUALIZAR MÉTRICAS PM2 (NUEVO!)
    pm2MetricsManager.updateMetrics(component, action, context);
    
    // 3. 🚨 ALERTAS CRÍTICAS (TX2)
    if (action === 'error' && context?.critical) {
      sendCriticalAlert(component, message, context);
    }
    
    // 4. 📡 EVENTOS ADICIONALES (TX2)
    sendTX2Event(component, action, message, context);
    
  } catch (error) {
    // Fallback silencioso
    console.error(`MasterLogger failed: ${error}`);
    // Fallback a logging básico
    console.log(`${component}: ${message}`);
  }
}

// 🎯 Funciones de conveniencia para métricas específicas
export function incrementWhatsAppMessages(count: number = 1): void {
  pm2MetricsManager.incrementCustomMetric('whatsapp', 'messages_sent', count);
}

export function updateStartupProgress(percent: number): void {
  pm2MetricsManager.setCustomMetric('startup', 'progress_percent', percent);
}

export function incrementAPIRequests(count: number = 1): void {
  pm2MetricsManager.incrementCustomMetric('api', 'requests_handled', count);
}

export function setActiveConnections(count: number): void {
  pm2MetricsManager.setCustomMetric('api', 'active_connections', count);
}

// 📊 Status helpers
export function getAllComponentsStatus() {
  return pm2MetricsManager.getAllComponentsStatus();
}

export function getComponentDetails(component: ComponentType) {
  return pm2MetricsManager.getComponentDetails(component);
}
```

---

## 🎯 Ejemplos Prácticos de Uso

### **WhatsApp Component:**

```typescript
import { unified, incrementWhatsAppMessages } from './masterLogger';

// Inicio de conexión
unified('whatsapp', 'start', 'Connecting to WhatsApp servers', {
  metadata: { connectionAttempt: true }
});

// Progreso - QR generado
unified('whatsapp', 'progress', 'QR code generated', {
  metadata: { qrGenerated: true }
});

// Éxito - Conectado
unified('whatsapp', 'ready', 'WhatsApp connected successfully', {
  metadata: { phoneNumber: '+1234567890' }
});

// Mensaje enviado (incrementar métrica custom)
incrementWhatsAppMessages(1);
unified('whatsapp', 'success', 'Message sent successfully');

// Error crítico
unified('whatsapp', 'error', 'Connection failed', {
  error: new Error('Authentication failed'),
  critical: true,
  shouldRestart: true
});
```

### **Startup Component:**

```typescript
import { unified, updateStartupProgress } from './masterLogger';

// Inicio del startup
unified('startup', 'start', 'Bot initialization started');

// Progreso paso a paso
updateStartupProgress(25);
unified('startup', 'progress', 'Environment validation completed', {
  progress: 25,
  metadata: { stepsCompleted: 1 }
});

updateStartupProgress(50);
unified('startup', 'progress', 'Chrome validation completed', {
  progress: 50,
  metadata: { stepsCompleted: 2 }
});

// Startup completo
unified('startup', 'ready', 'Bot startup completed successfully');
```

### **API Component:**

```typescript
import { unified, incrementAPIRequests, setActiveConnections } from './masterLogger';

// API servidor iniciando
unified('api', 'start', 'Starting Express server');

// API listo
unified('api', 'ready', 'Express server running on port 7997', {
  metadata: { port: 7997 }
});

// En cada request (middleware)
app.use((req, res, next) => {
  incrementAPIRequests(1);
  unified('api', 'progress', `${req.method} ${req.path}`);
  next();
});

// Actualizar conexiones activas
setActiveConnections(10);
```

---

## 📈 Dashboard PM2 - Qué Verás

### **🎛️ Panel Principal:**

```
📊 PM2 DASHBOARD - Bot Manager Metrics

🔄 startup_status: 1 (running)
📈 startup_progress_percent: 100%
📊 startup_success_count: 15
❌ startup_error_count: 0
⚠️ startup_warning_count: 2

🤖 whatsapp_status: 1 (running)  
📱 whatsapp_messages_sent: 1,234
🔄 whatsapp_connection_attempts: 3
❌ whatsapp_error_count: 2
📊 whatsapp_success_count: 89

🌐 api_status: 1 (running)
📊 api_requests_handled: 5,678
🔗 api_active_connections: 7
❌ api_error_count: 0

🖥️ system_status: 1 (running)
⏱️ system_uptime_seconds: 86400
```

### **🚨 Alertas Automáticas:**

```
⚠️ ALERT: whatsapp_error_count > 5
🚨 CRITICAL: startup_status = 3 (error)
📈 INFO: api_requests_handled +100 in last minute
```

### **📊 Gráficas Disponibles:**

- **Status Timeline:** Cambios de estado a lo largo del tiempo
- **Error Rate:** Porcentaje de errores vs éxitos
- **Performance:** Requests por minuto, mensajes por minuto
- **Uptime:** Tiempo operativo de cada componente

---

## 🔧 Configuración PM2 Ecosystem

### **PM2 Config para Máxima Visibilidad:**

```javascript
// pm2.ecosystem.config.js
module.exports = {
  apps: [{
    name: "wabot-7997",
    script: "src/index.ts",
    interpreter: "./node_modules/.bin/ts-node",
    env: {
      NODE_ENV: "production",
      BOT_PORT: "7997",
      BOT_ID: "whatsapp-bot-1749931370885",
    },
    // 📊 CONFIGURACIÓN PARA MÉTRICAS
    pmx: true,                    // Habilitar métricas PM2
    automation: false,            // No auto restart en fallos (para debugging)
    
    // 🎯 MONITOREO AVANZADO
    monitoring: {
      http: true,                 // Monitoreo HTTP
      https: true,                // Monitoreo HTTPS  
      ports: true,                // Monitoreo de puertos
      network: true,              // Monitoreo de red
      memory: true,               // Alertas de memoria
      cpu: true                   // Alertas de CPU
    },
    
    // 📈 ALERTAS Y NOTIFICACIONES
    alerts: {
      cpu: 80,                    // Alerta si CPU > 80%
      memory: 500,                // Alerta si memoria > 500MB
      errors: 10                  // Alerta si errores > 10/min
    }
  }]
};
```

---

## ✅ Verificación y Testing

### **🧪 Tests de Métricas:**

```typescript
// tests/metrics.test.ts
import { unified, getAllComponentsStatus } from '../utils/masterLogger';

describe('PM2 Metrics Integration', () => {
  test('should update component status on events', () => {
    // Test startup sequence
    unified('startup', 'start', 'Starting tests');
    unified('startup', 'progress', 'Environment loaded', { progress: 50 });
    unified('startup', 'ready', 'Startup completed');
    
    const status = getAllComponentsStatus();
    expect(status.startup.statusCode).toBe(1); // RUNNING
    expect(status.startup.successCount).toBeGreaterThan(0);
  });

  test('should increment error count on errors', () => {
    unified('whatsapp', 'error', 'Connection failed', {
      error: new Error('Test error'),
      critical: false
    });
    
    const status = getAllComponentsStatus();
    expect(status.whatsapp.errorCount).toBeGreaterThan(0);
    expect(status.whatsapp.statusCode).toBe(3); // ERROR
  });
});
```

### **🔍 Debug y Monitoring:**

```bash
# Ver métricas en tiempo real
pm2 monit

# Ver logs con métricas
pm2 logs wabot-7997 --lines 50

# Ver métricas específicas
pm2 trigger wabot-7997 get_all_status

# Reset contadores de errores
pm2 trigger wabot-7997 reset_error_counts

# Obtener detalles de componente
pm2 trigger wabot-7997 get_component_details '{"component":"whatsapp"}'
```

---

## 🎉 Resultado Final

### **✅ Lo que Logramos:**

1. **🎯 Métricas Centralizadas:** Todo visible desde PM2 dashboard
2. **📊 Status en Tiempo Real:** Estado de cada componente (0-4)
3. **🔢 Contadores Automáticos:** Errores, éxitos, warnings por componente
4. **📈 Métricas Personalizadas:** Mensajes enviados, requests, progreso
5. **🚨 Alertas Automáticas:** Basadas en thresholds configurables
6. **🎛️ Acciones Remotas:** Reset, refresh, status desde PM2
7. **📊 Historial Completo:** Tendencias y análisis temporal

### **📊 Dashboard Completo:**

- ✅ **Status visual** de todos los componentes
- ✅ **Gráficas históricas** de performance
- ✅ **Alertas proactivas** cuando algo falla
- ✅ **Métricas business** (mensajes, requests, etc.)
- ✅ **Debugging remoto** via acciones PM2

**🚀 El sistema está completamente integrado con PM2 para máxima observabilidad!**
