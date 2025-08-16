# 📡 Endpoint Unificado `/send-message`

## Resumen

El endpoint `/send-message` es la **solución unificada** para envío de mensajes de WhatsApp que maneja automáticamente texto, imágenes, videos, audio y documentos a números individuales, múltiples números, grupos, o combinaciones mixtas.

## 🚀 Características Principales

- **Detección Automática**: Identifica el tipo de contenido (texto/imagen/video/audio/documento)
- **Destinatarios Mixtos**: Soporta números de teléfono y grupos en la misma solicitud
- **Validación Inteligente**: Verifica formatos, tamaños y destinatarios automáticamente
- **Respuestas Detalladas**: Reporta éxitos y errores por destinatario individual
- **Compatibilidad Total**: Mantiene compatibilidad con endpoints legacy

---

## 📋 Especificaciones del Endpoint

### URL Base
```
POST http://localhost:7201/send-message
```

### Content-Types Soportados
- `application/json` - Para mensajes de texto
- `multipart/form-data` - Para mensajes con archivos multimedia

---

## 📝 Casos de Uso

### 1. Mensaje de Texto Simple

**Descripción**: Envío de mensaje de texto a uno o múltiples destinatarios.

**Request**:
```json
POST /send-message
Content-Type: application/json

{
  "to": "1234567890",
  "message": "Hola, este es un mensaje de texto simple"
}
```

**Response**:
```json
{
  "success": true,
  "messagesSent": ["1234567890"],
  "errors": [],
  "totalSent": 1,
  "totalErrors": 0,
  "requestId": "req_1692198765432",
  "timestamp": "2024-08-16T10:30:00.000Z"
}
```

### 2. Mensaje de Texto a Múltiples Destinatarios

**Descripción**: Envío de mensaje de texto a múltiples números y grupos.

**Request**:
```json
POST /send-message
Content-Type: application/json

{
  "to": [
    "1234567890",
    "0987654321", 
    "123456789-987654321@g.us"
  ],
  "message": "Mensaje para múltiples destinatarios"
}
```

**Response**:
```json
{
  "success": true,
  "messagesSent": [
    "1234567890",
    "0987654321",
    "123456789-987654321@g.us"
  ],
  "errors": [],
  "totalSent": 3,
  "totalErrors": 0,
  "requestId": "req_1692198765433",
  "timestamp": "2024-08-16T10:35:00.000Z"
}
```

### 3. Imagen con Caption

**Descripción**: Envío de imagen con texto descriptivo (caption).

**Request**:
```bash
POST /send-message
Content-Type: multipart/form-data

Form Data:
- to: ["1234567890", "123456789-987654321@g.us"]
- caption: "¡Mira esta increíble imagen!"
- file: imagen.jpg
```

**Response**:
```json
{
  "success": true,
  "messagesSent": [
    "1234567890",
    "123456789-987654321@g.us"
  ],
  "errors": [],
  "totalSent": 2,
  "totalErrors": 0,
  "mediaType": "image",
  "fileName": "imagen.jpg",
  "fileSize": 2048576,
  "requestId": "req_1692198765434",
  "timestamp": "2024-08-16T10:40:00.000Z"
}
```

### 4. Documento con Mensaje

**Descripción**: Envío de documento con mensaje explicativo.

**Request**:
```bash
POST /send-message
Content-Type: multipart/form-data

Form Data:
- to: "1234567890"
- message: "Te envío el documento que solicitaste"
- file: documento.pdf
```

**Response**:
```json
{
  "success": true,
  "messagesSent": ["1234567890"],
  "errors": [],
  "totalSent": 1,
  "totalErrors": 0,
  "mediaType": "document",
  "fileName": "documento.pdf",
  "fileSize": 5242880,
  "requestId": "req_1692198765435",
  "timestamp": "2024-08-16T10:45:00.000Z"
}
```

### 5. Audio sin Texto

**Descripción**: Envío de archivo de audio sin mensaje adicional.

**Request**:
```bash
POST /send-message
Content-Type: multipart/form-data

Form Data:
- to: ["1234567890", "0987654321"]
- file: audio.mp3
```

**Response**:
```json
{
  "success": true,
  "messagesSent": [
    "1234567890",
    "0987654321"
  ],
  "errors": [],
  "totalSent": 2,
  "totalErrors": 0,
  "mediaType": "audio",
  "fileName": "audio.mp3",
  "fileSize": 3145728,
  "requestId": "req_1692198765436",
  "timestamp": "2024-08-16T10:50:00.000Z"
}
```

### 6. Video a Grupo

**Descripción**: Envío de video a un grupo específico.

**Request**:
```bash
POST /send-message
Content-Type: multipart/form-data

Form Data:
- to: "123456789-987654321@g.us"
- caption: "Video del evento de ayer"
- file: evento.mp4
```

**Response**:
```json
{
  "success": true,
  "messagesSent": ["123456789-987654321@g.us"],
  "errors": [],
  "totalSent": 1,
  "totalErrors": 0,
  "mediaType": "video",
  "fileName": "evento.mp4",
  "fileSize": 15728640,
  "requestId": "req_1692198765437",
  "timestamp": "2024-08-16T10:55:00.000Z"
}
```

---

## 🔍 Detección Automática de Tipos

El endpoint analiza automáticamente el contenido y determina el tipo de mensaje:

| Tipo | Detección | Campo de Texto | Límite de Tamaño |
|------|-----------|----------------|------------------|
| **Texto** | Sin archivo | `message` | N/A |
| **Imagen** | MIME: `image/*` | `caption` | 16MB |
| **Video** | MIME: `video/*` o extensiones `.mp4`, `.avi`, `.mov`, `.3gp` | `caption` | 64MB |
| **Audio** | MIME: `audio/*` o extensiones `.mp3`, `.wav`, `.ogg`, `.amr` | `message` | 16MB |
| **Documento** | Cualquier otro tipo | `message` | 100MB |

---

## 📋 Parámetros del Request

### Campos Requeridos

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `to` | `string \| string[]` | Destinatario(s) - números de teléfono o IDs de grupo |

### Campos Opcionales

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `message` | `string` | Mensaje de texto (requerido si no hay archivo) |
| `caption` | `string` | Caption para imágenes y videos |
| `file` | `File` | Archivo multimedia (imagen, video, audio, documento) |

### Formatos de Destinatarios

```javascript
// Número individual
"to": "1234567890"

// Múltiples números
"to": ["1234567890", "0987654321"]

// Grupo individual
"to": "123456789-987654321@g.us"

// Números y grupos mixtos
"to": [
  "1234567890",
  "123456789-987654321@g.us", 
  "0987654321"
]
```

---

## 📝 Formatos de Archivo Soportados

### Imágenes
- **Formatos**: JPG, JPEG, PNG, GIF, WEBP
- **MIME Types**: `image/jpeg`, `image/png`, `image/gif`, `image/webp`
- **Tamaño máximo**: 16MB

### Videos
- **Formatos**: MP4, AVI, MOV, 3GP, WMV
- **MIME Types**: `video/mp4`, `video/3gpp`, `video/quicktime`, `video/x-ms-wmv`
- **Tamaño máximo**: 64MB

### Audio
- **Formatos**: MP3, WAV, OGG, AAC, AMR, FLAC, M4A, OPUS
- **MIME Types**: `audio/mpeg`, `audio/wav`, `audio/ogg`, `audio/aac`, `audio/amr`
- **Tamaño máximo**: 16MB

### Documentos
- **Formatos**: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, y más
- **MIME Types**: Cualquier tipo no cubierto por los anteriores
- **Tamaño máximo**: 100MB

---

## 🚨 Respuestas de Error

### Error de Validación

```json
{
  "success": false,
  "error": "VALIDATION_ERROR: message is required when no file is provided",
  "requestId": "req_1692198765438",
  "timestamp": "2024-08-16T11:00:00.000Z"
}
```

### Error de Archivo No Soportado

```json
{
  "success": false,
  "error": "MEDIA_NOT_SUPPORTED: MIME type application/x-executable not supported for document messages in WhatsApp",
  "requestId": "req_1692198765439",
  "timestamp": "2024-08-16T11:05:00.000Z"
}
```

### Error de Tamaño de Archivo

```json
{
  "success": false,
  "error": "FILE_TOO_LARGE: File size 67108864 bytes exceeds limit of 16777216 bytes for image",
  "requestId": "req_1692198765440",
  "timestamp": "2024-08-16T11:10:00.000Z"
}
```

### Error Parcial (Algunos Envíos Fallaron)

```json
{
  "success": false,
  "messagesSent": ["1234567890"],
  "errors": [
    {
      "recipient": "0987654321",
      "error": "Number 0987654321 is not registered on WhatsApp",
      "errorType": "TEXT_SEND_ERROR",
      "timestamp": "2024-08-16T11:15:00.000Z"
    }
  ],
  "totalSent": 1,
  "totalErrors": 1,
  "requestId": "req_1692198765441",
  "timestamp": "2024-08-16T11:15:00.000Z"
}
```

---

## 🔧 Códigos de Respuesta HTTP

| Código | Descripción |
|--------|-------------|
| `200` | Todos los mensajes enviados exitosamente |
| `207` | Envío parcial - algunos exitosos, otros fallaron |
| `400` | Error de validación en la solicitud |
| `503` | Cliente de WhatsApp no disponible |
| `500` | Error interno del servidor |

---

## 💡 Ejemplos de Integración

### JavaScript/Node.js

```javascript
// Mensaje de texto
const textResponse = await fetch('http://localhost:7201/send-message', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: ['1234567890', '123456789-987654321@g.us'],
    message: 'Hola desde JavaScript!'
  })
});

// Imagen con FormData
const formData = new FormData();
formData.append('to', JSON.stringify(['1234567890']));
formData.append('caption', '¡Nueva imagen!');
formData.append('file', imageFile);

const imageResponse = await fetch('http://localhost:7201/send-message', {
  method: 'POST',
  body: formData
});
```

### Python

```python
import requests

# Mensaje de texto
text_payload = {
    "to": ["1234567890", "123456789-987654321@g.us"],
    "message": "Hola desde Python!"
}

text_response = requests.post(
    'http://localhost:7201/send-message',
    json=text_payload
)

# Documento con archivo
files = {'file': open('documento.pdf', 'rb')}
data = {
    'to': '1234567890',
    'message': 'Documento adjunto'
}

doc_response = requests.post(
    'http://localhost:7201/send-message',
    files=files,
    data=data
)
```

### cURL

```bash
# Mensaje de texto
curl -X POST http://localhost:7201/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "to": ["1234567890"],
    "message": "Hola desde cURL!"
  }'

# Imagen con caption
curl -X POST http://localhost:7201/send-message \
  -F "to=[\"1234567890\", \"123456789-987654321@g.us\"]" \
  -F "caption=¡Imagen desde cURL!" \
  -F "file=@imagen.jpg"
```

---

## 🔄 Migración desde Endpoints Legacy

### Desde `/send-broadcast`
El endpoint `/send-broadcast` es ahora un alias de `/send-message`. Simplemente cambiar la URL:

```diff
- POST /send-broadcast
+ POST /send-message
```

### Desde endpoints específicos
Los endpoints específicos siguen funcionando, pero puedes migrar al unificado:

```diff
# Antes
- POST /send-image
- POST /send-document  
- POST /send-audio
- POST /send-video

# Ahora (todo en uno)
+ POST /send-message
```

---

## 📈 Beneficios del Endpoint Unificado

1. **Simplicidad**: Un solo endpoint para todas las necesidades
2. **Inteligencia**: Detección automática del tipo de contenido
3. **Flexibilidad**: Texto solo, media solo, o combinaciones
4. **Robustez**: Validaciones comprehensivas y manejo de errores
5. **Escalabilidad**: Fácil agregar nuevos tipos de media
6. **Mantenibilidad**: Código consolidado y menos duplicación

---

## 🆘 Soporte y Troubleshooting

### Problemas Comunes

1. **"WhatsApp client not ready"**: Verificar estado con `GET /status`
2. **"Number not registered on WhatsApp"**: El número no existe en WhatsApp
3. **"File too large"**: Verificar límites de tamaño por tipo de archivo
4. **"Media not supported"**: Verificar formato de archivo soportado

### Logs y Debugging

Todos los requests incluyen un `requestId` único que se puede usar para rastrear en los logs del sistema.

### Contacto

Para soporte técnico, revisar los logs de PM2 o contactar al equipo de desarrollo.

---

*Documentación actualizada: 16 de Agosto, 2025*
