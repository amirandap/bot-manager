# Configuración de Logging de Métricas

## Problema Resuelto

Los logs automáticos del envío de métricas estaban generando mucho ruido en la consola, dificultando la lectura de errores importantes.

## Solución Implementada

### 1. Nueva Configuración `SILENT_METRICS`

Se añadió una nueva variable de entorno `SILENT_METRICS` que permite controlar si se muestran los logs automáticos de métricas:

- **`SILENT_METRICS=true`** (por defecto): Silencia los logs automáticos de métricas
- **`SILENT_METRICS=false`**: Muestra todos los logs de métricas (útil para debugging)

### 2. Configuración en Archivos

#### .env.example
```bash
# Silenciar logs automáticos de métricas (true/false)
SILENT_METRICS=true
```

#### LoggerService
- Se actualizó `LoggerConfig` para incluir `silentMetrics?: boolean`
- El método `updateMetric()` ahora respeta esta configuración
- Solo se logean métricas de errores cuando `SILENT_METRICS=false`

### 3. Métodos Añadidos

#### LoggerService
```typescript
// Configurar silenciado de métricas dinámicamente
logger.setSilentMetrics(true/false)

// Verificar estado actual
logger.isSilentMetrics()
```

## Uso

### Para Desarrollo (debugging completo)
```bash
SILENT_METRICS=false
```

### Para Producción (logs limpios)
```bash
SILENT_METRICS=true
```

## Comportamiento

### Con `SILENT_METRICS=true` (Recomendado)
- ✅ Los errores se muestran normalmente
- ✅ Los logs informativos se muestran normalmente
- ❌ Los logs automáticos de métricas están silenciados
- ✅ Las métricas se siguen enviando a PM2

### Con `SILENT_METRICS=false` (Solo debugging)
- ✅ Todos los logs se muestran
- ⚠️ Puede generar mucho ruido en la consola

## Beneficios

1. **Logs más limpios**: Solo se muestran errores y eventos importantes
2. **Mejor debugging**: Los errores son más fáciles de identificar
3. **Flexibilidad**: Se puede cambiar dinámicamente según el entorno
4. **Compatibilidad**: Las métricas siguen funcionando normalmente en PM2
