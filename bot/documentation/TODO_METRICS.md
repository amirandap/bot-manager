# 📊 Bot Manager - Todas las Métricas y Estados Disponibles

## 🎯 Resumen Ejecutivo

Este documento contiene una vista completa de todos los estados, métricas y eventos disponibles en el bot manager, extraídos del análisis de `whatsAppUtils.ts`, `BotLifecycleState`, y el sistema de métricas actual.

---

## 🔄 Estados del Ciclo de Vida (BotLifecycleState)

### 🚀 **Estados de Startup/Inicialización**

| Estado | Valor | Descripción | Cuándo se Activa |
|--------|-------|-------------|------------------|
| `INITIALIZING` | `"initializing"` | Bot iniciando, estado inicial | Al comenzar la inicialización |
| `BROWSER_LAUNCHING` | `"browser_launching"` | Lanzando navegador Puppeteer | Al inicializar WhatsApp client |
| `WAITING_FOR_QR` | `"waiting_for_qr"` | Esperando generación de QR | Después de QR generado |
| `QR_READY` | `"qr_ready"` | QR code listo para escanear | QR guardado y disponible |
| `QR_SCANNED` | `"qr_scanned"` | QR code escaneado por usuario | Usuario escanea QR (opcional) |
| `QR_ERROR` | `"qr_error"` | Error en generación/manejo de QR | Fallo en QR generation |
| `AUTHENTICATING` | `"authenticating"` | Autenticando con WhatsApp | Después de escanear QR |

### ✅ **Estados Operacionales**

| Estado | Valor | Descripción | Cuándo se Activa |
|--------|-------|-------------|------------------|
| `READY` | `"ready"` | Bot completamente funcional | WhatsApp client ready |
| `CONNECTED` | `"connected"` | Conectado a WhatsApp | Conexión establecida |
| `LOADING` | `"loading"` | Cargando recursos/configuración | Operaciones de carga |

### 🔄 **Estados de Reconexión**

| Estado | Valor | Descripción | Cuándo se Activa |
|--------|-------|-------------|------------------|
| `DISCONNECTED` | `"disconnected"` | Desconectado de WhatsApp | Pérdida de conexión |
| `RECONNECTING` | `"reconnecting"` | Intentando reconectar | Después de LOGOUT/desconexión |

### 🚨 **Estados de Error**

| Estado | Valor | Descripción | Cuándo se Activa |
|--------|-------|-------------|------------------|
| `ERROR_VALIDATION` | `"error_validation"` | Error en validación inicial | Fallo en inicialización |
| `ERROR_CHROME` | `"error_chrome"` | Error de Chrome/Puppeteer | Problema con Chrome browser |
| `ERROR_BROWSER` | `"error_browser"` | Error general del navegador | Problema con browser |
| `ERROR_CONNECTION` | `"error_connection"` | Error de conexión a WhatsApp | Fallo de red/conexión |
| `ERROR_AUTHENTICATION` | `"error_authentication"` | Error de autenticación | Fallo en auth con WhatsApp |
| `ERROR_UNKNOWN` | `"error_unknown"` | Error no categorizado | Errores no identificados |

### 🛑 **Estados de Shutdown**

| Estado | Valor | Descripción | Cuándo se Activa |
|--------|-------|-------------|------------------|
| `STOPPING` | `"stopping"` | Bot deteniéndose | Proceso de shutdown |
| `STOPPED` | `"stopped"` | Bot completamente detenido | Shutdown completado |

---

## 📈 Métricas PM2.io Implementadas

### 🔗 **Métricas de Conexión**

| Métrica | Tipo | ID | Descripción | Cuándo se Actualiza |
|---------|------|----|-----------|--------------------|
| `WHATSAPP_CONNECTIONS` | meter | `whatsapp/connections` | Tasa de conexiones exitosas | Al conectarse (`CONNECTED` state) |
| `QR_CODES` | counter | `whatsapp/qrcodes` | Códigos QR generados | Al generar QR (`QR_READY` state) |

### 💬 **Métricas de Mensajería**

| Métrica | Tipo | ID | Descripción | Cuándo se Actualiza |
|---------|------|----|-----------|--------------------|
| `MESSAGES` | meter | `whatsapp/messages` | Tasa de mensajes procesados | Al procesar mensaje (`READY` state) |
| `MESSAGE_PROCESSING_TIME` | histogram | `whatsapp/message-processing-time` | Tiempo de procesamiento (ms) | Inicio/fin de procesamiento |

### 🚨 **Métricas de Errores**

| Métrica | Tipo | ID | Descripción | Cuándo se Actualiza |
|---------|------|----|-----------|--------------------|
| `ERRORS` | meter | `whatsapp/errors` | Tasa de errores del sistema | Automático en `logger.error()` |

### 🖥️ **Métricas de Sistema**

| Métrica | Tipo | ID | Descripción | Cuándo se Actualiza |
|---------|------|----|-----------|--------------------|
| `BROWSER_MEMORY` | metric | `browser/memory` | Uso de memoria del browser (MB) | Monitoreo periódico |
| `BROWSER_CPU` | metric | `browser/cpu` | Uso de CPU del browser (%) | Monitoreo periódico |

---

## 🔄 Mapeo de Lifecycle Steps a Métricas

### 📋 **WHATSAPP_LIFECYCLE_STEPS**

| Step | Valor PM2 | Estado Relacionado | Métrica Actualizada |
|------|-----------|-------------------|-------------------|
| `INITIALIZING` | `whatsapp_initializing` | `INITIALIZING` | - |
| `BROWSER_LAUNCHING` | `whatsapp_browser_launching` | `BROWSER_LAUNCHING` | - |
| `WAITING_FOR_QR` | `whatsapp_waiting_for_qr` | `WAITING_FOR_QR` | - |
| `QR_READY` | `whatsapp_qr_ready` | `QR_READY` | `QR_CODES` ✅ |
| `QR_SCANNED` | `whatsapp_qr_scanned` | `QR_SCANNED` | - |
| `AUTHENTICATING` | `whatsapp_authenticating` | `AUTHENTICATING` | - |
| `CONNECTED` | `whatsapp_connected` | `CONNECTED` | `WHATSAPP_CONNECTIONS` ✅ |
| `READY` | `whatsapp_ready` | `READY` | `MESSAGES` ✅ |
| `DISCONNECTED` | `whatsapp_disconnected` | `DISCONNECTED` | - |
| `RECONNECTING` | `whatsapp_reconnecting` | `RECONNECTING` | - |
| `LOADING` | `whatsapp_loading` | `LOADING` | - |
| `ERROR_BROWSER` | `whatsapp_error_browser` | `ERROR_BROWSER` | `ERRORS` ✅ |
| `ERROR_CHROME` | `whatsapp_error_chrome` | `ERROR_CHROME` | `ERRORS` ✅ |
| `ERROR_VALIDATION` | `whatsapp_error_validation` | `ERROR_VALIDATION` | `ERRORS` ✅ |
| `ERROR_CONNECTION` | `whatsapp_error_connection` | `ERROR_CONNECTION` | `ERRORS` ✅ |
| `ERROR_AUTHENTICATION` | `whatsapp_error_authentication` | `ERROR_AUTHENTICATION` | `ERRORS` ✅ |
| `ERROR_UNKNOWN` | `whatsapp_error_unknown` | `ERROR_UNKNOWN` | `ERRORS` ✅ |
| `QR_ERROR` | `whatsapp_qr_error` | `QR_ERROR` | `ERRORS` ✅ |
| `STOPPING` | `whatsapp_stopping` | `STOPPING` | - |
| `STOPPED` | `whatsapp_stopped` | `STOPPED` | - |

---

## 🎯 Métricas Potenciales (No Implementadas)

### 📊 **Métricas de Estado Sugeridas**

| Métrica Sugerida | Tipo | ID Sugerido | Descripción | Beneficio |
|------------------|------|-------------|-------------|-----------|
| `STATE_TRANSITIONS` | meter | `whatsapp/state-transitions` | Tasa de cambios de estado | Detectar inestabilidad |
| `QR_SCAN_TIME` | histogram | `whatsapp/qr-scan-time` | Tiempo hasta escanear QR | UX optimization |
| `CONNECTION_DURATION` | metric | `whatsapp/connection-duration` | Tiempo conectado (mins) | Estabilidad |
| `RECONNECTION_ATTEMPTS` | counter | `whatsapp/reconnection-attempts` | Intentos de reconexión | Problemas de red |
| `ERROR_RECOVERY_TIME` | histogram | `whatsapp/error-recovery-time` | Tiempo de recuperación | Resilencia |
| `BROWSER_CRASHES` | counter | `browser/crashes` | Crashes del navegador | Estabilidad |
| `MEMORY_LEAKS` | meter | `browser/memory-leaks` | Incrementos anormales | Performance |

### 🚀 **Métricas de Performance**

| Métrica Sugerida | Tipo | ID Sugerido | Descripción | Beneficio |
|------------------|------|-------------|-------------|-----------|
| `STARTUP_TIME` | histogram | `bot/startup-time` | Tiempo total de startup | Performance |
| `QR_GENERATION_TIME` | histogram | `whatsapp/qr-generation-time` | Tiempo generar QR | Performance |
| `AUTH_TIME` | histogram | `whatsapp/auth-time` | Tiempo autenticación | UX |
| `MESSAGE_QUEUE_SIZE` | metric | `whatsapp/message-queue-size` | Mensajes en cola | Load balancing |
| `CPU_SPIKES` | meter | `system/cpu-spikes` | Picos de CPU >80% | Resource management |

---

## 🔍 Eventos de Logging Analizados

### 📱 **Eventos WhatsApp (de whatsAppUtils.ts)**

| Evento | Component | Level | Descripción | Context Incluido |
|--------|-----------|-------|-------------|-----------------|
| State Update | `whatsapp` | `info` | Cambio de estado | `{ state, info }` |
| QR Path Init | `startup` | `info` | Inicialización path QR | `{ qrCodePath, botId }` |
| QR Processing | `whatsapp` | `info` | Procesando QR | `{ qrCodePath }` |
| QR Ready | `whatsapp` | `info` | QR listo para escanear | `{ qr_available, qr_file_path }` |
| QR Saved | `whatsapp` | `success` | QR guardado exitosamente | `{ qrCodePath }` |
| QR Error | `whatsapp` | `error` | Error en manejo de QR | `{ qrCodePath, error }` |
| Client Info | `whatsapp` | `success` | Info del cliente conectado | `{ phoneNumber }` |
| Client Error | `whatsapp` | `info` | Error obteniendo info | `{ error }` |
| Shutdown Error | `shutdown` | `error` | Error en shutdown | `{ error }` |

### 🔧 **Eventos de Sistema**

| Evento | Component | Level | Descripción | Context Potencial |
|--------|-----------|-------|-------------|------------------|
| Chrome Validation | `startup` | `info/error` | Validación de Chrome | `{ chromePath, platform }` |
| Directory Creation | `startup` | `info` | Creación de directorios | `{ path, created }` |
| Puppeteer Config | `whatsapp` | `info` | Configuración Puppeteer | `{ platform, headless, argsCount }` |
| Session Path | `startup` | `info` | Path de sesión | `{ sessionPath, botId }` |
| Environment | `startup` | `info` | Variables de entorno | `{ key, value, source }` |

---

## 🛠️ Implementación Actual vs Potencial

### ✅ **Implementado Actualmente**

- ✅ 7 métricas PM2.io básicas
- ✅ 19 estados de lifecycle definidos
- ✅ 19 lifecycle steps para PM2
- ✅ Logging estructurado con Pino
- ✅ Actualización automática de métricas de error
- ✅ Context enrichment en logs

### 🔄 **Oportunidades de Mejora**

- 🔄 Métricas de performance (startup time, auth time)
- 🔄 Métricas de estabilidad (connection duration, crashes)
- 🔄 Métricas de carga (queue size, message rate)
- 🔄 Alertas basadas en umbrales de métricas
- 🔄 Dashboard personalizado para métricas
- 🔄 Métricas de business (users active, success rate)

---

## 📊 Resumen Estadístico

### 📈 **Estados y Eventos**
- **Total Estados Lifecycle**: 19 estados
- **Estados de Error**: 7 estados específicos
- **Estados Operacionales**: 4 estados principales
- **Lifecycle Steps PM2**: 19 steps
- **Métricas Implementadas**: 7 métricas
- **Métricas Automáticas**: 4 métricas
- **Métricas Manuales**: 3 métricas

### 🎯 **Categorización**
- **Startup/Init**: 7 estados (37%)
- **Operational**: 3 estados (16%)
- **Error Handling**: 7 estados (37%)
- **Shutdown**: 2 estados (10%)

### 📊 **Tipos de Métricas**
- **Meters**: 4 métricas (57%)
- **Counters**: 1 métrica (14%)
- **Histograms**: 1 métrica (14%)
- **Metrics**: 1 métrica (14%)

---

**Fecha de análisis**: Agosto 15, 2025  
**Archivos analizados**: `whatsAppUtils.ts`, `types.ts`, `metrics.ts`, `pm2Utils_unified.ts`  
**Sistema**: LoggerService de Uriel con PM2.io integration  
**Estado**: Análisis completo de implementación actual y potencial
