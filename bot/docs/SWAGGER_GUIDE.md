# 📚 Documentación Swagger - WhatsApp Bot API

## 🚀 Acceso a la Documentación

Una vez que el bot esté ejecutándose, puedes acceder a la documentación interactiva en:

### 🔗 Enlaces Principales
- **Interfaz Principal**: http://localhost:3000/api-docs
- **Documentación Alternativa**: http://localhost:3000/docs (redirige a api-docs)
- **JSON Schema**: http://localhost:3000/swagger.json

## 📖 Características de la Documentación

### ✅ **Funcionalidades Incluidas**
- **Interfaz Interactiva**: Prueba endpoints directamente desde el navegador
- **Ejemplos Completos**: Cada endpoint incluye ejemplos de request/response
- **Schemas Detallados**: Documentación completa de todos los tipos de datos
- **Categorización**: Endpoints organizados por tags (Mensajes, Multimedia, Grupos, Estado)
- **Validación**: Descripción detallada de validaciones y errores

### 🏷️ **Tags y Categorías**

#### 📱 **Mensajes**
- `POST /send-to-phone` - Envío a números de teléfono
- `POST /send-to-group` - Envío a grupos específicos  
- `POST /send-broadcast` - Envío masivo mixto
- `POST /send-message` - Endpoint simplificado (legacy)

#### 🎬 **Multimedia**
- `POST /send-image` - Envío de imágenes con caption
- `POST /send-video` - Envío de videos con caption
- `POST /send-audio` - Envío de archivos de audio
- `POST /send-document` - Envío de documentos

#### 👥 **Grupos**
- `GET /get-groups` - Listado de grupos disponibles

#### 🔍 **Estado**
- `GET /status` - Estado del bot y conexión WhatsApp
- `GET /health` - Health check del sistema

## 🛠️ **Uso de la Interfaz Swagger**

### 1. **Explorar Endpoints**
```
1. Abre http://localhost:3000/api-docs
2. Navega por las secciones usando los tags
3. Haz clic en cualquier endpoint para ver detalles
```

### 2. **Probar Endpoints**
```
1. Haz clic en "Try it out" en cualquier endpoint
2. Completa los parámetros requeridos
3. Haz clic en "Execute"
4. Revisa la respuesta en tiempo real
```

### 3. **Ver Ejemplos**
```
- Cada endpoint incluye ejemplos de request
- Los schemas muestran la estructura exacta de datos
- Las respuestas incluyen códigos de estado y ejemplos
```

## 📋 **Schemas Principales**

### 🔄 **Respuestas Estándar**
```typescript
StandardResponse {
  success: boolean
  messagesSent: string[]
  errors: MessageError[]
  totalSent: integer
  totalErrors: integer
  requestId: string
  timestamp: string (date-time)
}
```

### 🎯 **Request para Mensajes**
```typescript
PhoneMessageRequest {
  phoneNumber: string | string[]
  message: string
}

GroupMessageRequest {
  groupId: string | string[]
  message: string
}

BroadcastRequest {
  to: string[]
  message: string
}
```

### 🎨 **Respuesta Multimedia**
```typescript
MediaResponse extends StandardResponse {
  mediaType: "image" | "document" | "audio" | "video"
  fileName: string
  fileSize: integer
}
```

### ❌ **Manejo de Errores**
```typescript
MessageError {
  recipient: string
  error: string
  errorType: "VALIDATION_ERROR" | "WHATSAPP_ERROR" | "NETWORK_ERROR" | "CRITICAL_ERROR"
  timestamp: string (date-time)
}
```

## 🧪 **Ejemplos de Uso**

### 📱 **Envío de Mensaje Simple**
```bash
curl -X POST http://localhost:3000/send-to-phone \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "1234567890",
    "message": "Hola desde Swagger!"
  }'
```

### 🎬 **Envío de Imagen**
```bash
curl -X POST http://localhost:3000/send-image \
  -F "to=1234567890" \
  -F "file=@imagen.jpg" \
  -F "caption=Imagen enviada desde la API"
```

### 👥 **Consulta de Grupos**
```bash
curl -X GET http://localhost:3000/get-groups
```

## 🔧 **Configuración y Personalización**

### 📝 **Archivo de Configuración**
La configuración de Swagger está en: `src/config/swagger.ts`

### 🎨 **Personalización**
```typescript
// Opciones de Swagger UI
const swaggerOptions = {
  explorer: true,
  swaggerOptions: {
    docExpansion: 'none',    // Expandir secciones
    filter: true,            // Habilitar filtros
    showRequestDuration: true // Mostrar tiempo de respuesta
  },
  customSiteTitle: 'WhatsApp Bot API Documentation'
};
```

### 🔄 **Actualización de Schemas**
Para agregar nuevos endpoints:
1. Añade anotaciones JSDoc en el código
2. Actualiza schemas en `swagger.ts`
3. Reinicia el servidor

## 📊 **Códigos de Respuesta**

### ✅ **Exitosas**
- **200**: Operación completamente exitosa
- **207**: Operación parcialmente exitosa (algunos errores)

### ⚠️ **Errores del Cliente**
- **400**: Datos de entrada inválidos
- **503**: Cliente WhatsApp no disponible

### ❌ **Errores del Servidor**
- **500**: Error interno del servidor

## 🔍 **Debugging y Troubleshooting**

### 🐛 **Problemas Comunes**

#### 1. **Swagger UI no carga**
```bash
# Verificar que el servidor esté corriendo
curl http://localhost:3000/health

# Verificar endpoint de documentación
curl http://localhost:3000/swagger.json
```

#### 2. **Endpoints no aparecen**
```bash
# Verificar sintaxis JSDoc en apiUtils.ts
# Revisar logs del servidor para errores de parsing
```

#### 3. **Ejemplos no funcionan**
```bash
# Verificar que el cliente WhatsApp esté conectado
curl http://localhost:3000/status

# Revisar logs del bot para errores específicos
```

### 📋 **Validación de Schema**
```bash
# Obtener schema JSON
curl http://localhost:3000/swagger.json | jq

# Validar schema online
# Pegar contenido en https://editor.swagger.io/
```

## 🚀 **Próximas Funcionalidades**

### 🔮 **Roadmap**
- [ ] Autenticación API keys
- [ ] Rate limiting documentation
- [ ] Webhooks documentation
- [ ] Bulk operations endpoints
- [ ] File upload progress tracking
- [ ] Advanced filtering for groups
- [ ] Message templates management

### 🎯 **Mejoras Planificadas**
- [ ] Postman collection export
- [ ] OpenAPI 3.1 migration
- [ ] GraphQL schema alternative
- [ ] SDK generation automation
- [ ] Performance metrics endpoints

## 📞 **Soporte**

Para problemas con la documentación:
1. Revisar logs del servidor
2. Verificar sintaxis JSDoc
3. Consultar ejemplos en `docs/`
4. Reportar issues en el repositorio

---

**💡 Tip**: Mantén la documentación actualizada modificando las anotaciones JSDoc en el código fuente cada vez que cambies la API.
