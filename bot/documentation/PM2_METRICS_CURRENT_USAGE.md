# 📊 PM2 Métricas - Uso Actual y Configuración

## 🎯 Resumen Ejecutivo

Este documento describe las métricas PM2 que estamos utilizando actualmente en el bot manager con el sistema LoggerService de Uriel, sus propósitos, tipos de métricas y opciones de configuración.

## 📈 Métricas Implementadas

### 🔗 **Conexiones WhatsApp**
```typescript
WHATSAPP_CONNECTIONS: {
  name: 'WhatsApp Connections',
  type: 'meter',
  id: 'whatsapp/connections'
}
```
- **Propósito**: Mide las conexiones exitosas a WhatsApp
- **Tipo**: `meter` - Mide la tasa de eventos por segundo
- **Cuándo se actualiza**: Al conectarse exitosamente a WhatsApp
- **Uso en código**: `this.updateMetric('WHATSAPP_CONNECTIONS')`

### 📱 **Códigos QR Generados**
```typescript
QR_CODES: {
  name: 'QR Codes Generated',
  type: 'counter',
  id: 'whatsapp/qrcodes'
}
```
- **Propósito**: Cuenta los códigos QR generados para autenticación
- **Tipo**: `counter` - Contador incremental
- **Cuándo se actualiza**: Cada vez que se genera un código QR
- **Uso en código**: `this.updateMetric('QR_CODES')`

### 💬 **Mensajes Procesados**
```typescript
MESSAGES: {
  name: 'Messages Processed',
  type: 'meter',
  id: 'whatsapp/messages'
}
```
- **Propósito**: Mide la tasa de mensajes procesados
- **Tipo**: `meter` - Mide la tasa de mensajes por segundo
- **Cuándo se actualiza**: Cada mensaje procesado exitosamente
- **Uso en código**: `this.updateMetric('MESSAGES')`

### 🚨 **Conteo de Errores**
```typescript
ERRORS: {
  name: 'Error Count',
  type: 'meter',
  id: 'whatsapp/errors'
}
```
- **Propósito**: Mide la tasa de errores en el sistema
- **Tipo**: `meter` - Mide la tasa de errores por segundo
- **Cuándo se actualiza**: Automáticamente en cada `logger.error()`
- **Uso en código**: Se actualiza automáticamente, no requiere llamada manual

### ⏱️ **Tiempo de Procesamiento de Mensajes**
```typescript
MESSAGE_PROCESSING_TIME: {
  name: 'Message Processing Time',
  type: 'histogram',
  id: 'whatsapp/message-processing-time',
  unit: 'ms'
}
```
- **Propósito**: Mide el tiempo que toma procesar cada mensaje
- **Tipo**: `histogram` (implementado como metric en PM2.io)
- **Unidad**: Milisegundos (ms)
- **Cuándo se actualiza**: Al inicio y fin del procesamiento de mensajes
- **Uso en código**: `this.updateMetric('MESSAGE_PROCESSING_TIME', tiempoEnMs)`

### 🧠 **Uso de Memoria del Browser**
```typescript
BROWSER_MEMORY: {
  name: 'Browser Memory Usage',
  type: 'metric',
  id: 'browser/memory',
  unit: 'MB'
}
```
- **Propósito**: Monitorea el uso de memoria del browser Puppeteer
- **Tipo**: `metric` - Valor actual/snapshot
- **Unidad**: Megabytes (MB)
- **Cuándo se actualiza**: Periódicamente durante el monitoreo del browser
- **Uso en código**: `this.updateMetric('BROWSER_MEMORY', memoriaMB)`

### 🔥 **Uso de CPU del Browser**
```typescript
BROWSER_CPU: {
  name: 'Browser CPU Usage',
  type: 'metric',
  id: 'browser/cpu',
  unit: '%'
}
```
- **Propósito**: Monitorea el uso de CPU del browser Puppeteer
- **Tipo**: `metric` - Valor actual/snapshot
- **Unidad**: Porcentaje (%)
- **Cuándo se actualiza**: Periódicamente durante el monitoreo del browser
- **Uso en código**: `this.updateMetric('BROWSER_CPU', porcentajeCPU)`

## 🔧 Tipos de Métricas PM2.io

### 📊 **Meter**
- **Descripción**: Mide la tasa de eventos por segundo
- **Uso**: Para eventos frecuentes como conexiones, mensajes, errores
- **Características**: Muestra tasa actual, promedio, y total
- **Métricas usando este tipo**: `WHATSAPP_CONNECTIONS`, `MESSAGES`, `ERRORS`

### 🔢 **Counter**
- **Descripción**: Contador incremental simple
- **Uso**: Para contar eventos únicos que no necesitan tasa
- **Características**: Solo incrementa, nunca decrementa
- **Métricas usando este tipo**: `QR_CODES`

### 📈 **Histogram**
- **Descripción**: Mide distribución de valores (implementado como metric)
- **Uso**: Para medir tiempos de respuesta, latencias
- **Características**: Muestra min, max, mean, percentiles
- **Métricas usando este tipo**: `MESSAGE_PROCESSING_TIME`

### 📌 **Metric**
- **Descripción**: Valor actual/snapshot de una medida
- **Uso**: Para valores que cambian como memoria, CPU, temperatura
- **Características**: Muestra valor actual y histórico
- **Métricas usando este tipo**: `BROWSER_MEMORY`, `BROWSER_CPU`

## 🛠️ Implementación en LoggerService

### Inicialización de Métricas
```typescript
private initializeMetrics(): void {
  Object.entries(METRICS).forEach(([key, metric]) => {
    switch (metric.type) {
      case 'meter':
        this.metrics.set(key, io.meter({
          name: metric.name,
          id: metric.id
        }));
        break;
      case 'counter':
        this.metrics.set(key, io.counter({
          name: metric.name,
          id: metric.id
        }));
        break;
      case 'histogram':
        // Implementado como metric para PM2.io
        this.metrics.set(key, io.metric({
          name: metric.name,
          id: metric.id,
          unit: metric.unit || 'ms'
        }));
        break;
      case 'metric':
        this.metrics.set(key, io.metric({
          name: metric.name,
          id: metric.id,
          unit: metric.unit
        }));
        break;
    }
  });
}
```

### Actualización de Métricas
```typescript
public updateMetric(metricKey: keyof typeof METRICS, value?: number): void {
  if (!this.ready) return;

  const metric = this.metrics.get(metricKey);
  if (!metric) return;

  const metricDef = METRICS[metricKey];
  switch (metricDef.type) {
    case 'meter':
      metric.mark(); // Incrementa el meter
      break;
    case 'counter':
      metric.inc(value || 1); // Incrementa counter por valor (default 1)
      break;
    case 'histogram':
    case 'metric':
      if (value !== undefined) {
        metric.set(value); // Establece valor actual
      }
      break;
  }
}
```

## 📊 Métricas Automáticas

### 🚨 **Errores Automáticos**
Cada vez que se llama `logger.error()`, automáticamente se actualiza la métrica `ERRORS`:
```typescript
public error(errorOrMessage: Error | string, context?: Record<string, unknown>): void {
  // ... logging logic ...
  this.updateMetric('ERRORS'); // Automático
}
```

### 🔄 **Lifecycle Steps**
Los pasos del ciclo de vida actualizan métricas automáticamente:
```typescript
public logLifecycleStep(step: keyof typeof WHATSAPP_LIFECYCLE_STEPS): void {
  switch (step) {
    case 'CONNECTED':
      this.updateMetric('WHATSAPP_CONNECTIONS');
      break;
    case 'QR_READY':
      this.updateMetric('QR_CODES');
      break;
    case 'READY':
      this.updateMetric('MESSAGES');
      break;
  }
}
```

## 🎯 Mejores Prácticas

### ✅ **Qué Hacer**
- ✅ Usar `meter` para eventos frecuentes y tasas
- ✅ Usar `counter` para conteos simples sin tasa
- ✅ Usar `metric` para valores instantáneos como memoria/CPU
- ✅ Incluir unidades apropiadas para métricas numéricas
- ✅ Usar IDs descriptivos con formato `categoria/nombre`

### ❌ **Qué Evitar**
- ❌ No actualizar métricas en bucles muy frecuentes sin throttling
- ❌ No crear métricas duplicadas con diferentes nombres
- ❌ No usar `counter` para valores que pueden decrementar
- ❌ No olvidar manejar casos donde las métricas no están inicializadas

## 📋 Resumen de Uso

| Métrica | Tipo | Automática | Manual | Propósito |
|---------|------|------------|--------|-----------|
| `WHATSAPP_CONNECTIONS` | meter | ✅ (lifecycle) | ❌ | Tasa de conexiones |
| `QR_CODES` | counter | ✅ (lifecycle) | ❌ | Conteo de QR generados |
| `MESSAGES` | meter | ✅ (lifecycle) | ❌ | Tasa de mensajes |
| `ERRORS` | meter | ✅ (error calls) | ❌ | Tasa de errores |
| `MESSAGE_PROCESSING_TIME` | histogram | ❌ | ✅ | Latencia de procesamiento |
| `BROWSER_MEMORY` | metric | ❌ | ✅ | Memoria actual del browser |
| `BROWSER_CPU` | metric | ❌ | ✅ | CPU actual del browser |

## 🔍 Monitoreo

Las métricas están disponibles en:
- **PM2.io Dashboard**: Para visualización web
- **PM2 monit**: Para monitoreo desde línea de comandos
- **Logs estructurados**: Con contexto de Pino logger

---

**Fecha de actualización**: Agosto 15, 2025  
**Versión del sistema**: LoggerService de Uriel con PM2.io integration  
**Estado**: Documento actualizado y alineado con implementación actual
