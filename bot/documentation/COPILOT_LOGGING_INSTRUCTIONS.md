# Instrucciones de Copilot - Sistema de LoggerService de Uriel

## 📋 Arquitectura de Logging Actual - LoggerService de Uriel

### **Principio Fundamental**
**TODA** comunicación de estado, errores, métricas y logging debe pasar por el **LoggerService de Uriel**. Este sistema combina Pino (logging estructurado) + PM2.io (métricas automáticas).

### **Función Universal: `logger` de LoggerService**

```typescript
import { logger } from '../services/LoggerService';

// 📝 LOGGING ESTRUCTURADO PRINCIPAL
logger.log(level, message, context);
// level: 'debug' | 'info' | 'warn' | 'error' | 'fatal'

// 🚨 MANEJO DE ERRORES
logger.error(error, context);
// Automáticamente: io.notifyError() + updateMetric('ERRORS') + stack trace

// 📊 MÉTODOS ESPECÍFICOS (YA IMPLEMENTADOS)
logger.startupHeader(message);          // Headers con formato
logger.success(message);                // Mensajes de éxito
logger.info(message, emoji);           // Info con emoji opcional
logger.warn(message);                  // Warnings
```

## 🎯 Patrones de Uso del LoggerService

### **1. LOGGING BÁSICO (logger.log)**
Para la mayoría de operaciones del sistema:
```typescript
// WhatsApp operations
logger.log('info', "Cliente WhatsApp inicializado", { component: 'whatsapp' });
logger.log('info', "✅ Conexión exitosa", { component: 'whatsapp', state: 'ready' });
logger.log('warn', "Conexión inestable", { component: 'whatsapp', retries: 3 });

// Startup operations  
logger.log('info', "Validando Chrome", { component: 'startup', step: 'validation' });
logger.log('info', "✅ Validación completada", { component: 'startup', progress: 100 });

// API operations
logger.log('info', "✅ API ejecutándose", { component: 'api', port: 7260 });
logger.log('info', "Mensaje enviado", { component: 'api', recipient: '+1234567890' });
```

### **2. MANEJO DE ERRORES (logger.error)**
Para errores con notificación automática a PM2:
```typescript
// Errores críticos
logger.error(error, { 
  component: 'whatsapp', 
  context: 'connection',
  critical: true 
});

// Errores de validación
logger.error(error, { 
  component: 'startup', 
  context: 'validation',
  critical: false 
});

// Errores de API
logger.error(error, { 
  component: 'api', 
  context: 'message_send',
  recipient: recipient 
});
```

### **3. MÉTODOS ESPECÍFICOS (Funciones especiales)**
Para casos de uso comunes ya implementados:
```typescript
// Headers de startup
logger.startupHeader("🔍 STARTUP VALIDATION");

// Mensajes de éxito
logger.success("🎉 Bot startup completed successfully!");

// Información con emoji
logger.info(`📊 Status: http://localhost:${port}/status`, "🌐");

// Warnings simples
logger.warn(`⚠️ WhatsApp not ready. State: ${state}`);
```

## 🏗️ Context Enriquecido

### **Components Estándar**
- `'whatsapp'` - Operaciones de WhatsApp
- `'startup'` - Proceso de inicialización
- `'shutdown'` - Proceso de cierre
- `'api'` - Operaciones del API REST
- `'browser'` - Operaciones de Puppeteer/Chrome
- `'validation'` - Validaciones del sistema
- `'system'` - Sistema general

### **Context Keys Recomendados**
```typescript
// Para WhatsApp
{ component: 'whatsapp', state: 'ready', phoneNumber: '+123...' }
{ component: 'whatsapp', action: 'send_message', recipient: '+123...' }
{ component: 'whatsapp', lifecycle_state: 'authenticating' }

// Para API
{ component: 'api', route: 'sendMessage', requestId: 'req_123' }
{ component: 'api', method: 'POST', endpoint: '/send-message' }
{ component: 'api', port: 7260, status: 'listening' }

// Para Startup
{ component: 'startup', step: 'validation', progress: 50 }
{ component: 'startup', phase: 'chrome_check', status: 'success' }

// Para Errores
{ component: 'whatsapp', context: 'connection', critical: true }
{ component: 'api', context: 'validation', endpoint: '/send-message' }
```

## 📚 Patrones de Migración desde Legacy

### **logPM2Event() → logger.log()**
```typescript
// ❌ LEGACY
logPM2Event('whatsapp', 'info', "Cliente inicializado");
logPM2Event('whatsapp', 'success', "Conexión exitosa");
logPM2Event('whatsapp', 'error', "Error de conexión");

// ✅ URIEL LOGGERSERVICE
logger.log('info', "Cliente inicializado", { component: 'whatsapp' });
logger.log('info', "✅ Conexión exitosa", { component: 'whatsapp' });
logger.log('error', "Error de conexión", { component: 'whatsapp' });
```

### **alertPM2Failure() → logger.error()**
```typescript
// ❌ LEGACY
alertPM2Failure(error, 'whatsapp_connection', true);
alertPM2Failure(error, 'startup_validation', false);

// ✅ URIEL LOGGERSERVICE
logger.error(error, { 
  component: 'whatsapp', 
  context: 'connection',
  critical: true 
});
logger.error(error, { 
  component: 'startup', 
  context: 'validation',
  critical: false 
});
```

### **botLogger.* → logger métodos específicos**
```typescript
// ❌ LEGACY
botLogger.success("✅ Operación exitosa");
botLogger.info("ℹ️ Información general", "🔍");
botLogger.warn("⚠️ Advertencia");
botLogger.error("❌ Error occurred");

// ✅ URIEL LOGGERSERVICE
logger.success("✅ Operación exitosa");
logger.info("🔍 Información general", "🔍");  
logger.warn("⚠️ Advertencia");
logger.log('error', "❌ Error occurred", { component: 'system' });
```

## 📂 Funcionalidades Automáticas del LoggerService

### **🚀 Lo que hace automáticamente:**

#### **1. Logging Estructurado con Pino**
- Timestamps automáticos
- Formato JSON estructurado
- Levels apropiados (debug, info, warn, error, fatal)
- Context enrichment automático

#### **2. PM2.io Integration**
- Notificaciones automáticas de errores: `io.notifyError(error)`
- Métricas automáticas: contador de errores, conexiones, etc.
- Dashboard de PM2 con datos en tiempo real

#### **3. Error Handling Avanzado**
- Stack traces completos preservados
- Context específico por error
- Clasificación automática de severidad
- Notificaciones a PM2 solo para errores críticos

#### **4. Lifecycle Tracking**
- Estados de componentes del sistema
- Progreso de startup automático
- Shutdown context control
- Métricas de rendimiento

## 🚫 Prohibiciones

### **NO usar directamente:**
- `console.log()`, `console.error()`, etc.
- Funciones legacy: `logPM2Event()`, `alertPM2Failure()`, etc.
- `botLogger.*()` importado de `loggerWrapper` (usar logger directo)
- Múltiples llamadas para una sola operación

### **NO importar desde:**
- `utils/pm2Utils_unified`
- `utils/loggerWrapper` (solo si no hay alternativa)

### **SÍ importar desde:**
```typescript
import { logger } from '../services/LoggerService';
```

## ✅ Beneficios del LoggerService de Uriel

1. **Logging Estructurado**: Pino > console.log (mejor performance)
2. **PM2.io Integration**: Métricas automáticas en dashboard
3. **Error Notifications**: Automáticas a PM2 para errores críticos
4. **Context Enrichment**: Metadata estructurada para debugging
5. **Métodos Específicos**: Funciones especializadas ya implementadas
6. **Singleton Pattern**: Una instancia, comportamiento consistente

## 🔧 Implementación en Servicios

Para cualquier servicio o utilidad:

1. **Importar LoggerService:**
```typescript
import { logger } from '../services/LoggerService';
```

2. **Usar patrón de context:**
```typescript
logger.log('info', "Mensaje descriptivo", { 
  component: 'whatsapp|api|startup|shutdown|system',
  action?: 'specific_action',
  context?: 'additional_context',
  [key: string]: any
});
```

3. **Para errores:**
```typescript
logger.error(error, { 
  component: 'component_name',
  context: 'error_context',
  critical: true|false 
});
```

4. **Para casos específicos:**
```typescript
logger.startupHeader("🔍 SECTION TITLE");
logger.success("✅ Success message");
logger.info("📊 Info message", "🌐");
logger.warn("⚠️ Warning message");
```

Esta arquitectura garantiza logs estructurados, métricas automáticas y mejor observabilidad usando el excelente LoggerService de Uriel.

## 🎯 Tipos de Operaciones

### **1. UPDATE (Actualizaciones de Estado)**
Para cambios de estado de componentes del sistema:
```typescript
// WhatsApp state changes
updatePM2System('whatsapp', 'update', 'client_state', 'success', 'Bot connected successfully', { phoneNumber: '+1234567890' });

// Browser state changes  
updatePM2System('browser', 'update', 'chrome_launch', 'in_progress', 'Launching Chrome browser');

// Validation state changes
updatePM2System('validation', 'update', 'env_check', 'success', 'Environment variables validated');
```

### **2. ERROR (Manejo de Errores)**
Para reportar errores y fallos:
```typescript
// Critical errors
updatePM2System('whatsapp', 'error', 'connection_failed', 'failure', 'Failed to connect to WhatsApp', { error: errorObject });

// Browser errors
updatePM2System('browser', 'error', 'singleton_lock', 'failure', 'Chrome singleton lock conflict', { sessionPath: '/path/to/session' });

// Validation errors
updatePM2System('validation', 'error', 'chrome_not_found', 'failure', 'Chrome executable not found', { attemptedPath: '/usr/bin/chrome' });
```

### **3. LOG (Logging General)**
Para logging informativo y de progreso:
```typescript
// Progress logging
updatePM2System('startup', 'log', 'initialization', 'in_progress', 'Starting bot initialization phase 2/6');

// Success logging
updatePM2System('qr', 'log', 'code_generated', 'success', 'QR code generated and saved', { qrPath: '/path/to/qr.png' });

// Warning logging
updatePM2System('api', 'log', 'rate_limit', 'warning', 'API rate limit approaching threshold', { remainingCalls: 50 });
```

### **4. METRIC (Métricas y Telemetría)**
Para métricas de rendimiento y monitoreo:
```typescript
// Performance metrics
updatePM2System('whatsapp', 'metric', 'message_sent', 'success', 'Message sent successfully', { 
  sendTime: 150, 
  messageType: 'text',
  recipientCount: 1 
});

// System metrics
updatePM2System('browser', 'metric', 'memory_usage', 'success', 'Browser memory check', { 
  memoryMB: 245,
  threshold: 500 
});
```

### **5. STATE (Estados de Ciclo de Vida)**
Para estados específicos de componentes:
```typescript
// WhatsApp lifecycle states
updatePM2System('whatsapp', 'state', 'lifecycle', 'success', 'ready', { 
  previousState: 'authenticating',
  newState: 'ready' 
});

// Browser lifecycle states
updatePM2System('browser', 'state', 'lifecycle', 'success', 'launched', { 
  chromeVersion: '120.0.6099.109',
  headless: true 
});
```

## 🏗️ Comportamiento Inteligente por Contexto

### **Contexto 'whatsapp'**
- `operation: 'state'` → Actualiza estado del bot y genera logs apropiados
- `operation: 'error'` → Maneja reconexión automática si es apropiado
- `operation: 'update'` → Actualiza métricas de WhatsApp específicas

### **Contexto 'browser'**
- `operation: 'error'` → Puede triggerar limpieza de sesión automática
- `operation: 'update'` → Monitorea uso de memoria y recursos
- `operation: 'state'` → Trackea estado del navegador

### **Contexto 'shutdown'**
- Todos los logs se minimizan durante shutdown para evitar spam
- Solo errores críticos se reportan
- Se consolidan múltiples operaciones en logs únicos

### **Contexto 'startup'**
- Logs más verbosos para debugging
- Progress tracking detallado
- Validaciones comprehensive reporting

## 📚 Ejemplos de Uso por Servicio

### **WhatsApp Service**
```typescript
// En lugar de múltiples logs, un solo punto de entrada:
updatePM2System('whatsapp', 'state', 'connection', 'in_progress', 'Connecting to WhatsApp servers');
updatePM2System('whatsapp', 'update', 'qr_generated', 'success', 'QR code ready for scanning', { qrPath });
updatePM2System('whatsapp', 'error', 'auth_failed', 'failure', 'Authentication failed', { reason });
```

### **Browser Service**
```typescript
// Browser operations
updatePM2System('browser', 'update', 'chrome_validation', 'success', 'Chrome executable validated', { chromePath });
updatePM2System('browser', 'error', 'launch_failed', 'failure', 'Failed to launch browser', { error });
updatePM2System('browser', 'log', 'session_cleanup', 'success', 'Session files cleaned', { filesRemoved: 3 });
```

### **API Service**
```typescript
// API operations
updatePM2System('api', 'update', 'server_start', 'success', 'API server listening', { port: 7260 });
updatePM2System('api', 'metric', 'request_handled', 'success', 'POST /send-message', { responseTime: 120 });
updatePM2System('api', 'error', 'validation_failed', 'failure', 'Invalid request payload', { endpoint: '/send-message' });
```

## 🚫 Prohibiciones

### **NO usar directamente:**
- `console.log()`, `console.error()`, etc.
- `logWhatsAppOperation()` 
- `botLogger.*()` en servicios principales
- Múltiples llamadas de logging para una sola operación

### **NO crear funciones de logging personalizadas en servicios**
Todo debe pasar por `updatePM2System()`

## ✅ Beneficios de esta Arquitectura

1. **Logging Centralizado**: Un solo punto de control
2. **Contexto Inteligente**: Comportamiento adaptativo según contexto
3. **Eliminación de Redundancia**: No más logs duplicados
4. **Fácil Debugging**: Formato consistente y predecible
5. **Mejor Monitoreo**: Métricas y estados unificados
6. **Mantenimiento Simplificado**: Cambios en un solo lugar

## 🔧 Implementación en Servicios Existentes

Para migrar servicios existentes:

1. **Identificar todas las llamadas de logging actuales**
2. **Determinar el contexto apropiado** ('whatsapp', 'browser', etc.)
3. **Clasificar la operación** ('update', 'error', 'log', etc.)
4. **Reemplazar con llamada única a `updatePM2System`**
5. **Remover imports de logging anteriores**

Esta arquitectura garantiza logs limpios, eficientes y mantenibles en todo el sistema.
