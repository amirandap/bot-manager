# WhatsApp Bot - Guía de Arquitectura

## 📋 Principios Arquitectónicos ESTABLECIDOS

### ✅ REGLAS FUNDAMENTALES - NO MODIFICAR
Esta arquitectura ha sido completamente migrada y establecida. **NO crear nuevos archivos que violen estas reglas.**

### 🏗️ Estructura de Carpetas

```
src/
├── config/          # Configuraciones y exportadores
├── types/           # Definiciones de tipos TypeScript
├── utils/           # ⚠️ SOLO FUNCIONES PURAS - NO CLASES
├── services/        # ✅ TODAS LAS CLASES Y LÓGICA DE NEGOCIO
├── controllers/     # Controladores de lógica de aplicación
├── routes/          # Rutas y endpoints de Express
├── middleware/      # Middlewares de Express
└── validators/      # Validadores de entrada
```

### 🚫 QUE NO HACER - ERRORES COMUNES

1. **NO crear clases en `utils/`** - Solo funciones puras
2. **NO crear instancias singleton en `utils/`** - Usar `services/`
3. **NO duplicar funcionalidad existente** - Revisar primero
4. **NO usar `console.log`** - Usar `botLogger` siempre
5. **NO usar `qrUtils.ts`** - Usar `whatsAppUtils.ts` para QR

### ✅ QUE HACER - PATRONES ESTABLECIDOS

1. **Clases → `services/`** - Toda lógica con estado
2. **Funciones puras → `utils/`** - Sin efectos secundarios
3. **Logging → `botLogger`** - Sistema unificado
4. **Error handling → `MessageErrorHandlerService`** - Sistema centralizado
5. **Validaciones consolidadas** - Evitar duplicaciones en startup
6. **Cache de configuraciones** - Reutilizar validaciones exitosas

## 🎯 Servicios Disponibles - REUTILIZAR

### LoggerService
```typescript
// ✅ USO CORRECTO
import { botLogger } from "../utils/loggerWrapper";
botLogger.info("Mensaje", "🔥");
botLogger.error("Error message");
botLogger.success("Operación exitosa");
```

### Error Handling Services
```typescript
// ✅ USO CORRECTO
import { MessageErrorHandlerService } from "../services";
const messageErrorHandler = new MessageErrorHandlerService();

// Para errores de mensaje individual
const result = await messageErrorHandler.handleMessageError(error, endpoint, recipient, messageType);

// Para errores en lote
const transformedErrors = errors.map(error => ({
  error: new Error(error.error),
  context: "/endpoint",
  recipient: error.recipient
}));
await messageErrorHandler.handleBatchErrors(transformedErrors);
```

### Media Messaging Service
```typescript
// ✅ SERVICIOS DISPONIBLES
import { 
  sendImageMessage,
  sendVideoMessage, 
  sendAudioMessage,
  sendDocumentMessage 
} from "../services/MediaMessagingService";
```

## 🔄 Flujo de Migración COMPLETADO

### ✅ MIGRACIONES COMPLETADAS - NO REPETIR

1. **Error Handler Migration** ✅ DONE
   - `utils/errorHandler.ts` → `services/WhatsAppErrorHandlerService.ts`
   - `utils/errorHandlerUtils.ts` - funciones puras solamente

2. **Logger Migration** ✅ DONE  
   - `utils/loggerWrapper.ts` → acceso a `services/LoggerService.ts`
   - Todas las rutas usan `botLogger`

3. **Route Updates** ✅ DONE
   - Todas las rutas usan `MessageErrorHandlerService`
   - Todos los imports corregidos

4. **Startup Optimization** ✅ DONE - 2025-08-13
   - Eliminadas validaciones duplicadas de Chrome
   - Consolidado flujo de startup en `initializeStartup()`
   - Cache de configuración de Chrome en `PuppeteerConfig`
   - Mensajes de logging optimizados y clarificados

5. **QR Code Consolidation** ✅ DONE - 2025-08-13
   - Consolidada toda funcionalidad QR en `whatsAppUtils.ts`
   - `qrUtils.ts` marcado como DEPRECATED con re-exports
   - Eliminada duplicación de funciones QR
   - QR management ahora completamente interno a WhatsApp client

## 📝 Checklist para Nuevas Funciones

Antes de crear CUALQUIER archivo nuevo:

- [ ] ¿Es una clase? → Debe ir en `services/`
- [ ] ¿Es una función pura? → Puede ir en `utils/`
- [ ] ¿Ya existe funcionalidad similar? → REUTILIZAR
- [ ] ¿Necesita logging? → Usar `botLogger`
- [ ] ¿Maneja errores? → Usar `MessageErrorHandlerService`

## 🚨 Estados de Archivos

### DEPRECATED - NO USAR
- `deprecated/errorHandler*.ts` - Versiones antiguas
- Cualquier archivo en `deprecated/`
- `utils/qrUtils.ts` - ⚠️ DEPRECATED: Use `whatsAppUtils.ts` para QR

### ACTIVE - USAR ESTOS
- `services/LoggerService.ts` - Logging con estado
- `services/WhatsAppErrorHandlerService.ts` - Error handling
- `services/MediaMessagingService.ts` - Envío de media
- `utils/loggerWrapper.ts` - Acceso al logger
- `utils/errorHandlerUtils.ts` - Funciones puras de validación
- `utils/whatsAppUtils.ts` - ✅ WhatsApp client + QR management consolidado

## 🎯 Próximos Pasos Permitidos

1. **Optimización de funciones existentes** - Mejorar sin cambiar API
2. **Documentación de API** - Documentar endpoints
3. **Testing** - Agregar tests unitarios
4. **Performance** - Optimizar código existente

## ⛔ PROHIBIDO

1. Crear nuevos archivos de error handling
2. Crear nuevos loggers
3. Mover clases a `utils/`
4. Duplicar funcionalidad existente
5. Romper la estructura establecida
