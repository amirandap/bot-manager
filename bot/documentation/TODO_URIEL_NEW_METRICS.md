# 📋 TODO para Uriel - Nuevas Métricas PM2.io

## 🎯 Objetivo

Implementar 3 nuevas métricas en el LoggerService para mejorar el monitoreo del estado del bot en tiempo real.

---

## 📊 Métricas a Implementar

### 1️⃣ **WHATSAPP_STATUS** (Métrica de Estado)
**Tipo**: `metric`  
**ID**: `whatsapp/status`  
**Descripción**: Estado actual del ciclo de vida de WhatsApp  

#### Estados a Monitorear:
```typescript
enum WhatsAppStatusValues {
  INITIALIZING = 0,      // Bot iniciando
  WAITING_FOR_QR = 1,    // Esperando QR code
  QR_READY = 2,          // QR code listo para escanear
  QR_SCANNED = 3,        // QR code escaneado
  AUTHENTICATING = 4,    // Autenticando con WhatsApp
  CONNECTED = 5,         // Conectado a WhatsApp
  READY = 6,             // Bot completamente funcional
  DISCONNECTED = 7,      // Desconectado
  RECONNECTING = 8,      // Intentando reconectar
  LOADING = 9,           // Cargando recursos
  STOPPING = 10,         // Deteniéndose
  STOPPED = 11          // Completamente detenido
}
```

#### Implementación Sugerida:
```typescript
// En metrics.ts
WHATSAPP_STATUS: {
  name: 'WhatsApp Status',
  type: 'metric',
  id: 'whatsapp/status',
  unit: 'enum'
}

// En LoggerService.ts
public updateWhatsAppStatus(state: BotLifecycleState): void {
  const statusMap = {
    'initializing': 0,
    'waiting_for_qr': 1,
    'qr_ready': 2,
    'qr_scanned': 3,
    'authenticating': 4,
    'connected': 5,
    'ready': 6,
    'disconnected': 7,
    'reconnecting': 8,
    'loading': 9,
    'stopping': 10,
    'stopped': 11
  };
  
  const statusValue = statusMap[state] ?? -1;
  this.updateMetric('WHATSAPP_STATUS', statusValue);
}
```

---

### 2️⃣ **BROWSER_STATUS** (Métrica de Estado del Browser)
**Tipo**: `metric`  
**ID**: `browser/status`  
**Descripción**: Estado actual del navegador Puppeteer  

#### Estados a Monitorear:
```typescript
enum BrowserStatusValues {
  BROWSER_LAUNCHING = 0,  // Lanzando navegador
  BROWSER_READY = 1,      // Navegador listo
  ERROR_BROWSER = 2,      // Error general del browser
  ERROR_CHROME = 3        // Error específico de Chrome
}
```

#### Implementación Sugerida:
```typescript
// En metrics.ts
BROWSER_STATUS: {
  name: 'Browser Status',
  type: 'metric',
  id: 'browser/status',
  unit: 'enum'
}

// En LoggerService.ts
public updateBrowserStatus(status: 'launching' | 'ready' | 'error_browser' | 'error_chrome'): void {
  const statusMap = {
    'launching': 0,
    'ready': 1,
    'error_browser': 2,
    'error_chrome': 3
  };
  
  const statusValue = statusMap[status] ?? -1;
  this.updateMetric('BROWSER_STATUS', statusValue);
}
```

---

### 3️⃣ **ERROR_CATEGORIES** (Métrica de Categorías de Error)
**Tipo**: `counter`  
**ID**: `errors/categories`  
**Descripción**: Contador por categoría de error para análisis detallado  

#### Categorías a Monitorear:
```typescript
enum ErrorCategories {
  VALIDATION = 'validation',
  CHROME = 'chrome', 
  BROWSER = 'browser',
  CONNECTION = 'connection',
  AUTHENTICATION = 'authentication',
  QR_ERROR = 'qr_error',
  UNKNOWN = 'unknown'
}
```

#### Implementación Sugerida:
```typescript
// En metrics.ts
ERROR_VALIDATION: {
  name: 'Validation Errors',
  type: 'counter',
  id: 'errors/validation'
},
ERROR_CHROME: {
  name: 'Chrome Errors', 
  type: 'counter',
  id: 'errors/chrome'
},
ERROR_BROWSER: {
  name: 'Browser Errors',
  type: 'counter', 
  id: 'errors/browser'
},
ERROR_CONNECTION: {
  name: 'Connection Errors',
  type: 'counter',
  id: 'errors/connection' 
},
ERROR_AUTHENTICATION: {
  name: 'Authentication Errors',
  type: 'counter',
  id: 'errors/authentication'
},
ERROR_QR: {
  name: 'QR Code Errors',
  type: 'counter', 
  id: 'errors/qr'
},
ERROR_UNKNOWN: {
  name: 'Unknown Errors',
  type: 'counter',
  id: 'errors/unknown'
}

// En LoggerService.ts
public updateErrorCategory(category: string): void {
  const metricKey = `ERROR_${category.toUpperCase()}`;
  if (this.metrics.has(metricKey)) {
    this.updateMetric(metricKey as keyof typeof METRICS);
  }
}
```

---

## 🔧 Integración con Sistema Actual

### 🔄 **Actualización Automática en updateWhatsAppState**
Modificar la función existente en `whatsAppUtils.ts`:

```typescript
// En whatsAppUtils.ts
export const updateWhatsAppState = (state: BotLifecycleState, info: string = ""): void => {
  currentState = state;
  
  // Log existing
  logger.log('info', `WhatsApp state: ${state} - ${info}`, { state, info });
  
  // NUEVO: Actualizar métrica de estado
  logger.updateWhatsAppStatus(state);
  
  // NUEVO: Si es estado de error, actualizar categoría de error
  if (state.startsWith('error_')) {
    const errorCategory = state.replace('error_', '');
    logger.updateErrorCategory(errorCategory);
  }
};
```

### 🔄 **Integración con Estados de Browser**
En los archivos que manejan Puppeteer:

```typescript
// Al lanzar browser
logger.updateBrowserStatus('launching');

// Al estar listo
logger.updateBrowserStatus('ready');

// En errores
logger.updateBrowserStatus('error_browser'); // o 'error_chrome'
```

---

## 📊 Beneficios Esperados

### 🎯 **Dashboard PM2.io**
- ✅ Estado visual en tiempo real de WhatsApp
- ✅ Estado del navegador para debugging
- ✅ Análisis detallado de errores por categoría

### 📈 **Monitoreo Mejorado**
- ✅ Identificar patrones de errores específicos
- ✅ Tiempo en cada estado del ciclo de vida
- ✅ Detección rápida de problemas de browser

### 🚨 **Alertas Inteligentes**
- ✅ Alertar si está mucho tiempo en `WAITING_FOR_QR`
- ✅ Alertar por errores frecuentes de Chrome
- ✅ Alertar por reconexiones constantes

---

## 📋 Lista de Tareas para Uriel

### ✅ **Paso 1: Actualizar metrics.ts**
- [ ] Agregar `WHATSAPP_STATUS` metric
- [ ] Agregar `BROWSER_STATUS` metric  
- [ ] Agregar métricas de `ERROR_*` categories

### ✅ **Paso 2: Actualizar LoggerService.ts**
- [ ] Implementar `updateWhatsAppStatus()` method
- [ ] Implementar `updateBrowserStatus()` method
- [ ] Implementar `updateErrorCategory()` method
- [ ] Actualizar `initializeMetrics()` para las nuevas métricas

### ✅ **Paso 3: Integrar con Sistema Existente**
- [ ] Modificar `updateWhatsAppState()` en whatsAppUtils.ts
- [ ] Agregar calls de browser status donde corresponda
- [ ] Testear que las métricas se actualicen correctamente

### ✅ **Paso 4: Validación**
- [ ] Verificar métricas en PM2.io dashboard
- [ ] Confirmar valores correctos para cada estado
- [ ] Testear transiciones de estados

---

## 🔍 Archivos a Modificar

1. **`src/types/metrics.ts`** - Agregar definiciones de métricas
2. **`src/services/LoggerService.ts`** - Implementar métodos
3. **`src/utils/whatsAppUtils.ts`** - Integrar updates automáticos
4. **Files que manejan Puppeteer** - Agregar browser status updates

---

## 📞 Puntos de Contacto

Si tienes dudas sobre:
- **Estados específicos**: Revisar `BotLifecycleState` enum en `types.ts`
- **Métricas PM2.io**: Ver `PM2_METRICS_CURRENT_USAGE.md`
- **Implementación actual**: Ver `LoggerService.ts` métodos existentes

---

**Prioridad**: 🔥 Alta  
**Estimación**: 2-3 horas de desarrollo  
**Testing**: Validar con PM2.io dashboard  
**Fecha objetivo**: ASAP para mejor monitoreo  

¡Gracias Uriel! 🚀
