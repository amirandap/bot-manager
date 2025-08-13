# Instrucciones de Copilot - Sistema de Logging Centralizado

## 📋 Arquitectura de Logging Centralizada

### **Principio Fundamental**
**TODA** comunicación de estado, errores, métricas y logging debe pasar por la función centralizada de PM2. Ningún servicio o clase debe hacer logging directo.

### **Función Universal: `updatePM2System`**

```typescript
updatePM2System(
  context: string,        // 'whatsapp' | 'browser' | 'validation' | 'startup' | 'shutdown' | 'api' | 'qr'
  operation: string,      // 'update' | 'error' | 'log' | 'metric' | 'state'
  stepName: string,       // Nombre del paso/operación específica
  status: string,         // 'started' | 'in_progress' | 'success' | 'failure' | 'warning'
  message: string,        // Mensaje descriptivo
  data?: any             // Datos adicionales opcionales
)
```

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
