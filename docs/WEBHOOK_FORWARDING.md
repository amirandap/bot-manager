# Reenvío Automático de Mensajes a Webhooks

Esta funcionalidad permite monitorear grupos específicos de WhatsApp y reenviar automáticamente los mensajes (incluyendo adjuntos) a webhooks externos.

## 📋 Tabla de Contenidos

- [Descripción](#descripción)
- [Configuración Rápida](#configuración-rápida)
- [API Reference](#api-reference)
- [Payload del Webhook](#payload-del-webhook)
- [Ejemplos de Uso](#ejemplos-de-uso)
- [Casos de Uso](#casos-de-uso)

## Descripción

El sistema de reenvío a webhooks permite:

- ✅ Monitorear múltiples grupos de WhatsApp simultáneamente
- ✅ Reenviar mensajes de texto automáticamente
- ✅ Incluir archivos adjuntos (imágenes, videos, documentos, audio)
- ✅ Configurar múltiples webhooks por grupo (redundancia)
- ✅ Habilitar/deshabilitar monitoreo sin perder configuración
- ✅ Incluir metadata del bot y del mensaje
- ✅ Sistema de reintentos automático
- ✅ Gestión completa vía API REST

## Configuración Rápida

### 1. Obtener el ID del grupo

Primero necesitas el ID del grupo de WhatsApp que quieres monitorear:

```bash
# Listar todos los grupos (cambia el puerto según tu configuración)
curl -s http://localhost:7261/get-groups/ | jq '.groups[] | select(.isGroup == true) | {id: .id._serialized, name: .name}'
```

Resultado ejemplo:
```json
{
  "id": "123456789-111222333@g.us",
  "name": "Equipo de Marketing"
}
```

### 2. Agregar el grupo al monitoreo

```bash
curl -X POST http://localhost:7261/api/monitored-groups/add \
  -H "Content-Type: application/json" \
  -d '{
    "groupId": "123456789-111222333@g.us",
    "webhookUrl": "https://tu-servidor.com/webhook/messages",
    "groupName": "Equipo de Marketing",
    "includeAttachments": true,
    "includeMetadata": true
  }'
```

### 3. Probar el webhook

```bash
curl -X POST http://localhost:7261/api/monitored-groups/test \
  -H "Content-Type: application/json" \
  -d '{"webhookUrl": "https://tu-servidor.com/webhook/messages"}'
```

¡Listo! Los mensajes del grupo ahora se reenviarán automáticamente a tu webhook.

## API Reference

Todos los endpoints están documentados en Swagger: `/api-docs`

### Endpoints Disponibles

| Método | Endpoint | Descripción |
|--------|----------|-------------|
| `GET` | `/api/monitored-groups/` | Listar grupos monitoreados |
| `POST` | `/api/monitored-groups/add` | Agregar webhook a un grupo |
| `DELETE` | `/api/monitored-groups/remove` | Eliminar webhook o grupo |
| `POST` | `/api/monitored-groups/toggle` | Activar/desactivar monitoreo |
| `POST` | `/api/monitored-groups/update` | Actualizar configuración |
| `POST` | `/api/monitored-groups/test` | Probar conectividad del webhook |

### Listar Grupos Monitoreados

```bash
GET /api/monitored-groups/
```

**Respuesta:**
```json
{
  "success": true,
  "groups": [
    {
      "groupId": "123456789-111222333@g.us",
      "groupName": "Equipo de Marketing",
      "webhooks": ["https://tu-servidor.com/webhook"],
      "enabled": true,
      "includeAttachments": true,
      "includeMetadata": true
    }
  ],
  "timestamp": "2025-11-08T12:00:00.000Z"
}
```

### Agregar Webhook

```bash
POST /api/monitored-groups/add
Content-Type: application/json

{
  "groupId": "123456789-111222333@g.us",
  "webhookUrl": "https://tu-servidor.com/webhook",
  "groupName": "Equipo de Marketing",       // Opcional
  "includeAttachments": true,                // Opcional (default: true)
  "includeMetadata": true                    // Opcional (default: true)
}
```

### Eliminar Webhook o Grupo

```bash
# Eliminar webhook específico
DELETE /api/monitored-groups/remove
Content-Type: application/json

{
  "groupId": "123456789-111222333@g.us",
  "webhookUrl": "https://tu-servidor.com/webhook"
}

# Eliminar grupo completo (omitir webhookUrl)
DELETE /api/monitored-groups/remove
Content-Type: application/json

{
  "groupId": "123456789-111222333@g.us"
}
```

### Activar/Desactivar Monitoreo

```bash
POST /api/monitored-groups/toggle
Content-Type: application/json

{
  "groupId": "123456789-111222333@g.us",
  "enabled": false  // true para activar, false para desactivar
}
```

### Actualizar Configuración

```bash
POST /api/monitored-groups/update
Content-Type: application/json

{
  "groupId": "123456789-111222333@g.us",
  "updates": {
    "groupName": "Nuevo Nombre",
    "webhooks": ["https://webhook1.com", "https://webhook2.com"],
    "includeAttachments": false,
    "includeMetadata": true,
    "enabled": true
  }
}
```

### Probar Webhook

```bash
POST /api/monitored-groups/test
Content-Type: application/json

{
  "webhookUrl": "https://tu-servidor.com/webhook"
}
```

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Webhook responded with status 200",
  "timestamp": "2025-11-08T12:00:00.000Z"
}
```

**Respuesta con error:**
```json
{
  "success": false,
  "message": "connect ECONNREFUSED 127.0.0.1:3000",
  "timestamp": "2025-11-08T12:00:00.000Z"
}
```

## Payload del Webhook

Cuando se recibe un mensaje en un grupo monitoreado, se envía un POST al webhook con el siguiente payload:

### Estructura Completa

```json
{
  "messageId": "3EB0E8D6A5C5E5E5E5E5",
  "groupId": "123456789-111222333@g.us",
  "groupName": "Equipo de Marketing",
  "senderId": "521234567890@c.us",
  "senderName": "Juan Pérez",
  "timestamp": 1699468800,
  "message": "Hola, este es un mensaje del grupo",
  "messageType": "text",
  "hasMedia": false,
  "isForwarded": false,
  "isReply": false,
  "quotedMessage": {
    "senderId": "529876543210@c.us",
    "message": "Mensaje original al que se responde"
  },
  "attachment": {
    "filename": "imagen.jpg",
    "mimetype": "image/jpeg",
    "data": "iVBORw0KGgoAAAANSUhEUgAA...",  // Base64
    "size": 245678
  },
  "metadata": {
    "botId": "BOT_001",
    "botName": "WhatsApp Bot Manager",
    "forwardedAt": "2025-11-08T12:00:00.000Z"
  }
}
```

### Tipos de Mensaje

El campo `messageType` puede ser:
- `text` - Mensaje de texto simple
- `image` - Imagen (JPG, PNG, GIF, WEBP)
- `document` - Documento (PDF, DOC, XLS, etc.)
- `audio` - Audio o mensaje de voz
- `video` - Video
- `sticker` - Sticker
- `other` - Otros tipos de mensaje

### Ejemplo: Mensaje de Texto Simple

```json
{
  "messageId": "3EB0E8D6A5C5E5E5E5E5",
  "groupId": "123456789-111222333@g.us",
  "groupName": "Equipo de Marketing",
  "senderId": "521234567890@c.us",
  "senderName": "Juan Pérez",
  "timestamp": 1699468800,
  "message": "Hola equipo!",
  "messageType": "text",
  "hasMedia": false,
  "isForwarded": false,
  "isReply": false,
  "metadata": {
    "botId": "BOT_001",
    "botName": "WhatsApp Bot Manager",
    "forwardedAt": "2025-11-08T12:00:00.000Z"
  }
}
```

### Ejemplo: Mensaje con Imagen

```json
{
  "messageId": "3EB0E8D6A5C5E5E5E5E5",
  "groupId": "123456789-111222333@g.us",
  "groupName": "Equipo de Marketing",
  "senderId": "521234567890@c.us",
  "senderName": "Juan Pérez",
  "timestamp": 1699468800,
  "message": "Miren esta foto!",
  "messageType": "image",
  "hasMedia": true,
  "isForwarded": false,
  "isReply": false,
  "attachment": {
    "filename": "foto.jpg",
    "mimetype": "image/jpeg",
    "data": "/9j/4AAQSkZJRgABAQEAYABgAAD...",
    "size": 156789
  },
  "metadata": {
    "botId": "BOT_001",
    "botName": "WhatsApp Bot Manager",
    "forwardedAt": "2025-11-08T12:00:00.000Z"
  }
}
```

## Ejemplos de Uso

### Ejemplo 1: Servidor Webhook Simple (Node.js/Express)

```javascript
const express = require('express');
const app = express();

app.use(express.json({ limit: '100mb' }));

app.post('/webhook/messages', async (req, res) => {
  const payload = req.body;
  
  console.log(`📩 Mensaje recibido de ${payload.groupName}`);
  console.log(`👤 Enviado por: ${payload.senderName}`);
  console.log(`💬 Mensaje: ${payload.message}`);
  
  // Si tiene adjunto, guardarlo
  if (payload.attachment) {
    const buffer = Buffer.from(payload.attachment.data, 'base64');
    const fs = require('fs');
    fs.writeFileSync(`./uploads/${payload.attachment.filename}`, buffer);
    console.log(`📎 Adjunto guardado: ${payload.attachment.filename}`);
  }
  
  // Responder 200 OK
  res.json({ success: true, received: true });
});

app.listen(3000, () => {
  console.log('🚀 Webhook server running on port 3000');
});
```

### Ejemplo 2: Guardar en Base de Datos

```javascript
app.post('/webhook/messages', async (req, res) => {
  const payload = req.body;
  
  try {
    // Guardar mensaje en la base de datos
    await db.messages.create({
      messageId: payload.messageId,
      groupId: payload.groupId,
      groupName: payload.groupName,
      senderId: payload.senderId,
      senderName: payload.senderName,
      message: payload.message,
      messageType: payload.messageType,
      timestamp: new Date(payload.timestamp * 1000),
      hasMedia: payload.hasMedia,
      attachment: payload.attachment ? {
        filename: payload.attachment.filename,
        mimetype: payload.attachment.mimetype,
        size: payload.attachment.size,
        data: payload.attachment.data
      } : null
    });
    
    console.log(`✅ Mensaje guardado en BD: ${payload.messageId}`);
    res.json({ success: true });
  } catch (error) {
    console.error('❌ Error guardando mensaje:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});
```

### Ejemplo 3: Reenviar a Slack

```javascript
const axios = require('axios');

app.post('/webhook/messages', async (req, res) => {
  const payload = req.body;
  
  // Formatear mensaje para Slack
  const slackMessage = {
    text: `*${payload.groupName}*`,
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${payload.senderName}:* ${payload.message}`
        }
      }
    ]
  };
  
  // Si tiene adjunto, agregar nota
  if (payload.attachment) {
    slackMessage.blocks.push({
      type: "context",
      elements: [{
        type: "mrkdwn",
        text: `📎 ${payload.attachment.filename} (${(payload.attachment.size / 1024).toFixed(2)} KB)`
      }]
    });
  }
  
  // Enviar a Slack
  try {
    await axios.post(process.env.SLACK_WEBHOOK_URL, slackMessage);
    console.log('✅ Mensaje reenviado a Slack');
  } catch (error) {
    console.error('❌ Error enviando a Slack:', error);
  }
  
  res.json({ success: true });
});
```

### Ejemplo 4: Filtrar Mensajes Específicos

```javascript
app.post('/webhook/messages', async (req, res) => {
  const payload = req.body;
  
  // Solo procesar mensajes que contengan ciertas palabras clave
  const keywords = ['urgente', 'importante', 'ASAP'];
  const hasKeyword = keywords.some(keyword => 
    payload.message.toLowerCase().includes(keyword.toLowerCase())
  );
  
  if (hasKeyword) {
    // Enviar notificación urgente
    await sendUrgentNotification({
      from: payload.senderName,
      group: payload.groupName,
      message: payload.message
    });
    console.log('🚨 Mensaje urgente procesado');
  }
  
  res.json({ success: true, processed: hasKeyword });
});
```

## Casos de Uso

### 1. Integración con CRM
Reenviar mensajes de grupos de soporte a tu sistema CRM para crear tickets automáticamente.

### 2. Archivo y Análisis
Guardar todos los mensajes en una base de datos para análisis posterior o cumplimiento normativo.

### 3. Notificaciones Multi-Canal
Reenviar mensajes importantes a Slack, Discord, Teams, o email.

### 4. Procesamiento con IA
Enviar mensajes a servicios de IA para análisis de sentimiento, clasificación, o respuestas automáticas.

### 5. Backup Automático
Crear backups automáticos de conversaciones importantes con todos sus adjuntos.

### 6. Monitoreo de Palabras Clave
Detectar menciones de productos, marcas, o temas específicos en grupos.

### 7. Integración con Sistemas Legados
Conectar WhatsApp con sistemas antiguos que solo aceptan webhooks HTTP.

## Configuración Avanzada

### Múltiples Webhooks por Grupo

Puedes configurar múltiples webhooks para redundancia o diferentes sistemas:

```bash
curl -X POST http://localhost:7261/api/monitored-groups/update \
  -H "Content-Type: application/json" \
  -d '{
    "groupId": "123456789-111222333@g.us",
    "updates": {
      "webhooks": [
        "https://backup1.com/webhook",
        "https://backup2.com/webhook",
        "https://analytics.com/webhook"
      ]
    }
  }'
```

### Deshabilitar Adjuntos para Ahorrar Ancho de Banda

Si solo necesitas el texto:

```bash
curl -X POST http://localhost:7261/api/monitored-groups/update \
  -H "Content-Type: application/json" \
  -d '{
    "groupId": "123456789-111222333@g.us",
    "updates": {
      "includeAttachments": false
    }
  }'
```

### Pausar Temporalmente sin Eliminar

```bash
curl -X POST http://localhost:7261/api/monitored-groups/toggle \
  -H "Content-Type: application/json" \
  -d '{
    "groupId": "123456789-111222333@g.us",
    "enabled": false
  }'
```

## Gestión desde Archivo de Configuración

Alternativamente, puedes editar directamente el archivo `config/monitored-groups.json`:

```json
[
  {
    "groupId": "123456789-111222333@g.us",
    "groupName": "Equipo de Marketing",
    "webhooks": [
      "https://tu-servidor.com/webhook/messages"
    ],
    "enabled": true,
    "includeAttachments": true,
    "includeMetadata": true
  },
  {
    "groupId": "987654321-444555666@g.us",
    "groupName": "Soporte Técnico",
    "webhooks": [
      "https://soporte.com/webhook",
      "https://backup.com/webhook"
    ],
    "enabled": true,
    "includeAttachments": false,
    "includeMetadata": true
  }
]
```

**Nota:** Después de editar el archivo, reinicia el bot para aplicar los cambios.

## Seguridad

### Verificación de Webhooks

Tu servidor webhook debe validar que las peticiones vienen del bot:

```javascript
app.post('/webhook/messages', (req, res) => {
  // Verificar que el payload tiene la estructura esperada
  if (!req.body.messageId || !req.body.groupId) {
    return res.status(400).json({ error: 'Invalid payload' });
  }
  
  // Verificar metadata del bot si está habilitado
  if (req.body.metadata && req.body.metadata.botId !== 'BOT_ESPERADO') {
    return res.status(403).json({ error: 'Unauthorized bot' });
  }
  
  // Procesar mensaje...
  res.json({ success: true });
});
```

### HTTPS Recomendado

Usa siempre HTTPS para tus webhooks para proteger los datos en tránsito:
- ✅ `https://tu-servidor.com/webhook`
- ❌ `http://tu-servidor.com/webhook`

### Límite de Tamaño

Los adjuntos se envían en base64, lo que aumenta el tamaño ~33%. Configura límites apropiados:

```javascript
app.use(express.json({ limit: '100mb' })); // Ajustar según necesidad
```

## Troubleshooting

### El webhook no recibe mensajes

1. Verifica que el grupo esté habilitado:
   ```bash
   curl http://localhost:7261/api/monitored-groups/ | jq
   ```

2. Prueba la conectividad del webhook:
   ```bash
   curl -X POST http://localhost:7261/api/monitored-groups/test \
     -H "Content-Type: application/json" \
     -d '{"webhookUrl": "TU_WEBHOOK_URL"}'
   ```

3. Revisa los logs del bot:
   ```bash
   pm2 logs wabot-PUERTO
   ```

### El webhook recibe el payload pero falla

1. Verifica que tu servidor responda con status 200-299
2. Revisa que acepte JSON de hasta 100MB
3. Confirma que el Content-Type sea `application/json`

### Los adjuntos no se incluyen

1. Verifica que `includeAttachments` esté en `true`:
   ```bash
   curl http://localhost:7261/api/monitored-groups/ | jq '.groups[] | select(.groupId == "TU_GROUP_ID")'
   ```

2. Si es `false`, actualízalo:
   ```bash
   curl -X POST http://localhost:7261/api/monitored-groups/update \
     -H "Content-Type: application/json" \
     -d '{"groupId": "TU_GROUP_ID", "updates": {"includeAttachments": true}}'
   ```

## Soporte

Para más información, consulta:
- Documentación completa en `/api-docs` (Swagger)
- [API Reference](../README.md)
- [GitHub Issues](https://github.com/tu-repo/issues)

## Licencia

Este proyecto está bajo la misma licencia que el bot-manager principal.
