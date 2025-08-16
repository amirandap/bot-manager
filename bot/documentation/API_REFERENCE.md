# WhatsApp Bot API - Documentación Completa

## 🚀 Base URL
```
http://localhost:7201
```

## 🌟 ENDPOINT PRINCIPAL - `/send-message` (UNIFICADO)

### ⚡ Nuevo Endpoint Unificado
```http
POST /send-message
```

**Descripción**: Endpoint principal que maneja automáticamente texto, imágenes, videos, audio y documentos a destinatarios mixtos (números + grupos).

**Detección Automática**: 
- Sin archivo → mensaje de texto
- Con archivo → detecta tipo automáticamente (imagen/video/audio/documento)

**📖 Documentación Completa**: Ver `UNIFIED_SEND_MESSAGE_ENDPOINT.md`
**🔧 Referencia Rápida**: Ver `QUICK_REFERENCE_SEND_MESSAGE.md`

---

## 📱 Ejemplos de Uso del Endpoint Unificado

### 1. Mensaje de Texto (JSON)
```http
POST /send-message
Content-Type: application/json

{
  "to": ["1234567890", "123456789-987654321@g.us"],
  "message": "Hola desde el bot!"
}
```

### 2. Imagen con Caption (Multipart)
```http
POST /send-message
Content-Type: multipart/form-data

Form Data:
- to: ["1234567890"]
- caption: "¡Increíble imagen!"
- file: imagen.jpg
```

### 3. Documento con Mensaje (Multipart)
```http
POST /send-message
Content-Type: multipart/form-data

Form Data:
- to: "1234567890"
- message: "Documento adjunto"
- file: documento.pdf
```

**Response Success (200):**
```json
{
  "success": true,
  "messagesSent": ["1234567890"],
  "errors": [],
  "requestId": 1692123456789,
  "timestamp": "2025-08-13T16:30:00.000Z"
}
```

### 2. Enviar a Grupo
```http
POST /send-to-group
```

**Headers:**
```
Content-Type: application/json
```

**Body:**
```json
{
  "groupId": "123456789-987654321@g.us",
  "message": "Mensaje para el grupo"
}
```

### 3. Enviar Broadcast (Múltiples Destinatarios)
```http
POST /send-broadcast
```

**Body:**
```json
{
  "to": [
    "1234567890",
    "0987654321", 
    "123456789-987654321@g.us"
  ],
  "message": "Mensaje broadcast"
}
```

### 4. Enviar Imagen
```http
POST /send-image
```

**Headers:**
```
Content-Type: multipart/form-data
```

**Form Data:**
- `to`: string[] (destinatarios)
- `file`: archivo imagen (jpg, png, gif)
- `caption`: string (opcional)

**Ejemplo cURL:**
```bash
curl -X POST http://localhost:3000/send-image \
  -F "to=1234567890" \
  -F "file=@imagen.jpg" \
  -F "caption=Mira esta imagen!"
```

### 5. Enviar Video
```http
POST /send-video
```

**Form Data:**
- `to`: string[] (destinatarios)
- `file`: archivo video (mp4, avi, mov)
- `caption`: string (opcional)

### 6. Enviar Audio
```http
POST /send-audio
```

**Form Data:**
- `to`: string[] (destinatarios)  
- `file`: archivo audio (mp3, wav, ogg)

### 7. Enviar Documento
```http
POST /send-document
```

**Form Data:**
- `to`: string[] (destinatarios)
- `file`: cualquier archivo
- `message`: string (opcional)

### 8. Enviar a Teléfono Individual
```http
POST /send-to-phone
```

**Body:**
```json
{
  "phoneNumber": "1234567890",
  "message": "Mensaje directo"
}
```

### 9. Obtener Grupos
```http
GET /get-groups
```

**Response:**
```json
{
  "success": true,
  "groups": [
    {
      "id": "123456789-987654321@g.us",
      "name": "Mi Grupo",
      "participants": 15
    }
  ]
}
```

## 📋 Formato de Destinatarios

### Números de Teléfono
- **Formato:** `"1234567890"` (sin símbolos)
- **Con código país:** `"521234567890"`
- **El sistema automáticamente formatea**

### Grupos
- **Formato:** `"123456789-987654321@g.us"`
- **Obtener IDs:** Usar `/get-groups`

## ⚠️ Códigos de Respuesta

### Exitosas
- **200**: Todos los mensajes enviados
- **207**: Algunos mensajes enviados, algunos fallaron

### Errores del Cliente  
- **400**: Datos de entrada inválidos
- **503**: Cliente WhatsApp no disponible

### Errores del Servidor
- **500**: Error interno del servidor

## 📊 Estructura de Respuesta Estándar

```json
{
  "success": boolean,
  "messagesSent": string[],
  "errors": [
    {
      "recipient": "1234567890",
      "error": "Descripción del error",
      "errorType": "WHATSAPP_ERROR",
      "timestamp": "2025-08-13T16:30:00.000Z"
    }
  ],
  "requestId": number,
  "timestamp": "2025-08-13T16:30:00.000Z"
}
```

## 🔧 Límites y Consideraciones

### Archivos
- **Imagen**: Máximo 16MB
- **Video**: Máximo 64MB  
- **Audio**: Máximo 16MB
- **Documento**: Máximo 100MB

### Formatos Soportados
- **Imagen**: JPG, PNG, GIF, WEBP
- **Video**: MP4, AVI, MOV, 3GP
- **Audio**: MP3, WAV, OGG, AMR
- **Documento**: Cualquier formato

### Rate Limiting
- El bot respeta los límites de WhatsApp
- Reintentos automáticos en caso de errores temporales

## 🛠️ Testing con cURL

### Mensaje Simple
```bash
curl -X POST http://localhost:3000/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "to": "1234567890",
    "message": "Test desde cURL"
  }'
```

### Imagen con Caption
```bash
curl -X POST http://localhost:3000/send-image \
  -F "to=1234567890" \
  -F "file=@test.jpg" \
  -F "caption=Imagen de prueba"
```

### Broadcast
```bash
curl -X POST http://localhost:3000/send-broadcast \
  -H "Content-Type: application/json" \
  -d '{
    "to": ["1234567890", "0987654321"],
    "message": "Mensaje masivo"
  }'
```

## 🔍 Debugging

### Logs
Los logs se pueden encontrar en la consola del servidor con emojis identificadores:
- 📥 Solicitud recibida
- ✅ Mensaje enviado exitosamente  
- ❌ Error en envío
- 📱 Procesando teléfono
- 🏢 Procesando grupo

### Estados del Cliente
- Cliente WhatsApp debe estar conectado
- QR code aparece en primera ejecución
- Verificar estado en logs del servidor
