# WhatsApp Bot Manager - Documentación

## 📋 Información del Proyecto

Este repositorio contiene un **WhatsApp Bot completamente funcional** con arquitectura modular, sistema de error handling robusto y **endpoint unificado** para mensajería multimedia.

## 🌟 NUEVO: Endpoint Unificado `/send-message`

**El bot ahora incluye un endpoint completamente unificado que maneja automáticamente:**

- ✅ **Texto**: Mensajes simples y a múltiples destinatarios
- ✅ **Imágenes**: JPG, PNG, GIF, WEBP con caption opcional  
- ✅ **Videos**: MP4, AVI, MOV con caption opcional
- ✅ **Audio**: MP3, WAV, OGG con mensaje opcional
- ✅ **Documentos**: PDF, DOC, XLS con mensaje opcional
- ✅ **Destinatarios Mixtos**: Números y grupos en la misma solicitud
- ✅ **Detección Automática**: Identifica el tipo de contenido automáticamente

📖 **Ver documentación completa**: [`documentation/UNIFIED_SEND_MESSAGE_ENDPOINT.md`](./documentation/UNIFIED_SEND_MESSAGE_ENDPOINT.md)

### Ejemplo de Uso Rápido

```bash
# Mensaje de texto
curl -X POST http://localhost:7201/send-message \
  -H "Content-Type: application/json" \
  -d '{"to": ["1234567890"], "message": "Hola!"}'

# Imagen con caption (detección automática)
curl -X POST http://localhost:7201/send-message \
  -F "to=[\"1234567890\"]" \
  -F "caption=¡Mira esto!" \
  -F "file=@imagen.jpg"
```

## 🚨 IMPORTANTE - LEE ANTES DE CONTRIBUIR

**⚠️ Este proyecto tiene una arquitectura consolidada y completamente migrada. Antes de hacer cualquier cambio, lee la documentación completa:**

### 📖 Documentación Obligatoria

1. **[`docs/architecture/ARCHITECTURE_GUIDE.md`](./docs/architecture/ARCHITECTURE_GUIDE.md)** - Reglas de arquitectura
2. **[`docs/architecture/MIGRATION_STATUS.md`](./docs/architecture/MIGRATION_STATUS.md)** - Estado actual 
3. **[`docs/api/API_REFERENCE.md`](./docs/api/API_REFERENCE.md)** - Documentación de API

### ✅ Sistemas Establecidos - REUTILIZAR

- **Error Handling:** `MessageErrorHandlerService` 
- **Logging:** `botLogger` 
- **Media Services:** `MediaMessagingService`
- **Validation:** Servicios de validación existentes

## 🚀 Inicio Rápido

### Instalación
```bash
npm install
```

### Configuración
```bash
cp .env.example .env
# Editar .env con tus configuraciones
```

### Desarrollo
```bash
npm run dev
```

### Producción
```bash
npm run build
npm start
```

## 📱 API Endpoints

Base URL: `http://localhost:3000`

### Mensajes
- `POST /send-message` - Enviar mensaje de texto
- `POST /send-broadcast` - Enviar a múltiples destinatarios
- `POST /send-to-group` - Enviar a grupo específico
- `POST /send-to-phone` - Enviar a teléfono específico

### Media
- `POST /send-image` - Enviar imagen
- `POST /send-video` - Enviar video  
- `POST /send-audio` - Enviar audio
- `POST /send-document` - Enviar documento

### Información
- `GET /get-groups` - Obtener lista de grupos

**Ver documentación completa:** [`docs/api/API_REFERENCE.md`](./docs/api/API_REFERENCE.md)

## 🏗️ Arquitectura

```
src/
├── config/          # Configuraciones
├── types/           # Tipos TypeScript
├── utils/           # ✅ SOLO funciones puras
├── services/        # ✅ TODAS las clases con estado
├── controllers/     # Lógica de aplicación
├── routes/          # Endpoints Express
├── middleware/      # Middlewares
└── validators/      # Validadores
```

### Principios Fundamentales

1. **`utils/` = funciones puras solamente** (sin clases)
2. **`services/` = todas las clases y lógica con estado**
3. **Sistema de logging unificado** (`botLogger`)
4. **Sistema de error handling centralizado** (`MessageErrorHandlerService`)

## 🔧 Scripts Disponibles

```bash
npm run dev          # Desarrollo con hot reload
npm run build        # Compilar TypeScript
npm start           # Iniciar en producción
npm run pm2:start   # Iniciar con PM2
npm run pm2:stop    # Detener PM2
npm run pm2:restart # Reiniciar PM2
```

## 📊 Estructura del Proyecto

### Servicios Principales
- **LoggerService** - Sistema de logging unificado
- **WhatsAppErrorHandlerService** - Manejo de errores
- **MediaMessagingService** - Envío de multimedia
- **DirectoryManagerService** - Gestión de directorios

### Controladores
- **MessageController** - Lógica de mensajes
- **MessageHandlerController** - Orquestación de envíos

### Rutas
- Todas las rutas usan el patrón establecido
- Error handling consistente
- Logging unificado

## 🚫 Reglas de Contribución

### Prohibido
1. Crear clases en `utils/` 
2. Duplicar funcionalidad existente
3. Usar `console.log` (usar `botLogger`)
4. Modificar arquitectura establecida
5. Crear nuevos sistemas de error handling o logging

### Permitido
1. Optimizar funciones existentes
2. Agregar documentación
3. Agregar tests
4. Mejorar performance
5. Simplificar código existente

## 🔧 Tecnologías

- **Node.js** - Runtime
- **TypeScript** - Lenguaje 
- **Express.js** - Framework web
- **whatsapp-web.js** - Integración WhatsApp
- **PM2** - Gestión de procesos
- **Puppeteer** - Control de navegador

## 📱 Características

### ✅ Funcionalidades Implementadas
- Envío de mensajes de texto
- Envío de multimedia (imagen, video, audio, documentos)
- Envío a grupos y individuos
- Broadcast a múltiples destinatarios
- Sistema robusto de error handling
- Logging completo con emojis
- Validación de números de teléfono
- Reintentos automáticos
- API REST completa

### 🎯 Casos de Uso
- Notificaciones automáticas
- Marketing masivo
- Soporte al cliente
- Automatización de comunicaciones
- Integración con sistemas existentes

## 🔍 Monitoring y Logs

Los logs incluyen emojis para fácil identificación:
- 📥 Solicitud recibida
- ✅ Mensaje enviado exitosamente
- ❌ Error en envío
- 📱 Procesando teléfono
- 🏢 Procesando grupo
- 🔄 Proceso en curso

## ⚡ Performance

- Procesamiento asíncrono
- Reintentos inteligentes
- Validación de números
- Gestión eficiente de memoria
- Logs estructurados

## 🤝 Soporte

Para preguntas o problemas:
1. Revisa la documentación en `docs/`
2. Verifica que sigues las reglas de arquitectura
3. Asegúrate de reutilizar sistemas existentes

---

**Recuerda:** Este es un sistema completamente funcional y consolidado. El objetivo es mantener y optimizar, no recrear funcionalidad existente.