# 📋 Plan de Migración - Sistema Unificado Basado en LoggerService de Uriel

## 🎯 Objetivo
Migrar completamente el codebase para usar el **LoggerService mejorado de Uriel** con integración Pino + PM2.io, eliminando todas las funciones legacy de logging.

---

## 📊 Estado Actual del Sistema

### **✅ Lo que Uriel ya implementó:**
- **LoggerService.ts** - Sistema base con Pino + PM2.io
- **metrics.ts** - Definiciones de métricas para PM2 dashboard
- **Métodos nuevos:**
  - `log(level, message, context)` - Logging estructurado
  - `error(error, context)` - Manejo de errores con PM2 notifications
  - `updateMetric(metricKey, value)` - Actualización de métricas
  - `logLifecycleStep(step)` - Tracking de lifecycle WhatsApp

### **❌ Lo que necesitamos crear:**
- **Función `unified()`** - API única para reemplazar todas las funciones legacy
- **Migración sistemática** de archivos críticos
- **Limpieza** de archivos legacy

---

## 🔧 PASO 1: Crear la Función Unified()

### **Añadir al LoggerService.ts:**

```typescript
// Tipos para la función unified
type ComponentType = 'startup' | 'whatsapp' | 'api' | 'system' | 'shutdown' | 'validation' | 'browser' | 'qr';
type ActionType = 'start' | 'progress' | 'success' | 'error' | 'warning' | 'ready' | 'info';

interface UnifiedContext {
  error?: Error;
  progress?: number;
  metadata?: any;
  critical?: boolean;
  shouldRestart?: boolean;
}

/**
 * 🎯 FUNCIÓN UNIFICADA - Reemplaza TODO el logging legacy
 * Combina: Pino logging + PM2 metrics + Error handling
 */
public unified(
  component: ComponentType,
  action: ActionType,
  message: string,
  context?: UnifiedContext
): void {
  try {
    // 1. 📝 LOGGING ESTRUCTURADO (Pino)
    const logContext = {
      component,
      action,
      ...context?.metadata,
      ...(context?.error && { error: context.error.message, stack: context.error.stack }),
      ...(context?.progress && { progress: context.progress })
    };

    // 2. 📊 LOG SEGÚN ACTION TYPE
    switch (action) {
      case 'error':
        if (context?.error) {
          this.error(context.error, logContext);
        } else {
          this.log('error', message, logContext);
        }
        break;
      case 'warning':
        this.log('warn', message, logContext);
        break;
      case 'info':
      case 'start':
      case 'progress':
        this.log('info', message, logContext);
        break;
      case 'success':
      case 'ready':
        this.log('info', `✅ ${message}`, logContext);
        break;
      default:
        this.log('info', message, logContext);
    }

    // 3. 📈 ACTUALIZAR MÉTRICAS PM2
    this.updateComponentMetrics(component, action, context);

    // 4. 🚨 ALERTAS CRÍTICAS
    if (action === 'error' && context?.critical) {
      this.sendCriticalAlert(component, message, context);
    }

  } catch (fallbackError) {
    // Fallback silencioso
    console.error(`🚨 UnifiedLogger failed: ${fallbackError}`);
    console.log(`${component}: ${message}`);
  }
}

/**
 * Actualizar métricas específicas por componente y acción
 */
private updateComponentMetrics(
  component: ComponentType,
  action: ActionType,
  context?: UnifiedContext
): void {
  // Métricas automáticas por componente
  switch (component) {
    case 'whatsapp':
      if (action === 'ready') this.updateMetric('WHATSAPP_CONNECTIONS');
      if (action === 'error') this.updateMetric('ERRORS');
      break;
    case 'system':
      if (action === 'error') this.updateMetric('ERRORS');
      break;
  }

  // Métricas por acción
  if (action === 'error') {
    this.updateMetric('ERRORS');
  }
}

/**
 * Enviar alerta crítica via PM2
 */
private sendCriticalAlert(
  component: ComponentType,
  message: string,
  context?: UnifiedContext
): void {
  if (context?.error) {
    io.notifyError(context.error, {
      custom: {
        component,
        message,
        critical: true,
        shouldRestart: context.shouldRestart || false
      }
    });
  }
}
```

---

## 📂 PASO 2: Archivos a Migrar (Por Prioridad)

### **🔥 CRÍTICOS (Migrar Primero)**

#### **1. src/index.ts** - Archivo Principal
**Funciones a reemplazar:**
- `logPM2Event()` → `unified()`  
- `alertPM2Failure()` → `unified()` con `critical: true`

**Líneas específicas:**
```typescript
// LÍNEA 65: logPM2Event('whatsapp', 'info', "Inicializando cliente WhatsApp y sistema QR");
// REEMPLAZAR POR: unified('whatsapp', 'start', "Inicializando cliente WhatsApp y sistema QR");

// LÍNEA 73: logPM2Event('whatsapp', 'success', "Cliente WhatsApp inicializado exitosamente");
// REEMPLAZAR POR: unified('whatsapp', 'success', "Cliente WhatsApp inicializado exitosamente");

// LÍNEA 84-89: logPM2Event + alertPM2Failure
// REEMPLAZAR POR: unified('whatsapp', 'error', `Falló inicialización crítica: Estado ${whatsappStatus.state}`, { 
//   error, critical: true, metadata: { state: whatsappStatus.state, error: whatsappStatus.error } 
// });
```

**Total de reemplazos:** ~15 llamadas

#### **2. src/utils/shutdownUtils.ts** - Manejo de Shutdown
**Funciones a reemplazar:**
- `logPM2Event()` → `unified()`
- `alertPM2Failure()` → `unified()` con `critical: true`

**Líneas específicas:**
```typescript
// LÍNEA 41: logPM2Event('shutdown', 'info', 'Shutdown ya en progreso', { signal });
// REEMPLAZAR POR: unified('shutdown', 'info', 'Shutdown ya en progreso', { metadata: { signal } });

// LÍNEA 68: logPM2Event('shutdown', 'success', 'Shutdown graceful completado', { signal });
// REEMPLAZAR POR: unified('shutdown', 'success', 'Shutdown graceful completado', { metadata: { signal } });

// LÍNEA 70-71: logPM2Event + alertPM2Failure
// REEMPLAZAR POR: unified('shutdown', 'error', 'Error durante shutdown', { 
//   error: shutdownError as Error, critical: true, metadata: { signal } 
// });
```

**Total de reemplazos:** ~6 llamadas

#### **3. src/utils/whatsAppUtils.ts** - Cliente WhatsApp
**Funciones a reemplazar:**
- Todas las llamadas `logPM2Event()` dispersas en el archivo

**Patrones comunes:**
```typescript
// Patrón de estado WhatsApp
logPM2Event('whatsapp', 'info', `WhatsApp state: ${state} - ${info}`, { state, info });
// REEMPLAZAR POR:
unified('whatsapp', 'info', `WhatsApp state: ${state} - ${info}`, { metadata: { state, info } });
```

**Total de reemplazos:** ~20 llamadas

### **⚠️ IMPORTANTES (Migrar Segundo)**

#### **4. src/services/SMTPService.ts**
**Funciones a reemplazar:** `botLogger.*` → `unified()`
```typescript
// LÍNEA 45: botLogger.success("✅ SMTP configured - email notifications enabled");
// REEMPLAZAR POR: unified('system', 'success', "SMTP configured - email notifications enabled");

// LÍNEA 52: botLogger.info(`📧 SMTP not configured...`);
// REEMPLAZAR POR: unified('system', 'info', `SMTP not configured - email notifications disabled`);
```

#### **5. src/services/MediaMessagingService.ts**
**Funciones a reemplazar:** `botLogger.*` → `unified()`
```typescript
// LÍNEA 56: botLogger.info(`🖼️ [BOT] Sending image to: ${formattedRecipient}`);
// REEMPLAZAR POR: unified('whatsapp', 'info', `Sending image to: ${formattedRecipient}`);

// LÍNEA 66: botLogger.success(`✅ [BOT] Image sent successfully to: ${formattedRecipient}`);
// REEMPLAZAR POR: unified('whatsapp', 'success', `Image sent successfully to: ${formattedRecipient}`);
```

#### **6. src/services/WhatsAppErrorHandlerService.ts**
**Funciones a reemplazar:** `botLogger.*` → `unified()`
```typescript
// LÍNEA 377: botLogger.error(`🚨 CRITICAL WhatsApp Error: ${logMessage}`);
// REEMPLAZAR POR: unified('whatsapp', 'error', `CRITICAL WhatsApp Error: ${logMessage}`, { critical: true });

// LÍNEA 380: botLogger.error(`⚠️ HIGH Severity WhatsApp Error: ${logMessage}`);
// REEMPLAZAR POR: unified('whatsapp', 'error', `HIGH Severity WhatsApp Error: ${logMessage}`, { critical: false });
```

### **📝 MENORES (Migrar Tercero)**

#### **7. src/routes/** - Todas las rutas API
**Archivos:**
- `sendToGroup.ts` (~9 llamadas `botLogger.*`)
- `sendBroadcast.ts` (~6 llamadas `botLogger.*`)
- `sendDocumentRoute.ts`
- `sendImageRoute.ts`
- `sendVideoRoute.ts`
- `sendAudioRoute.ts`

**Patrón típico:**
```typescript
// botLogger.info(`Group message request ${requestId} received`);
// REEMPLAZAR POR: unified('api', 'info', `Group message request received`, { metadata: { requestId } });

// botLogger.error(`Request ${requestId}: groupId is required`);
// REEMPLAZAR POR: unified('api', 'error', `groupId is required`, { metadata: { requestId } });
```

#### **8. src/services/DirectoryManagerService.ts**
**Funciones a reemplazar:** `botLogger.*` → `unified()`

---

## 🔄 PASO 3: Patrones de Migración

### **Patrón 1: Log Simple**
```typescript
// ❌ Antes
logPM2Event('startup', 'info', "Mensaje");
// ✅ Después
unified('startup', 'info', "Mensaje");
```

### **Patrón 2: Log con Datos**
```typescript
// ❌ Antes
logPM2Event('whatsapp', 'success', "Conectado", { phoneNumber });
// ✅ Después
unified('whatsapp', 'success', "Conectado", { metadata: { phoneNumber } });
```

### **Patrón 3: Error Crítico**
```typescript
// ❌ Antes (2 llamadas)
logPM2Event('whatsapp', 'error', `Error: ${error.message}`);
alertPM2Failure(error, 'whatsapp_connection', true);
// ✅ Después (1 llamada)
unified('whatsapp', 'error', 'Connection failed', { error, critical: true });
```

### **Patrón 4: botLogger → unified**
```typescript
// ❌ Antes
botLogger.success("✅ Operación exitosa");
// ✅ Después
unified('system', 'success', "Operación exitosa");

// ❌ Antes
botLogger.error(`❌ Error: ${error}`);
// ✅ Después
unified('system', 'error', "Error occurred", { error: new Error(error) });
```

---

## 📊 PASO 4: Estadísticas de Migración

### **Funciones Legacy Encontradas:**

| Archivo | logPM2Event | botLogger | alertPM2Failure | Total |
|---------|-------------|-----------|-----------------|-------|
| `index.ts` | 15 | 3 | 1 | **19** |
| `shutdownUtils.ts` | 6 | 0 | 1 | **7** |
| `whatsAppUtils.ts` | ~20 | 0 | 0 | **20** |
| `SMTPService.ts` | 0 | 2 | 0 | **2** |
| `MediaMessagingService.ts` | 0 | 15 | 0 | **15** |
| `WhatsAppErrorHandlerService.ts` | 0 | 12 | 0 | **12** |
| `routes/sendToGroup.ts` | 0 | 9 | 0 | **9** |
| `routes/sendBroadcast.ts` | 0 | 6 | 0 | **6** |
| Otros routes | 0 | ~30 | 0 | **30** |
| **TOTAL** | **~41** | **~77** | **2** | **~120** |

### **Métricas del Proyecto:**
- **Archivos a modificar:** ~15 archivos críticos
- **Funciones a reemplazar:** ~120 llamadas legacy
- **Tiempo estimado:** 2-3 horas de migración paso a paso

---

## 🎯 PASO 5: Orden de Ejecución

### **Fase 1: Preparación (15 min)**
1. ✅ Añadir función `unified()` al LoggerService.ts
2. ✅ Exportar instancia singleton del LoggerService
3. ✅ Verificar compilación sin errores

### **Fase 2: Migración Crítica (45 min)**
1. 🔥 Migrar `index.ts` (archivo principal)
2. 🔥 Migrar `shutdownUtils.ts` (manejo de cierre)
3. 🔥 Migrar `whatsAppUtils.ts` (cliente WhatsApp)

### **Fase 3: Migración Servicios (30 min)**
1. ⚠️ Migrar `SMTPService.ts`
2. ⚠️ Migrar `MediaMessagingService.ts`
3. ⚠️ Migrar `WhatsAppErrorHandlerService.ts`

### **Fase 4: Migración Routes (30 min)**
1. 📝 Migrar todas las rutas API
2. 📝 Migrar servicios auxiliares

### **Fase 5: Limpieza (15 min)**
1. 🧹 Comentar/eliminar `pm2Utils_unified.ts`
2. 🧹 Actualizar imports en `utils/index.ts`
3. 🧹 Verificar que no queden llamadas legacy

---

## ✅ Criterios de Éxito

### **Verificación Post-Migración:**
1. **Build exitoso:** `npm run build` sin errores
2. **Ejecución correcta:** Bot funciona sin errores de logging
3. **PM2 Metrics:** Métricas aparecen en PM2 dashboard
4. **No legacy calls:** `grep -r "logPM2Event\|alertPM2Failure" src/` retorna 0

### **Beneficios Esperados:**
- ✅ **Sistema unificado** - Una sola función para todo
- ✅ **Pino logging** - Logging estructurado y performante
- ✅ **PM2.io metrics** - Métricas automáticas en dashboard
- ✅ **Error tracking** - Notificaciones automáticas de errores
- ✅ **Código limpio** - Eliminación de duplicación de logging

---

## 🚀 Próximos Pasos

1. **Crear función `unified()`** en LoggerService.ts
2. **Empezar migración** por `index.ts` (archivo más crítico)
3. **Verificar funcionamiento** paso a paso
4. **Continuar** con archivos según prioridad
5. **Limpiar código legacy** al final

**¡El sistema de Uriel nos da la base perfecta para completar la unificación!** 🎯
