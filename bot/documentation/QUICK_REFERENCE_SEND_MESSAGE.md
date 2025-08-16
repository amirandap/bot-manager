# 🚀 Quick Reference - Endpoint Unificado `/send-message`

## 📝 URLs y Documentación

- **Endpoint**: `POST http://localhost:7201/send-message`
- **Swagger UI**: http://localhost:7201/api-docs
- **Documentación Completa**: `documentation/UNIFIED_SEND_MESSAGE_ENDPOINT.md`

## ⚡ Ejemplos Rápidos

### Texto Simple
```bash
curl -X POST http://localhost:7201/send-message \
  -H "Content-Type: application/json" \
  -d '{"to": "1234567890", "message": "Hola!"}'
```

### Múltiples Destinatarios (Números + Grupos)
```bash
curl -X POST http://localhost:7201/send-message \
  -H "Content-Type: application/json" \
  -d '{
    "to": ["1234567890", "123456789-987654321@g.us"], 
    "message": "Mensaje para todos"
  }'
```

### Imagen con Caption
```bash
curl -X POST http://localhost:7201/send-message \
  -F "to=[\"1234567890\"]" \
  -F "caption=¡Increíble imagen!" \
  -F "file=@imagen.jpg"
```

### Documento con Mensaje
```bash
curl -X POST http://localhost:7201/send-message \
  -F "to=1234567890" \
  -F "message=Documento adjunto" \
  -F "file=@documento.pdf"
```

### Audio/Video Solo
```bash
curl -X POST http://localhost:7201/send-message \
  -F "to=[\"1234567890\", \"0987654321\"]" \
  -F "file=@audio.mp3"
```

## 🔍 Detección Automática

| Archivo | Tipo | Campo Texto | Límite |
|---------|------|-------------|--------|
| `.jpg`, `.png`, `.gif`, `.webp` | Imagen | `caption` | 16MB |
| `.mp4`, `.avi`, `.mov`, `.3gp` | Video | `caption` | 64MB |
| `.mp3`, `.wav`, `.ogg`, `.amr` | Audio | `message` | 16MB |
| Otros | Documento | `message` | 100MB |

## 🚨 Validaciones

- **Sin archivo**: `message` es requerido
- **Con archivo**: `to` es requerido, texto opcional
- **Destinatarios**: Formato automático para números y grupos
- **Tamaño**: Validación automática por tipo de archivo

## 🔄 Endpoints de Compatibilidad

- `/send-broadcast` → Alias de `/send-message` (deprecated)
- `/send-to-phone` → Específico para números
- `/send-to-group` → Específico para grupos  
- `/send-image`, `/send-document`, etc. → Específicos por tipo

## 📊 Respuestas

### Éxito Total (200)
```json
{
  "success": true,
  "messagesSent": ["1234567890"],
  "errors": [],
  "totalSent": 1,
  "totalErrors": 0,
  "requestId": "req_xxx",
  "timestamp": "2024-08-16T10:30:00.000Z"
}
```

### Éxito Parcial (207)
```json
{
  "success": false,
  "messagesSent": ["1234567890"],
  "errors": [{
    "recipient": "0987654321",
    "error": "Number not registered",
    "errorType": "TEXT_SEND_ERROR",
    "timestamp": "2024-08-16T10:30:00.000Z"
  }],
  "totalSent": 1,
  "totalErrors": 1
}
```

### Error de Validación (400)
```json
{
  "success": false,
  "error": "VALIDATION_ERROR: message is required when no file is provided",
  "requestId": "req_xxx",
  "timestamp": "2024-08-16T10:30:00.000Z"
}
```

## 🛠️ Testing

```bash
# Verificar estado del bot
curl http://localhost:7201/status

# Ver grupos disponibles
curl http://localhost:7201/get-groups

# Health check
curl http://localhost:7201/health
```

## 📋 Checklist Pre-Deploy

- [ ] Bot conectado (`/status` returns `isReady: true`)
- [ ] Swagger actualizado (`/api-docs`)
- [ ] Tests de cada tipo de archivo
- [ ] Validación de destinatarios mixtos
- [ ] Manejo de errores parciales

---

*Referencia actualizada: 16 de Agosto, 2025*
