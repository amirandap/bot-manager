# Ejemplos Prácticos de Migración - Sistema PM2 Unificado

## 🎯 Función Principal

```typescript
import { updatePM2System } from './utils/pm2Utils_unified';
```

## 📝 Ejemplos de Migración Común

### 1. Inicio del Bot

```typescript
// ANTES:
updatePM2Metrics('startup', 'initialization', 'started', 'Iniciando bot...', 0)

// DESPUÉS:
updatePM2System('startup', 'update', 'initialization', 'started', 'Iniciando bot...', { progress: 0 })
```

### 2. WhatsApp Conectado

```typescript
// ANTES:
logWhatsAppOperation('Connection', 'success', 'WhatsApp conectado exitosamente')

// DESPUÉS:
updatePM2System('whatsapp', 'update', 'connected', 'success', 'WhatsApp conectado exitosamente')
```

### 3. Error de Navegador

```typescript
// ANTES:
alertPM2Failure(new Error('Chrome no responde'), 'browser_chrome', false)

// DESPUÉS:
updatePM2System('browser', 'error', 'chrome_timeout', 'failure', 'Chrome no responde', {
  should_restart: false,
  error_details: 'Chrome no responde'
})
```

### 4. QR Code Generado

```typescript
// ANTES:
updatePM2Metrics('whatsapp', 'qr_generated', 'success', 'Código QR listo para escanear')

// DESPUÉS:
updatePM2System('qr', 'update', 'qr_generated', 'success', 'Código QR listo para escanear')
```

### 5. Progreso de Validación

```typescript
// ANTES:
handleStep('VALIDATION', 'progress', { message: 'Validando archivos de configuración...' })

// DESPUÉS:
updatePM2System('startup', 'update', 'validation', 'in_progress', 'Validando archivos de configuración...', {
  step: 'VALIDATION',
  progress: 25
})
```

### 6. API Express Lista

```typescript
// ANTES:
updatePM2Metrics('api', 'express_ready', 'success', 'API Express lista en puerto 3000', 80)

// DESPUÉS:
updatePM2System('api', 'update', 'express_ready', 'success', 'API Express lista en puerto 3000', {
  progress: 80,
  port: 3000
})
```

### 7. Error Crítico de WhatsApp

```typescript
// ANTES:
alertPM2Failure(new Error('WhatsApp desconectado inesperadamente'), 'whatsapp_connection', true)

// DESPUÉS:
updatePM2System('whatsapp', 'error', 'unexpected_disconnect', 'failure', 'WhatsApp desconectado inesperadamente', {
  should_restart: true,
  critical_error: true
})
```

### 8. Shutdown Graceful

```typescript
// ANTES:
notifyPM2Shutdown('SIGTERM', undefined, 'Shutdown solicitado por usuario')

// DESPUÉS:
updatePM2System('shutdown', 'update', 'graceful_shutdown', 'started', 'Iniciando shutdown graceful', {
  signal: 'SIGTERM',
  reason: 'Shutdown solicitado por usuario'
})
```

## 🔄 Patrones de Migración por Contexto

### WhatsApp Operations
```typescript
// Estados de conexión
updatePM2System('whatsapp', 'update', 'connecting', 'in_progress', 'Conectando a WhatsApp...')
updatePM2System('whatsapp', 'update', 'connected', 'success', 'Conectado exitosamente')
updatePM2System('whatsapp', 'error', 'connection_failed', 'failure', 'Error de conexión')

// Estados del QR
updatePM2System('qr', 'update', 'waiting_scan', 'started', 'Esperando escaneo del QR')
updatePM2System('qr', 'update', 'qr_scanned', 'success', 'QR escaneado correctamente')
```

### Browser Operations
```typescript
// Lanzamiento del navegador
updatePM2System('browser', 'update', 'launching', 'started', 'Lanzando navegador Chrome')
updatePM2System('browser', 'update', 'launched', 'success', 'Chrome lanzado exitosamente')
updatePM2System('browser', 'error', 'launch_failed', 'failure', 'Error lanzando Chrome')
```

### Startup Operations
```typescript
// Progreso de inicio
updatePM2System('startup', 'update', 'validation', 'started', 'Validando configuración', { progress: 10 })
updatePM2System('startup', 'update', 'validation', 'success', 'Validación completada', { progress: 25 })
updatePM2System('startup', 'update', 'complete', 'success', 'Startup completado', { progress: 100 })
```

### API Operations
```typescript
// Configuración de API
updatePM2System('api', 'update', 'configuring', 'in_progress', 'Configurando rutas de API')
updatePM2System('api', 'update', 'ready', 'success', 'API lista para recibir requests')
updatePM2System('api', 'error', 'port_conflict', 'failure', 'Puerto 3000 ya en uso')
```

## ⚠️ Casos Especiales

### Errores con Stack Trace
```typescript
try {
  // código que puede fallar
} catch (error) {
  updatePM2System('system', 'error', 'unexpected_error', 'failure', error.message, {
    error_stack: error.stack,
    error_name: error.name,
    critical: true
  })
}
```

### Progreso Detallado
```typescript
for (let i = 0; i <= 100; i += 20) {
  updatePM2System('validation', 'update', 'file_check', 'in_progress', `Validando archivos... ${i}%`, {
    progress: i,
    files_checked: i / 20,
    total_files: 5
  })
}
```

### Durante Shutdown
```typescript
// El sistema automáticamente filtra mensajes durante shutdown
setShutdownContext(true)

// Solo errores críticos se loggearán
updatePM2System('whatsapp', 'error', 'cleanup_failed', 'failure', 'Error limpiando recursos')

// Esto se ignorará automáticamente durante shutdown
updatePM2System('system', 'update', 'routine_check', 'success', 'Check rutinario OK')
```

## 🛠️ Funciones de Utilidad

### Control de Contexto
```typescript
// Activar modo shutdown (solo errores críticos)
setShutdownContext(true)

// Desactivar modo shutdown (logging normal)
setShutdownContext(false)
```

### Estado del Sistema
```typescript
// Verificar si el bot está corriendo
if (isBotCurrentlyRunning()) {
  updatePM2System('system', 'update', 'health_check', 'success', 'Bot corriendo normalmente')
}

// Obtener estado completo
const status = getCurrentBotStatus()
if (status) {
  console.log(`Progreso actual: ${status.current_status.progress_percentage}%`)
}

// Limpiar archivos obsoletos
if (cleanupStaleStatusFile()) {
  updatePM2System('system', 'update', 'cleanup', 'success', 'Archivos obsoletos limpiados')
}
```

## 📊 Datos Adicionales Útiles

```typescript
// Con información de progreso
updatePM2System('startup', 'update', 'step_3', 'in_progress', 'Configurando WhatsApp', {
  progress: 60,
  step_number: 3,
  total_steps: 5,
  estimated_time_remaining: '30s'
})

// Con detalles del error
updatePM2System('browser', 'error', 'chrome_crash', 'failure', 'Chrome se cerró inesperadamente', {
  pid: process.pid,
  memory_usage: process.memoryUsage(),
  chrome_version: '119.0.0.0',
  should_restart: true
})

// Con métricas de rendimiento
updatePM2System('whatsapp', 'update', 'message_sent', 'success', 'Mensaje enviado correctamente', {
  response_time_ms: 1250,
  queue_size: 5,
  success_rate: 98.5
})
```

---

**💡 Tip:** Empieza migrando un archivo a la vez, busca los patrones `updatePM2Metrics`, `alertPM2Failure`, `logWhatsAppOperation` y `handleStep`, y reemplázalos usando esta guía.
