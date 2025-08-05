# Message Utilities

Este directorio contiene utilidades reutilizables para el manejo de mensajes en todas las rutas del bot.

## Archivos Migrados desde `sendMessage/`

### `messageErrorHandler.ts`
**Clase:** `MessageErrorHandler`

Manejo genérico de errores para cualquier tipo de mensaje. Reemplaza la funcionalidad específica de `/send-message` con una versión reutilizable.

**Métodos:**
- `sendErrorReport(client, requestBody, errors, endpoint)` - Envía reporte de errores
- `handleCriticalError(client, error, requestBody, endpoint)` - Maneja errores críticos

**Uso:**
```typescript
import MessageErrorHandler from "../utils/messageErrorHandler";

// En caso de errores
await MessageErrorHandler.sendErrorReport(client, req.body, results.errors, "/send-audio");

// En caso de errores críticos  
const { errorType, errorDetails } = await MessageErrorHandler.handleCriticalError(
  client, error, req.body, "/send-audio"
);
```

### `recipientProcessor.ts`
**Clase:** `RecipientProcessor`

Procesamiento y normalización de destinatarios desde varias fuentes.

**Métodos:**
- `processRecipients(body)` - Procesamiento completo con Discord, phone, groups
- `processSimpleRecipients(recipients)` - Procesamiento básico de array de destinatarios

**Uso:**
```typescript
import RecipientProcessor from "../utils/recipientProcessor";

// Para rutas con lógica completa
const { groups, phoneNumbers } = await RecipientProcessor.processRecipients(req.body);

// Para rutas simples (media routes)
const { groups, phoneNumbers } = RecipientProcessor.processSimpleRecipients(req.body.to);
```

### `requestValidator.ts`
**Clase:** `RequestValidator`

Validación genérica de requests para endpoints de mensajes.

**Métodos:**
- `validateMessageRequest(req, res, requiresMessage)` - Valida mensaje/archivo
- `validateRecipients(req, res)` - Valida destinatarios
- `validateFileUpload(req, res, fileType, acceptedTypes)` - Valida archivos
- `buildResponse(messagesSent, errors)` - Construye respuesta estándar
- `getResponseStatus(errors, messagesSent)` - Determina código HTTP

**Uso:**
```typescript
import RequestValidator from "../utils/requestValidator";

// Validar archivo
const fileValidation = RequestValidator.validateFileUpload(req, res, "Audio", allowedTypes);
if (!fileValidation.isValid) return;

// Validar destinatarios
const recipientValidation = RequestValidator.validateRecipients(req, res);
if (!recipientValidation.isValid) return;

// Construir respuesta
const response = RequestValidator.buildResponse(messagesSent, errors);
const statusCode = RequestValidator.getResponseStatus(errors, messagesSent);
```

### `messageTypes.ts`
~~Tipos TypeScript reutilizables para operaciones de mensajes.~~ 

**⚠️ MOVIDO A `/types/types.ts`**

Los tipos de mensajes ahora están centralizados en el archivo principal de tipos del proyecto para evitar duplicación.

**Tipos disponibles en `/types/types.ts`:**
- `BaseMessageRequestBody` - Estructura base para requests
- `SendMessageRequestBody` - Para mensajes de texto
- `MediaMessageRequestBody` - Para mensajes con media
- `ErrorObject` - Estructura de errores
- `ProcessingResult` - Resultado de procesamiento
- `SendResponse` - Respuesta estándar
- `MediaSendResponse` - Respuesta para media con info de archivo

**Uso:**
```typescript
import { SendResponse, MediaMessageRequestBody } from "../types/types";
```

## Rutas Actualizadas

Las siguientes rutas han sido actualizadas para usar estas utilidades:

- ✅ `sendAudioRoute.ts`
- ✅ `sendImageRoute.ts` 
- ✅ `sendVideoRoute.ts`
- ✅ `sendDocumentRoute.ts`

## Compatibilidad hacia atrás

El archivo original `sendMessage/errorHandler.ts` se mantiene como wrapper para compatibilidad, pero está marcado como deprecated. Nuevas rutas deben usar `MessageErrorHandler` directamente.

## Beneficios de la Migración

1. **Reutilización de código** - Evita duplicación entre rutas
2. **Consistencia** - Mismo comportamiento en todas las rutas
3. **Mantenibilidad** - Cambios centralizados en utils
4. **Tipado fuerte** - Tipos compartidos para mejor desarrollo
5. **Escalabilidad** - Fácil agregar nuevas rutas de mensajes
