# Bot Manager System Migration Guide

## 📋 Resumen Ejecutivo

Esta migración transforma el Bot Manager de un sistema hardcodeado a una arquitectura basada en configuración JSON dinámica, con auto-sincronización de datos reales y comunicación directa con los servicios de bots.

---

## 🎯 Objetivos de la Migración

### Problemas Anteriores
- ❌ Configuración de bots hardcodeada en el código
- ❌ URLs malformadas por trailing slashes (`http://host/:port`)
- ❌ Datos estáticos que no reflejaban el estado real de los bots
- ❌ Arquitectura proxy compleja en el frontend
- ❌ Dificultad para agregar/quitar bots sin modificar código

### Objetivos Logrados
- ✅ Configuración dinámica basada en JSON
- ✅ Auto-sincronización con datos reales de los bots
- ✅ URLs correctamente construidas
- ✅ Arquitectura simplificada y escalable
- ✅ CRUD completo para gestión de bots
- ✅ Comunicación directa frontend ↔ backend

---

## 🏗️ Arquitectura Nueva vs Anterior

### Antes (Hardcoded)
```typescript
// ❌ Configuración estática en código
const BOTS = [
  { id: "bot1", host: "localhost", port: 3000 },
  { id: "bot2", host: "localhost", port: 3001 }
];

// ❌ URLs malformadas
const url = `${host}/:${port}/status`; // → http://host/:port/status
```

### Después (Configuration-Driven)
```json
// ✅ Configuración dinámica en JSON
{
  "bots": [
    {
      "id": "whatsapp-bot-1",
      "name": "WhatsApp Bot 1",
      "type": "whatsapp",
      "apiHost": "http://20.121.40.254",
      "apiPort": 7260,
      "phoneNumber": "+1234567890",
      "pushName": "Bot Asistente 1",
      "enabled": true
    }
  ]
}
```

```typescript
// ✅ URLs correctamente construidas
const url = `${bot.apiHost}:${bot.apiPort}/status`; // → http://host:port/status
```

---

## 🔧 Componentes Implementados

### 1. ConfigService (Singleton)

**Ubicación:** `backend/src/services/configService.ts`

```typescript
export class ConfigService {
  private static instance: ConfigService;
  private configPath: string = path.join(process.cwd(), 'config', 'bots.json');
  private fallbackApiHost: string = 'http://localhost';

  // Métodos principales
  static getInstance(): ConfigService
  loadConfig(): BotConfig
  saveConfig(config: BotConfig): void
  getAllBots(): Bot[]
  getBotById(id: string): Bot | undefined
  addBot(bot: Omit<Bot, 'id' | 'createdAt' | 'updatedAt'>): Bot
  updateBot(id: string, updates: Partial<Bot>): Bot | null
  deleteBot(id: string): boolean
  updateBotWithRealData(id: string, realData: Partial<Bot>): void
}
```

**Características clave:**
- **Singleton Pattern**: Una sola instancia global
- **Fallback API Host**: Valor por defecto cuando `apiHost` está vacío
- **Auto-save**: Cambios se persisten automáticamente
- **Validación de datos**: Tipos TypeScript completos

### 2. BotService (Refactorizado)

**Ubicación:** `backend/src/services/botService.ts`

```typescript
export class BotService {
  private configService: ConfigService;

  constructor() {
    this.configService = ConfigService.getInstance();
  }

  async getBotStatus(id: string): Promise<BotStatus | null>
  async getWhatsAppBotStatus(): Promise<BotStatus[]>
  async getDiscordBotStatus(): Promise<BotStatus[]>
  private async checkBotHealth(bot: Bot): Promise<BotStatus>
}
```

**Mejoras implementadas:**
- **Detección inteligente**: Soporta múltiples formatos de respuesta
- **Auto-actualización**: Extrae y sincroniza datos reales automáticamente
- **Error handling**: Manejo robusto de errores de conexión
- **Logging detallado**: Trazabilidad completa

---

## 🔄 Flujo de Auto-Sincronización

### Proceso Paso a Paso

1. **Frontend solicita status**
   ```http
   GET /api/bots
   ```

2. **Backend carga configuración**
   ```typescript
   const bots = this.configService.getAllBots();
   ```

3. **Para cada bot habilitado:**
   ```typescript
   // Construye URL correctamente
   const statusUrl = `${bot.apiHost}:${bot.apiPort}/status`;
   
   // Hace request al bot real
   const response = await axios.get(statusUrl, { timeout: 5000 });
   ```

4. **Analiza respuesta del bot:**
   ```json
   {
     "status": "online",
     "client": {
       "pushname": "AM",
       "wid": { "user": "18296459554" }
     }
   }
   ```

5. **Extrae datos reales:**
   ```typescript
   const realData = {
     phoneNumber: response.data.client?.wid?.user,
     pushName: response.data.client?.pushname,
     updatedAt: new Date().toISOString()
   };
   ```

6. **Auto-actualiza JSON:**
   ```typescript
   this.configService.updateBotWithRealData(bot.id, realData);
   ```

### Detección de Estado Inteligente

El sistema detecta bots online usando múltiples criterios:

```typescript
const isOnline = response.data.connected === true || 
                 response.data.status === 'online';
```

---

## 🌐 API Architecture

### Backend Endpoints (Puerto 3001)

```
📁 Bots Management
GET    /api/bots              → Lista todos los bots + status
GET    /api/bots/:id          → Bot específico
POST   /api/bots              → Crear nuevo bot
PUT    /api/bots/:id          → Actualizar bot existente
DELETE /api/bots/:id          → Eliminar bot

📊 Status & Monitoring  
GET    /api/status/:id        → Status de bot específico
GET    /api/status/whatsapp   → Status de todos los WhatsApp bots
GET    /api/status/discord    → Status de todos los Discord bots

💬 Messaging
POST   /api/bots/:id/send     → Enviar mensaje via bot
```

### Frontend API Helpers

**Ubicación:** `frontend/lib/api.ts`

```typescript
// Backend API endpoints
export const api = {
  getBots: () => `${API_BASE_URL}/api/bots`,
  getBot: (id: string) => `${API_BASE_URL}/api/bots/${id}`,
  createBot: () => `${API_BASE_URL}/api/bots`,
  updateBot: (id: string) => `${API_BASE_URL}/api/bots/${id}`,
  deleteBot: (id: string) => `${API_BASE_URL}/api/bots/${id}`,
  sendMessage: (id: string) => `${API_BASE_URL}/api/bots/${id}/send`,
  getBotStatus: (id: string) => `${API_BASE_URL}/api/status/${id}`,
  getDiscordStatus: () => `${API_BASE_URL}/api/status/discord`,
  getWhatsAppStatus: () => `${API_BASE_URL}/api/status/whatsapp`,
};

// Direct bot communication helpers
export const botApi = {
  getWhatsAppStatus: (bot: Bot) => `${bot.apiHost}:${bot.apiPort}/status`,
  getWhatsAppQR: (bot: Bot) => `${bot.apiHost}:${bot.apiPort}/qr-code`,
  sendWhatsAppMessage: (bot: Bot) => `${bot.apiHost}:${bot.apiPort}/send-message`,
  getDiscordHealth: (bot: Bot) => `${bot.apiHost}:${bot.apiPort}/health`,
  sendDiscordMessage: (bot: Bot) => `${bot.apiHost}:${bot.apiPort}/send-message`,
};
```

---

## 📂 Estructura de Archivos

### Archivos Nuevos/Modificados

```
📁 config/
└── bots.json                    # ← 🆕 Configuración centralizada

📁 backend/src/services/
├── configService.ts             # ← 🆕 Gestión de configuración
├── botService.ts                # ← 🔄 Refactorizado completamente
└── whatsappService.ts           # ← 📝 Actualizado

📁 backend/src/controllers/
├── botsController.ts            # ← 🔄 CRUD completo
└── statusController.ts          # ← 🔄 Status inteligente

📁 frontend/lib/
├── api.ts                       # ← 🆕 Helpers simplificados
└── types.ts                     # ← 🔄 Tipos actualizados

📁 frontend/components/
├── bot-card.tsx                 # ← 🔄 UI mejorada
└── bot-dashboard.tsx            # ← 🔄 Dashboard actualizado

📋 Root files
├── .gitignore                   # ← 🆕 Excluye node_modules
└── MIGRATION_GUIDE.md           # ← 🆕 Esta documentación
```

### Archivos Eliminados

```
❌ frontend/app/api/bots/[botId]/[action]/route.ts  # Proxy innecesario
❌ Configuración hardcodeada en múltiples archivos
```

---

## 🚀 Configuración de Entorno

### Variables de Entorno

**Backend (.env):**
```bash
PORT=3001
FALLBACK_API_HOST=http://localhost
```

**Frontend (.env.local):**
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3001
```

### Puertos Estandarizados

```
🖥️  Backend API:       localhost:3001
🌐 Frontend Web:       localhost:7261
🤖 Bot Services:       20.121.40.254:7260-7262, :8080
```

---

## 📊 Ejemplo de Configuración JSON

### Estructura Completa

```json
{
  "bots": [
    {
      "id": "whatsapp-bot-1",
      "name": "WhatsApp Bot 1", 
      "type": "whatsapp",
      "pm2ServiceId": "wa-bot-1",
      "apiHost": "http://20.121.40.254",
      "apiPort": 7260,
      "phoneNumber": "+1234567890",
      "pushName": "Bot Asistente 1",
      "enabled": true,
      "createdAt": "2025-06-11T00:00:00.000Z",
      "updatedAt": "2025-06-11T00:00:00.000Z"
    },
    {
      "id": "whatsapp-bot-container-amp",
      "name": "Container AMP",
      "type": "whatsapp", 
      "pm2ServiceId": "wabot-7262",
      "apiHost": "http://20.121.40.254",
      "apiPort": 7262,
      "phoneNumber": "18296459554",
      "pushName": "AM", 
      "enabled": true,
      "createdAt": "2025-06-11T14:21:59.712Z",
      "updatedAt": "2025-06-11T17:35:52.771Z"
    },
    {
      "id": "discord-bot-1",
      "name": "Discord Bot 1",
      "type": "discord",
      "pm2ServiceId": "discord-bot-1", 
      "apiHost": "http://20.121.40.254",
      "apiPort": 8080,
      "phoneNumber": null,
      "pushName": null,
      "enabled": true,
      "createdAt": "2025-06-11T00:00:00.000Z",
      "updatedAt": "2025-06-11T00:00:00.000Z"
    }
  ]
}
```

### Tipos TypeScript

```typescript
export interface Bot {
  id: string;
  name: string;
  type: 'whatsapp' | 'discord';
  pm2ServiceId: string;
  apiHost: string;
  apiPort: number;
  phoneNumber: string | null;
  pushName: string | null;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BotStatus {
  id: string;
  name: string;
  status: 'online' | 'offline' | 'error';
  lastChecked: string;
  phoneNumber?: string;
  pushName?: string;
  uptime?: string;
  error?: string;
}

export interface BotConfig {
  bots: Bot[];
}
```

---

## ✅ Ventajas del Nuevo Sistema

### 🚀 Escalabilidad
- **Agregar bot**: Solo editar `config/bots.json` + restart
- **Quitar bot**: Eliminar entrada del JSON o `enabled: false`
- **Modificar bot**: Actualizar configuración sin tocar código

### 🔧 Flexibilidad  
- **Fallback API Host**: Valor por defecto configurable
- **CRUD completo**: Operaciones via API REST
- **Auto-sincronización**: Datos reales reflejados automáticamente
- **Multi-tipo**: Soporte para WhatsApp y Discord bots

### 🛠️ Mantenibilidad
- **Configuración centralizada**: Un solo archivo de configuración
- **Tipos TypeScript**: Validación completa en compile-time  
- **Logging detallado**: Trazabilidad de todas las operaciones
- **Error handling**: Manejo robusto de fallos de conexión

### 🎯 Funcionalidad
- **Status real-time**: Estado actual de cada bot
- **QR Code access**: Acceso directo a códigos QR de WhatsApp
- **Mensajería**: Envío de mensajes via API
- **Dashboard intuitivo**: UI moderna y responsive

---

## 🧪 Testing y Verificación

### Comandos de Verificación

```bash
# 1. Verificar backend
curl http://localhost:3001/api/bots | jq .

# 2. Verificar status específico  
curl http://localhost:3001/api/status/whatsapp-bot-1 | jq .

# 3. Verificar comunicación directa con bot
curl http://20.121.40.254:7262/status | jq .

# 4. Verificar frontend
open http://localhost:7261
```

### Estados Esperados

```json
// ✅ Bot Online
{
  "id": "whatsapp-bot-container-amp",
  "name": "Container AMP", 
  "status": "online",
  "phoneNumber": "18296459554",
  "pushName": "AM",
  "uptime": "9603 seconds"
}

// ⚠️ Bot Offline  
{
  "id": "whatsapp-bot-1",
  "name": "WhatsApp Bot 1",
  "status": "offline", 
  "error": "Connection timeout"
}
```

---

## 🚨 Solución de Problemas

### Problemas Comunes

#### 1. URLs Malformadas
**Antes:** `http://20.121.40.254/:7262/status`
**Después:** `http://20.121.40.254:7262/status`

**Solución:** Quitar trailing slash de `apiHost` en JSON

#### 2. Node Modules en Git
**Problema:** `node_modules/` siendo trackeado
**Solución:** Crear `.gitignore` en root con:
```gitignore
node_modules/
*/node_modules/
**/node_modules/
```

#### 3. Puertos Incorrectos
**Problema:** Conflictos de puertos
**Solución:** Verificar configuración:
- Backend: 3001
- Frontend: 7261  
- Bots: 7260, 7262, 8080

#### 4. Bot No Responde
**Diagnóstico:**
```bash
# Verificar conectividad
curl -v http://20.121.40.254:7262/status

# Verificar logs del bot  
pm2 logs wabot-7262
```

---

## 📈 Próximos Pasos

### Mejoras Futuras
- [ ] **WebSocket real-time**: Updates en tiempo real sin polling
- [ ] **Health monitoring**: Alertas automáticas de bots offline
- [ ] **Multi-tenant**: Soporte para múltiples usuarios/organizaciones
- [ ] **API authentication**: JWT tokens para seguridad
- [ ] **Bot analytics**: Métricas de mensajes enviados/recibidos
- [ ] **Config validation**: Validación de esquema JSON automática

### Optimizaciones Técnicas
- [ ] **Caching**: Redis para status caching
- [ ] **Rate limiting**: Protección contra spam
- [ ] **Database**: Migración de JSON a PostgreSQL/MongoDB
- [ ] **Docker**: Containerización completa del sistema
- [ ] **CI/CD**: Pipeline automatizado de deployment

---

## 👥 Equipo y Contribución

**Migración realizada por:** Bot Manager Development Team  
**Fecha:** Junio 11, 2025  
**Versión:** 2.0.0  

### Para Desarrolladores

```bash
# Setup local development
git clone <repo>
cd bot-manager
npm install
npm run setup

# Start development servers
npm run dev:backend   # Puerto 3001
npm run dev:frontend  # Puerto 7261
```

---

## 📚 Referencias

- [Backend API Documentation](./backend/README.md)
- [Frontend Components Guide](./frontend/README.md) 
- [Bot Configuration Schema](./config/schema.json)
- [Development Setup](./DEVELOPMENT.md)

---

*Este documento refleja el estado actual del sistema después de la migración completada el 11 de junio de 2025.*
