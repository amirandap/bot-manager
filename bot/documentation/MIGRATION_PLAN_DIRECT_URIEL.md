# 📋 Plan de Migración Directa - Usar LoggerService de Uriel

## 🎯 Objetivo
Migrar directamente las funciones legacy (`logPM2Event`, `botLogger.*`, `alertPM2Failure`) para usar los **métodos existentes del LoggerService de Uriel**.

---

## 🔧 Métodos Disponibles en LoggerService de Uriel

### **✅ Métodos que Uriel ya implementó:**

```typescript
import { logger } from '../services/LoggerService';

// 1. 📝 LOGGING ESTRUCTURADO
logger.log(level, message, context);
// level: 'debug' | 'info' | 'warn' | 'error' | 'fatal'

// 2. 🚨 MANEJO DE ERRORES
logger.error(error, context);
// Automáticamente: io.notifyError() + updateMetric('ERRORS')

// 3. 📊 ACTUALIZAR MÉTRICAS
logger.updateMetric(metricKey, value);
// metricKey: 'WHATSAPP_CONNECTIONS' | 'QR_CODES' | 'MESSAGES' | 'ERRORS' | etc.

// 4. 🔄 LIFECYCLE TRACKING
logger.logLifecycleStep(step);
// step: 'CONNECTED' | 'QR_READY' | etc.
```

---

## 🔄 Patrones de Migración Directa

### **Patrón 1: logPM2Event() → logger.log()**

```typescript
// ❌ ANTES
logPM2Event('whatsapp', 'info', "Cliente inicializado");
logPM2Event('whatsapp', 'success', "Conexión exitosa");
logPM2Event('whatsapp', 'error', "Error de conexión");

// ✅ DESPUÉS
logger.log('info', "Cliente inicializado", { component: 'whatsapp' });
logger.log('info', "✅ Conexión exitosa", { component: 'whatsapp' });
logger.log('error', "Error de conexión", { component: 'whatsapp' });
```

### **Patrón 2: logPM2Event() con datos → logger.log() con context**

```typescript
// ❌ ANTES
logPM2Event('whatsapp', 'success', "WhatsApp conectado", { phoneNumber });
logPM2Event('startup', 'info', "Validación completada", { step: 'validation', progress: 100 });

// ✅ DESPUÉS
logger.log('info', "✅ WhatsApp conectado", { 
  component: 'whatsapp', 
  phoneNumber 
});
logger.log('info', "Validación completada", { 
  component: 'startup', 
  step: 'validation', 
  progress: 100 
});
```

### **Patrón 3: alertPM2Failure() → logger.error()**

```typescript
// ❌ ANTES
alertPM2Failure(error, 'whatsapp_connection', true);
alertPM2Failure(error, 'startup_validation', false);

// ✅ DESPUÉS
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

### **Patrón 4: botLogger.* → logger.log()**

```typescript
// ❌ ANTES
botLogger.success("✅ Operación exitosa");
botLogger.info("ℹ️ Información general", "🔍");
botLogger.warn("⚠️ Advertencia");
botLogger.error("❌ Error occurred");

// ✅ DESPUÉS
logger.log('info', "✅ Operación exitosa", { component: 'system' });
logger.log('info', "🔍 Información general", { component: 'system' });
logger.log('warn', "⚠️ Advertencia", { component: 'system' });
logger.log('error', "❌ Error occurred", { component: 'system' });
```

### **Patrón 5: Errores complejos con botLogger**

```typescript
// ❌ ANTES
botLogger.error(`❌ Critical error: ${error.message}`);

// ✅ DESPUÉS
logger.error(error, { component: 'system', severity: 'critical' });
```

---

## 📂 Archivos a Migrar (Orden de Prioridad)

### **🔥 FASE 1: Archivos Críticos**

#### **1. src/index.ts** - 19 reemplazos

**Imports a cambiar:**
```typescript
// ❌ Eliminar
import { alertPM2Failure, logPM2Event } from "./utils/pm2Utils_unified";
import { botLogger } from "./utils/loggerWrapper";

// ✅ Añadir
import { logger } from './services/LoggerService';
```

**Migraciones específicas:**
```typescript
// LÍNEA 65 ❌
logPM2Event('whatsapp', 'info', "Inicializando cliente WhatsApp y sistema QR");
// ✅
logger.log('info', "Inicializando cliente WhatsApp y sistema QR", { component: 'whatsapp' });

// LÍNEA 73 ❌
logPM2Event('whatsapp', 'success', "Cliente WhatsApp inicializado exitosamente");
// ✅
logger.log('info', "✅ Cliente WhatsApp inicializado exitosamente", { component: 'whatsapp' });

// LÍNEA 84-89 ❌ (2 llamadas)
logPM2Event('whatsapp', 'error', `Falló inicialización crítica de WhatsApp: Estado ${whatsappStatus.state}`, { ... });
alertPM2Failure(error, 'whatsapp_critical', false);
// ✅ (1 llamada)
logger.error(error, { 
  component: 'whatsapp', 
  context: 'initialization', 
  state: whatsappStatus.state,
  critical: true 
});

// LÍNEA 48 ❌
botLogger.startupHeader("🔍 STARTUP VALIDATION");
// ✅
logger.log('info', "🔍 STARTUP VALIDATION", { component: 'startup', type: 'header' });
```

#### **2. src/utils/shutdownUtils.ts** - 7 reemplazos

**Imports a cambiar:**
```typescript
// ❌ Eliminar
import { notifyPM2Shutdown, alertPM2Failure, logPM2Event, setShutdownContext } from "./pm2Utils_unified";

// ✅ Añadir
import { logger } from '../services/LoggerService';
```

**Migraciones específicas:**
```typescript
// LÍNEA 41 ❌
logPM2Event('shutdown', 'info', 'Shutdown ya en progreso', { signal });
// ✅
logger.log('info', 'Shutdown ya en progreso', { component: 'shutdown', signal });

// LÍNEA 68 ❌
logPM2Event('shutdown', 'success', 'Shutdown graceful completado', { signal });
// ✅
logger.log('info', '✅ Shutdown graceful completado', { component: 'shutdown', signal });

// LÍNEA 70-71 ❌ (2 llamadas)
logPM2Event('shutdown', 'error', `Error durante shutdown: ${shutdownError}`, { signal, shutdownError });
alertPM2Failure(shutdownError as Error, 'shutdown');
// ✅ (1 llamada)
logger.error(shutdownError as Error, { 
  component: 'shutdown', 
  signal,
  critical: true 
});
```

#### **3. src/utils/whatsAppUtils.ts** - ~20 reemplazos

**Migración del patrón `updateWhatsAppState`:**
```typescript
// ❌ ANTES
logPM2Event('whatsapp', 'info', `WhatsApp state: ${state} - ${info}`, { state, info });

// ✅ DESPUÉS
logger.log('info', `WhatsApp state: ${state} - ${info}`, { 
  component: 'whatsapp', 
  state, 
  info 
});
```

### **⚠️ FASE 2: Servicios Importantes**

#### **4. src/services/SMTPService.ts** - 2 reemplazos

```typescript
// ❌ ANTES
import { botLogger } from "../utils/loggerWrapper";
botLogger.success("✅ SMTP configured - email notifications enabled");
botLogger.info(`📧 SMTP not configured - email notifications disabled (missing: ${missing.join(", ")})`);

// ✅ DESPUÉS
import { logger } from './LoggerService';
logger.log('info', "✅ SMTP configured - email notifications enabled", { component: 'smtp' });
logger.log('info', `📧 SMTP not configured - email notifications disabled`, { 
  component: 'smtp', 
  missing: missing.join(", ") 
});
```

#### **5. src/services/MediaMessagingService.ts** - 15 reemplazos

```typescript
// ❌ ANTES
import { botLogger } from "../utils/loggerWrapper";
botLogger.info(`🖼️ [BOT] Sending image to: ${formattedRecipient}`);
botLogger.success(`✅ [BOT] Image sent successfully to: ${formattedRecipient}`);
botLogger.error(`❌ [BOT] Error sending image to ${recipient}: ${error}`);

// ✅ DESPUÉS
import { logger } from './LoggerService';
logger.log('info', `🖼️ Sending image to: ${formattedRecipient}`, { 
  component: 'whatsapp', 
  action: 'send_image',
  recipient: formattedRecipient 
});
logger.log('info', `✅ Image sent successfully to: ${formattedRecipient}`, { 
  component: 'whatsapp', 
  action: 'send_image_success',
  recipient: formattedRecipient 
});
logger.log('error', `Error sending image to ${recipient}`, { 
  component: 'whatsapp', 
  action: 'send_image_error',
  recipient,
  error: error.toString()
});
```

#### **6. src/services/WhatsAppErrorHandlerService.ts** - 12 reemplazos

```typescript
// ❌ ANTES
botLogger.error(`🚨 CRITICAL WhatsApp Error: ${logMessage}`);
botLogger.error(`⚠️ HIGH Severity WhatsApp Error: ${logMessage}`);
botLogger.warn(`⚡ MEDIUM Severity WhatsApp Error: ${logMessage}`);

// ✅ DESPUÉS
logger.log('error', `🚨 CRITICAL WhatsApp Error: ${logMessage}`, { 
  component: 'whatsapp', 
  severity: 'critical' 
});
logger.log('error', `⚠️ HIGH Severity WhatsApp Error: ${logMessage}`, { 
  component: 'whatsapp', 
  severity: 'high' 
});
logger.log('warn', `⚡ MEDIUM Severity WhatsApp Error: ${logMessage}`, { 
  component: 'whatsapp', 
  severity: 'medium' 
});
```

### **📝 FASE 3: Routes API** - ~50 reemplazos

#### **Patrón general para todas las routes:**

```typescript
// ❌ ANTES
import { botLogger } from "../utils/loggerWrapper";
botLogger.info(`Group message request ${requestId} received`);
botLogger.error(`Request ${requestId}: groupId is required`);
botLogger.success(`✅ [BOT] Group message sent successfully to ${groupInfo?.subject || groupId}`);

// ✅ DESPUÉS
import { logger } from '../services/LoggerService';
logger.log('info', `Group message request received`, { 
  component: 'api', 
  route: 'sendToGroup',
  requestId 
});
logger.log('error', `groupId is required`, { 
  component: 'api', 
  route: 'sendToGroup',
  requestId,
  validation: 'missing_groupId'
});
logger.log('info', `✅ Group message sent successfully`, { 
  component: 'api', 
  route: 'sendToGroup',
  requestId,
  groupId,
  groupName: groupInfo?.subject
});
```

**Routes a migrar:**
- `src/routes/sendToGroup.ts` (9 reemplazos)
- `src/routes/sendBroadcast.ts` (6 reemplazos)
- `src/routes/sendMessage.ts`
- `src/routes/sendToPhone.ts`
- `src/routes/sendDocumentRoute.ts`
- `src/routes/sendImageRoute.ts`
- `src/routes/sendVideoRoute.ts`
- `src/routes/sendAudioRoute.ts`

---

## 🎯 Plan de Ejecución Paso a Paso

### **PASO 1: Preparar LoggerService** ⏱️ 5 min
1. ✅ Verificar que LoggerService esté exportando la instancia singleton
2. ✅ Asegurar que los métodos `log()` y `error()` funcionen correctamente

### **PASO 2: Migrar index.ts** ⏱️ 15 min
1. 🔄 Cambiar imports
2. 🔄 Reemplazar 15 llamadas `logPM2Event`
3. 🔄 Reemplazar 1 llamada `alertPM2Failure`
4. 🔄 Reemplazar 3 llamadas `botLogger`
5. ✅ Probar que el bot arranque correctamente

### **PASO 3: Migrar shutdownUtils.ts** ⏱️ 10 min
1. 🔄 Cambiar imports
2. 🔄 Reemplazar 6 llamadas `logPM2Event`
3. 🔄 Reemplazar 1 llamada `alertPM2Failure`
4. ✅ Probar shutdown graceful

### **PASO 4: Migrar whatsAppUtils.ts** ⏱️ 20 min
1. 🔄 Cambiar imports
2. 🔄 Reemplazar ~20 llamadas `logPM2Event`
3. ✅ Probar funcionalidad WhatsApp

### **PASO 5: Migrar Servicios** ⏱️ 20 min
1. 🔄 SMTPService.ts (2 reemplazos)
2. 🔄 MediaMessagingService.ts (15 reemplazos)
3. 🔄 WhatsAppErrorHandlerService.ts (12 reemplazos)

### **PASO 6: Migrar Routes API** ⏱️ 30 min
1. 🔄 Migrar todas las routes con el patrón estándar
2. ✅ Probar endpoints API

### **PASO 7: Limpieza Final** ⏱️ 10 min
1. 🧹 Verificar que no queden imports legacy
2. 🧹 Comentar/eliminar `pm2Utils_unified.ts`
3. 🧹 Actualizar `utils/index.ts`
4. ✅ Build final y pruebas

---

## ✅ Verificación de Éxito

### **Comandos de Verificación:**
```bash
# 1. No deben quedar llamadas legacy
grep -r "logPM2Event\|alertPM2Failure" src/ --include="*.ts"
# Resultado esperado: 0 matches

# 2. Verificar imports del LoggerService
grep -r "import.*LoggerService" src/ --include="*.ts"
# Debe mostrar todos los archivos migrados

# 3. Build exitoso
npm run build
# Sin errores

# 4. Ejecución correcta
npm start
# Bot debe arrancar correctamente con logs estructurados
```

### **Beneficios Esperados:**
- ✅ **Logs estructurados** con Pino (mejor performance y formato)
- ✅ **Métricas PM2** automáticas (errores, conexiones, etc.)
- ✅ **Context enriquecido** (component, action, metadata)
- ✅ **Error notifications** automáticas a PM2
- ✅ **Código más limpio** (menos funciones duplicadas)

---

## 📊 Resumen de Migración

| Fase | Archivos | Reemplazos | Tiempo | Riesgo |
|------|----------|------------|--------|--------|
| **1. Críticos** | 3 | ~46 | 45 min | Alto |
| **2. Servicios** | 3 | ~29 | 20 min | Medio |
| **3. Routes** | 8 | ~50 | 30 min | Bajo |
| **4. Limpieza** | - | - | 10 min | Bajo |
| **TOTAL** | **14** | **~125** | **105 min** | - |

**🎯 ¡Plan directo y eficiente para usar directamente el excelente trabajo de Uriel!**
