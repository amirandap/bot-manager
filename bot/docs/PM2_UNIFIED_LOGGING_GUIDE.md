# Guía del Sistema Unificado de Logging PM2

## 📋 Resumen

El nuevo sistema PM2 simplifica todo el logging a **UNA SOLA FUNCIÓN**: `updatePM2System()`

## 🎯 Función Principal

```typescript
updatePM2System(
  context: 'whatsapp' | 'browser' | 'validation' | 'startup' | 'shutdown' | 'api' | 'qr' | 'system',
  operation: 'update' | 'error',
  stepName: string,
  status: 'started' | 'in_progress' | 'success' | 'failure' | 'warning',
  message: string,
  data?: Record<string, unknown>
)
```

## 📝 Parámetros

### Context (Contexto)
- `'whatsapp'` - Operaciones de WhatsApp
- `'browser'` - Operaciones del navegador
- `'validation'` - Validaciones
- `'startup'` - Proceso de inicio
- `'shutdown'` - Proceso de cierre
- `'api'` - API Express
- `'qr'` - Códigos QR
- `'system'` - Sistema general

### Operation (Operación)
- `'update'` - Actualizaciones normales (estados, progreso, métricas)
- `'error'` - Errores críticos

### Status (Estado)
- `'started'` - Iniciado
- `'in_progress'` - En progreso
- `'success'` - Exitoso
- `'failure'` - Falló
- `'warning'` - Advertencia

## 🔄 Migraciones Necesarias

### 1. **updatePM2Metrics** → **updatePM2System**

```typescript
// ANTES:
updatePM2Metrics('startup', 'validation', 'success', 'Validación completada', 50)

// DESPUÉS:
updatePM2System('startup', 'update', 'validation', 'success', 'Validación completada', { progress: 50 })
```

### 2. **alertPM2Failure** → **updatePM2System**

```typescript
// ANTES:
alertPM2Failure(error, 'whatsapp_connection', true)

// DESPUÉS:
updatePM2System('whatsapp', 'error', 'connection_failed', 'failure', error.message, { 
  should_restart: true,
  error_stack: error.stack 
})
```

### 3. **logWhatsAppOperation** → **updatePM2System**

```typescript
// ANTES:
logWhatsAppOperation('QR Generated', 'success', 'QR code ready for scan')

// DESPUÉS:
updatePM2System('qr', 'update', 'qr_generated', 'success', 'QR code ready for scan')
```

### 4. **handleStep** → **updatePM2System**

```typescript
// ANTES:
handleStep('VALIDATION', 'start', { message: 'Starting validation' })

// DESPUÉS:
updatePM2System('startup', 'update', 'validation', 'started', 'Starting validation', { 
  step: 'VALIDATION',
  progress: 10 
})
```

## 📊 Ejemplos Prácticos

### WhatsApp Conectado
```typescript
updatePM2System('whatsapp', 'update', 'connected', 'success', 'WhatsApp conectado exitosamente')
```

### Error de Navegador
```typescript
updatePM2System('browser', 'error', 'chrome_launch', 'failure', 'No se pudo abrir Chrome', {
  error_details: error.message,
  should_restart: false
})
```

### Progreso de Startup
```typescript
updatePM2System('startup', 'update', 'api_setup', 'in_progress', 'Configurando API Express', {
  progress: 75,
  step_number: 4,
  total_steps: 6
})
```

### Estado de QR
```typescript
updatePM2System('qr', 'update', 'waiting_scan', 'started', 'Esperando escaneo del código QR')
```

## 🏗️ Arquitectura Simplificada

```
┌─────────────────────────────────────────┐
│           updatePM2System()             │  ← ÚNICA ENTRADA
│     (context, operation, step, status)  │
└──────────────┬──────────────────────────┘
               │
               ▼
┌─────────────────────────────────────────┐
│        Procesamiento Interno            │
│  • Logging automático a consola         │
│  • Envío a PM2 o JSON fallback         │
│  • Manejo inteligente de shutdown       │
└─────────────────────────────────────────┘
```

## ✅ Beneficios

1. **Simplicidad**: Solo una función para todo
2. **Consistencia**: Formato unificado
3. **Inteligencia**: Manejo automático del contexto
4. **Flexibilidad**: Fácil de extender
5. **Robustez**: Fallback automático a JSON

## 🚀 Plan de Migración

### Paso 1: Actualizar imports
```typescript
// Cambiar todas las importaciones para usar solo updatePM2System
import { updatePM2System } from './utils/pm2Utils_new';
```

### Paso 2: Reemplazar llamadas función por función
- Buscar cada `updatePM2Metrics`
- Buscar cada `alertPM2Failure`
- Buscar cada `logWhatsAppOperation`
- Buscar cada `handleStep`, `startStep`, etc.

### Paso 3: Verificar contextos
- `whatsapp` para operaciones de WhatsApp
- `startup` para inicialización
- `browser` para Puppeteer
- `api` para Express
- `qr` para códigos QR

### Paso 4: Convertir parámetros
- `progress` va en el objeto `data`
- Errores van en `data.error_details`
- Información adicional va en `data`

## 🎨 Constantes Disponibles

### Pasos de Startup
```typescript
STARTUP_STEPS = {
  VALIDATION: 'startup_validation',
  WHATSAPP_CLIENT: 'whatsapp_client_initialization',
  ERROR_CHECK: 'initialization_error_check',
  API_SETUP: 'express_api_setup',
  SHUTDOWN_HANDLERS: 'graceful_shutdown_setup',
  COMPLETE: 'startup_complete'
}
```

### Estados de WhatsApp
```typescript
WHATSAPP_LIFECYCLE_STEPS = {
  INITIALIZING: 'whatsapp_initializing',
  CONNECTED: 'whatsapp_connected',
  READY: 'whatsapp_ready',
  // ... más estados
}
```

## ⚠️ Notas Importantes

1. **Siempre se loggea**: No hay condicionales de logging, todo se registra automáticamente
2. **Context-aware**: El sistema sabe cuándo está en shutdown y ajusta el comportamiento
3. **Backward compatible**: Las funciones legacy siguen disponibles durante la transición
4. **JSON fallback**: Si PM2 no está disponible, se guarda en archivo JSON automáticamente

## 🔧 Funciones de Utilidad

### Control de Shutdown
```typescript
setShutdownContext(true)  // Activar modo shutdown
```

### Estado del Bot
```typescript
getCurrentBotStatus()     // Obtener estado actual
isBotCurrentlyRunning()   // Verificar si está corriendo
```

### Cleanup
```typescript
cleanupStaleStatusFile()  // Limpiar archivos obsoletos
```

---

**¿Listo para la migración?** Empieza por un archivo a la vez, reemplazando las llamadas antiguas con `updatePM2System()` usando esta guía.
