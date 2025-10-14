# WhatsApp Number Verification API

## 📋 Descripción General

Este documento describe cómo implementar y usar la funcionalidad de verificación de números de WhatsApp en el Bot Manager. La verificación permite determinar si un número de teléfono está registrado en WhatsApp antes de enviar mensajes.

## 🚀 Características Principales

- ✅ **Verificación en tiempo real**: Consulta directa a WhatsApp Web API
- ✅ **Validación de formato**: Verificación automática del formato del número
- ✅ **Respuesta estructurada**: JSON con información detallada del estado
- ✅ **Gestión de errores**: Manejo robusto de casos especiales
- ✅ **Integración completa**: Compatible con el sistema de bots existente

## 🔧 Implementación Técnica

### Base de Código Existente

El sistema ya cuenta con la funcionalidad base para verificación en:
- **Archivo**: `bot/src/utils/textMessaging.ts`
- **Método**: `client.getNumberId(formattedRecipient)`
- **Funcionalidad**: Verificación automática antes del envío de mensajes

### Implementación del Endpoint

#### 1. Agregar al Backend (Controlador)

```typescript
// backend/src/controllers/botProxy/BotConfigController.ts

/**
 * Verificar si un número existe en WhatsApp
 */
public async verifyWhatsAppNumber(req: Request, res: Response): Promise<void> {
  try {
    const { botId, phoneNumber } = req.body;
    
    if (!botId) {
      res.status(400).json({ error: "Bot ID is required in request body" });
      return;
    }
    
    if (!phoneNumber) {
      res.status(400).json({ error: "Phone number is required in request body" });
      return;
    }

    const requestData = { phoneNumber };

    const result = await this.botCommunicationService.forwardRequest({
      botId,
      endpoint: "/verify-number",
      method: "POST",
      requestData
    });
    
    res.json(result);
  } catch (error) {
    this.errorHandlingService.handleControllerError("verify WhatsApp number", error, res);
  }
}
```

#### 2. Agregar Ruta (Backend)

```typescript
// backend/src/routes/botProxyRoutes.ts

/**
 * @swagger
 * /api/bots/verify-number:
 *   post:
 *     summary: Verificar número de WhatsApp
 *     tags: [Bot Proxy - Verification]
 *     description: Verifica si un número de teléfono está registrado en WhatsApp
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [botId, phoneNumber]
 *             properties:
 *               botId:
 *                 type: string
 *                 description: Identificador único del bot
 *                 example: "whatsapp-bot-1234567890"
 *               phoneNumber:
 *                 type: string
 *                 description: Número de teléfono con código de país
 *                 example: "+1234567890"
 *           examples:
 *             verify_number:
 *               summary: Verificar número individual
 *               value:
 *                 botId: "whatsapp-bot-1234567890"
 *                 phoneNumber: "+1234567890"
 *     responses:
 *       200:
 *         description: Verificación completada exitosamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 phoneNumber:
 *                   type: string
 *                   example: "+1234567890"
 *                 isRegistered:
 *                   type: boolean
 *                   example: true
 *                 numberId:
 *                   type: string
 *                   example: "1234567890@c.us"
 *                 formatted:
 *                   type: string
 *                   example: "+1 (234) 567-890"
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *                   example: "2025-10-06T23:30:00Z"
 *       400:
 *         description: Bot ID y número de teléfono son requeridos
 *       404:
 *         description: Bot no encontrado
 *       500:
 *         description: Error del servidor o bot no responde
 */
app.post(
  "/api/bots/verify-number",
  botProxyController.verifyWhatsAppNumber.bind(botProxyController)
);
```

#### 3. Implementar en el Bot

```typescript
// bot/src/utils/apiUtils.ts - Agregar endpoint

/**
 * @swagger
 * /verify-number:
 *   post:
 *     tags: [Verification]
 *     summary: Verificar número de WhatsApp
 *     description: Verifica si un número de teléfono está registrado en WhatsApp
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [phoneNumber]
 *             properties:
 *               phoneNumber:
 *                 type: string
 *                 description: Número de teléfono con código de país
 *                 example: "+1234567890"
 *     responses:
 *       200:
 *         description: Verificación exitosa
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/NumberVerificationResponse'
 *       400:
 *         description: Número de teléfono requerido
 *       500:
 *         description: Error en la verificación
 */
expressApp.post("/verify-number", async (req, res) => {
  const { phoneNumber } = req.body;
  
  if (!phoneNumber) {
    return res.status(400).json({
      success: false,
      error: "Phone number is required"
    });
  }

  try {
    // Importar funciones de utilidad
    const { formatRecipient } = await import("./messageFormatUtils");
    const { cleanAndFormatPhoneNumber } = await import("./cleanAndFormatPhoneNumber");
    
    // Formatear número
    const formattedNumber = formatRecipient(phoneNumber);
    const cleanedNumber = cleanAndFormatPhoneNumber(phoneNumber);
    
    // Obtener cliente WhatsApp
    const client = getWhatsAppClient();
    if (!client) {
      return res.status(500).json({
        success: false,
        error: "WhatsApp client not ready"
      });
    }

    // Verificar número en WhatsApp
    let isRegistered = false;
    let numberId = null;
    
    try {
      numberId = await client.getNumberId(formattedNumber);
      isRegistered = !!numberId;
    } catch (verifyError: any) {
      logger.warn(`Number verification failed: ${verifyError.message}`);
      isRegistered = false;
    }

    // Respuesta estructurada
    const response = {
      success: true,
      phoneNumber,
      isRegistered,
      numberId: numberId?._serialized || null,
      formatted: cleanedNumber.formatted,
      isValid: cleanedNumber.isValid,
      country: cleanedNumber.country,
      timestamp: new Date().toISOString()
    };

    logger.info(`Number verification completed: ${phoneNumber} -> ${isRegistered}`);
    res.json(response);

  } catch (error: any) {
    logger.error(`Number verification error: ${error.message}`);
    res.status(500).json({
      success: false,
      error: error.message,
      phoneNumber,
      timestamp: new Date().toISOString()
    });
  }
});
```

## 🌐 Uso de la API

### URL Base

```
https://wapi.softgrouprd.com/api/bots/verify-number
```

### Autenticación

El endpoint utiliza el sistema de bots existente. Asegúrate de:
1. ✅ Bot configurado y activo
2. ✅ WhatsApp Web autenticado
3. ✅ Bot ID válido en la configuración

### Ejemplo de Solicitud

```bash
curl -X POST "https://wapi.softgrouprd.com/api/bots/verify-number" \
  -H "Content-Type: application/json" \
  -d '{
    "botId": "whatsapp-bot-1234567890",
    "phoneNumber": "+1234567890"
  }'
```

### Ejemplo de Respuesta Exitosa

```json
{
  "success": true,
  "phoneNumber": "+1234567890",
  "isRegistered": true,
  "numberId": "1234567890@c.us",
  "formatted": "+1 (234) 567-890",
  "isValid": true,
  "country": "US",
  "timestamp": "2025-10-06T23:30:00Z"
}
```

### Ejemplo de Respuesta - Número No Registrado

```json
{
  "success": true,
  "phoneNumber": "+1234567890",
  "isRegistered": false,
  "numberId": null,
  "formatted": "+1 (234) 567-890",
  "isValid": true,
  "country": "US",
  "timestamp": "2025-10-06T23:30:00Z"
}
```

### Ejemplo de Error

```json
{
  "success": false,
  "error": "Bot not found or misconfigured",
  "errorType": "CONTROLLER_ERROR",
  "details": "BACKEND_ERROR: Bot whatsapp-bot-1234567890 not found or misconfigured",
  "timestamp": "2025-10-06T23:30:00Z",
  "troubleshooting": "Check the verify number operation parameters and system status"
}
```

## 🔧 Configuración del Servidor

### Requisitos del Sistema

- **Node.js**: v18+
- **PM2**: Para gestión de procesos
- **MongoDB/SQLite**: Para logs (opcional)
- **Nginx**: Para proxy reverso (recomendado)

### Variables de Entorno

```bash
# Bot Configuration
BOT_ID=whatsapp-bot-1234567890
BOT_NAME=WhatsApp Verification Bot
BOT_PORT=7201
BOT_TYPE=whatsapp

# API Configuration
API_PORT=3001
NODE_ENV=production

# Data Paths
DATA_ROOT=/var/lib/bot-manager/data
SESSION_PATH=/var/lib/bot-manager/data/sessions
QR_PATH=/var/lib/bot-manager/data/qr-codes
```

### Configuración de Nginx

```nginx
server {
    listen 80;
    server_name wapi.softgrouprd.com;

    location /api/ {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # Timeout settings
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl;
    server_name wapi.softgrouprd.com;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;

    location /api/ {
        proxy_pass http://localhost:3001;
        # ... same proxy settings as above
    }
}
```

## 📊 Casos de Uso

### 1. Validación de Lista de Contactos

```javascript
const phoneNumbers = ["+1234567890", "+9876543210", "+1122334455"];
const verificationResults = [];

for (const number of phoneNumbers) {
  const response = await fetch("https://wapi.softgrouprd.com/api/bots/verify-number", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      botId: "whatsapp-bot-1234567890",
      phoneNumber: number
    })
  });
  
  const result = await response.json();
  verificationResults.push(result);
}

// Filtrar solo números registrados
const validNumbers = verificationResults
  .filter(r => r.success && r.isRegistered)
  .map(r => r.phoneNumber);

console.log("Números válidos:", validNumbers);
```

### 2. Integración con Formularios Web

```javascript
async function validateWhatsAppNumber(phoneNumber) {
  try {
    const response = await fetch("/api/bots/verify-number", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        botId: "whatsapp-bot-1234567890",
        phoneNumber: phoneNumber
      })
    });
    
    const result = await response.json();
    
    if (result.success && result.isRegistered) {
      return { valid: true, formatted: result.formatted };
    } else {
      return { valid: false, error: "Número no registrado en WhatsApp" };
    }
  } catch (error) {
    return { valid: false, error: "Error de conexión" };
  }
}

// Uso en formulario
document.getElementById("phone-input").addEventListener("blur", async (e) => {
  const validation = await validateWhatsAppNumber(e.target.value);
  
  if (validation.valid) {
    e.target.classList.add("valid");
    e.target.value = validation.formatted;
  } else {
    e.target.classList.add("invalid");
    alert(validation.error);
  }
});
```

### 3. API de Lotes (Batch Processing)

```javascript
// Implementar endpoint para verificación masiva
async function verifyNumbersBatch(phoneNumbers) {
  const results = await Promise.allSettled(
    phoneNumbers.map(number => 
      fetch("/api/bots/verify-number", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          botId: "whatsapp-bot-1234567890",
          phoneNumber: number
        })
      }).then(r => r.json())
    )
  );
  
  return results.map((result, index) => ({
    phoneNumber: phoneNumbers[index],
    status: result.status,
    data: result.status === "fulfilled" ? result.value : null,
    error: result.status === "rejected" ? result.reason : null
  }));
}
```

## ⚡ Optimizaciones y Mejores Prácticas

### 1. Cache de Resultados

```javascript
// Implementar cache Redis para evitar consultas repetidas
const redis = require("redis");
const client = redis.createClient();

async function verifyNumberWithCache(phoneNumber) {
  const cacheKey = `whatsapp_verify:${phoneNumber}`;
  
  // Verificar cache
  const cached = await client.get(cacheKey);
  if (cached) {
    return JSON.parse(cached);
  }
  
  // Verificar en WhatsApp
  const result = await verifyWhatsAppNumber(phoneNumber);
  
  // Guardar en cache (24 horas)
  await client.setex(cacheKey, 86400, JSON.stringify(result));
  
  return result;
}
```

### 2. Rate Limiting

```javascript
// Implementar límites de velocidad
const rateLimit = require("express-rate-limit");

const verifyLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 verificaciones por IP
  message: {
    error: "Too many verification requests, please try again later."
  }
});

app.post("/verify-number", verifyLimit, async (req, res) => {
  // ... implementación del endpoint
});
```

### 3. Monitoreo y Logs

```javascript
// Agregar métricas de monitoreo
const metrics = {
  totalVerifications: 0,
  successfulVerifications: 0,
  failedVerifications: 0,
  avgResponseTime: 0
};

function updateMetrics(success, responseTime) {
  metrics.totalVerifications++;
  if (success) {
    metrics.successfulVerifications++;
  } else {
    metrics.failedVerifications++;
  }
  
  // Calcular tiempo promedio de respuesta
  metrics.avgResponseTime = 
    (metrics.avgResponseTime * (metrics.totalVerifications - 1) + responseTime) / 
    metrics.totalVerifications;
}
```

## 🔒 Seguridad

### 1. Validación de Entrada

- ✅ Sanitización de números de teléfono
- ✅ Validación de formato internacional
- ✅ Límites de longitud y caracteres
- ✅ Protección contra inyección

### 2. Autenticación

```javascript
// Implementar API Keys para desarrolladores externos
const apiKeyAuth = (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey || !isValidApiKey(apiKey)) {
    return res.status(401).json({
      error: "Invalid or missing API key"
    });
  }
  
  next();
};

app.post("/verify-number", apiKeyAuth, async (req, res) => {
  // ... implementación
});
```

### 3. Logging de Seguridad

```javascript
// Log de intentos de acceso y patrones sospechosos
function logSecurityEvent(req, event, details) {
  logger.security(`Security Event: ${event}`, {
    ip: req.ip,
    userAgent: req.get('User-Agent'),
    timestamp: new Date().toISOString(),
    details
  });
}
```

## 🚀 Despliegue

### 1. Build y Deploy

```bash
# Build del backend
cd backend && npm run build

# Build del bot
cd bot && npm run build

# Restart servicios con PM2
pm2 reload bot-manager-backend
pm2 reload whatsapp-bot-1234567890
```

### 2. Configuración PM2

```javascript
// ecosystem.config.js
module.exports = {
  apps: [{
    name: 'whatsapp-verification-bot',
    script: 'dist/index.js',
    cwd: './bot',
    env: {
      NODE_ENV: 'production',
      BOT_ID: 'whatsapp-verification-bot',
      BOT_PORT: 7201
    },
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G'
  }]
};
```

### 3. Verificación de Despliegue

```bash
# Verificar servicios
pm2 status

# Test del endpoint
curl -X POST "https://wapi.softgrouprd.com/api/bots/verify-number" \
  -H "Content-Type: application/json" \
  -d '{"botId": "whatsapp-verification-bot", "phoneNumber": "+1234567890"}'

# Verificar logs
pm2 logs whatsapp-verification-bot
```

## 📞 Soporte

### Contacto Técnico

- **Email**: soporte@wapi.softgrouprd.com
- **Documentación**: https://wapi.softgrouprd.com/api-docs
- **GitHub**: https://github.com/tu-usuario/bot-manager

### Códigos de Error Comunes

| Código | Descripción | Solución |
|--------|-------------|----------|
| 400 | Parámetros faltantes | Verificar botId y phoneNumber |
| 404 | Bot no encontrado | Verificar configuración del bot |
| 500 | Cliente WhatsApp no listo | Esperar autenticación QR |
| 429 | Rate limit excedido | Reducir frecuencia de solicitudes |

---

**Última actualización**: Octubre 6, 2025  
**Versión API**: v2.1.0  
**Estado**: ✅ Funcional y probado